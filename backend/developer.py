import asyncio
import time
import re
import json
from typing import Dict, List, Any, Optional, Tuple
import google.generativeai as genai
import logging
import os
from datetime import datetime

from state import AgentState, StepStatus, NodeType, PlanStep
from tools import (
    search_internal, search_external, scraper, 
    internal_write, analyze_code_with_llm, get_code_history
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AdvancedDeveloper:
    """
    Advanced developer that executes atomic code changes based on a plan.
    """
    
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.max_retries = 3
        logger.info("AdvancedDeveloper initialized with gemini-2.5-flash")

    async def execute_step(self, state: AgentState) -> bool:
        """
        Execute one atomic step from the plan.
        """
        next_step = state.get_next_pending_step()
        if not next_step:
            logger.info("No more pending steps to execute.")
            state.log_message("All plan steps executed.", NodeType.DEVELOPER)
            state.task_complete = True
            return False

        state.log_message(f"Executing step: {next_step.description}", NodeType.DEVELOPER, {"step_id": next_step.id})
        next_step.status = StepStatus.IN_PROGRESS
        
        try:
            action_result = await self._execute_action(state, next_step) # Pass state to execute_action
            
            if action_result.get("success", False):
                next_step.status = StepStatus.COMPLETED
                state.log_message(f"Step '{next_step.description}' completed successfully.", NodeType.DEVELOPER)
                if "result" in action_result:
                    state.update_working_memory(f"step_{next_step.id}_result", action_result["result"])
                
                # Special handling for the 'finish' action
                if next_step.action_type == 'finish':
                    state.task_complete = True
                    # The final explanation and code are now set here
                    state.final_explanation = next_step.parameters.get("final_explanation", "Task completed.")
                    state.final_code = next_step.parameters.get("final_code", state.current_code)

            else:
                next_step.status = StepStatus.FAILED
                error_message = action_result.get("error", "Unknown error")
                state.log_message(f"Step '{next_step.description}' failed: {error_message}", NodeType.DEVELOPER, status=StepStatus.FAILED)
                state.task_failed = True
                state.failure_reason = f"Step failed: {next_step.description}"

            return True # Indicates a step was processed

        except Exception as e:
            logger.error(f"Critical error executing step {next_step.id}: {e}", exc_info=True)
            next_step.status = StepStatus.FAILED
            state.task_failed = True
            state.failure_reason = str(e)
            return False

    async def _execute_action(self, state: AgentState, step: PlanStep) -> Dict[str, Any]:
        """Dynamically executes the action specified in a plan step."""
        action = step.action_type
        params = step.parameters
        logger.info(f"Executing action: {action} with params: {params}")

        try:
            if action == 'search_internal':
                result = await search_internal(**params)
                return {"success": True, "result": [r.__dict__ for r in result]}
            elif action == 'search_external':
                result = await search_external(**params)
                return {"success": True, "result": [r.__dict__ for r in result]}
            elif action == 'internal_write':
                success = await internal_write(**params)
                # After writing, update the current_code in the state
                if success:
                    state.current_code = params.get('content', state.current_code)
                return {"success": success}
            elif action == 'analyze_code':
                result = await analyze_code_with_llm(**params)
                return {"success": True, "result": result}
            elif action == 'finish':
                return {"success": True}
            else:
                logger.warning(f"Unknown action type: {action}")
                return {"success": False, "error": f"Unknown action type: {action}"}
                
        except Exception as e:
            logger.error(f"Error executing action {action}: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

async def answer_simple_inquiry(state: AgentState) -> str:
    """
    Directly answers a simple question using an LLM, bypassing the main loop.
    """
    logger.info(f"Answering simple inquiry for task: {state.task_id}")
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    You are a helpful AI assistant. The user has a question.

    **User's Question:**
    "{state.user_instruction}"

    **Provided Code Snippet (for context, if any):**
    ```
    {state.current_code[:2000] if state.current_code else "No code provided."}
    ```

    Please provide a clear and concise answer to the user's question. If the question is about the code, refer to it in your explanation.
    """
    
    try:
        response = await model.generate_content_async(prompt)
        state.metrics.llm_calls += 1
        answer = response.text.strip()
        state.final_explanation = answer
        state.task_complete = True
        logger.info(f"Simple inquiry answered for task: {state.task_id}")
        return answer
    except Exception as e:
        logger.error(f"Error during simple inquiry: {e}", exc_info=True)
        return "I'm sorry, I encountered an error while trying to answer your question."

# Global developer instance
developer = AdvancedDeveloper()

async def execute_next_step(state: AgentState) -> bool:
    """Entry point for the developer node."""
    return await developer.execute_step(state)