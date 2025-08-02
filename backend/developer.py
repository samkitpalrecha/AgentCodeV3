"""
Enhanced Developer for AgentCodeV2
Implements atomic code operations and simple inquiry handling.
"""
import asyncio
import time
import re
import json
from typing import Dict, List, Any, Optional, Tuple
import google.generativeai as genai
import logging
from datetime import datetime

from state import AgentState, StepStatus, NodeType, PlanStep
from tools import (
    search_internal, search_external, search_and_scrape, 
    internal_write, analyze_code_with_llm, get_code_history
)

logger = logging.getLogger(__name__)

class AdvancedDeveloper:
    """
    Advanced developer that executes atomic code changes with Chain-of-Thought reasoning
    """
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.max_retries = 3
        
    async def execute_atomic_step(self, state: AgentState) -> bool:
        """
        Execute one atomic step from the plan
        """
        start_time = time.time()
        
        try:
            next_step = state.get_next_pending_step()
            if not next_step:
                state.log_message("No more pending steps.", NodeType.DEVELOPER)
                return False
            
            state.log_message(f"Executing step: {next_step.description}", NodeType.DEVELOPER, {"step_id": next_step.id})
            next_step.status = StepStatus.IN_PROGRESS
            next_step.started_at = datetime.now()
            
            # Chain-of-Thought Prompting
            prompt = self._build_execution_prompt(state, next_step)
            
            response_text = ""
            for i in range(self.max_retries):
                try:
                    response = await self.model.generate_content_async(prompt)
                    response_text = response.text.strip()
                    
                    # Basic validation of response
                    if "ACTION:" in response_text and "CODE:" in response_text:
                        break # Looks valid
                    
                except Exception as e:
                    logger.warning(f"LLM call failed (attempt {i+1}): {e}")
                    await asyncio.sleep(2 ** i) # Exponential backoff
            
            if not response_text:
                raise Exception("Failed to get a valid response from LLM after multiple retries.")

            # Parse action and code from response
            action, code_block = self._parse_llm_response(response_text)
            
            # Execute the action
            execution_result = await self._execute_action(action, code_block, state, next_step)
            
            next_step.status = StepStatus.COMPLETED if execution_result["success"] else StepStatus.FAILED
            next_step.completed_at = datetime.now()
            next_step.error_message = execution_result.get("error", "")
            
            state.log_message(f"Step '{next_step.description}' completed with status: {next_step.status.value}", NodeType.DEVELOPER)
            
            # Update state with new code if changed
            if "new_code" in execution_result:
                state.current_code = execution_result["new_code"]
            
            return True

        except Exception as e:
            logger.error(f"Error executing step: {e}", exc_info=True)
            if 'next_step' in locals() and next_step:
                next_step.status = StepStatus.FAILED
                next_step.error_message = str(e)
            state.task_failed = True
            state.log_message(f"Step execution failed: {str(e)}", NodeType.DEVELOPER)
            return False

    def _build_execution_prompt(self, state: AgentState, step: PlanStep) -> str:
        """Builds the prompt for the LLM to execute a step."""
        # This method can be simplified or made more complex based on needs
        code_context = state.current_code[:2000] if state.current_code else "No code provided."
        plan_context = "\n".join([f"- {s.description}" for s in state.plan_steps if s.status == StepStatus.PENDING])

        prompt = f"""
        You are an expert AI programmer. Your task is to execute the following step based on the user's instruction and the current plan.

        **User Instruction:**
        {state.user_instruction}

        **Current Plan (pending steps):**
        {plan_context}

        **Current Step to Execute:**
        {step.description}

        **Code Context (first 2000 chars):**
        ```
        {code_context}
        ```

        **Your Task:**
        1.  **Think:** Analyze the step and the code. Formulate a plan to execute the step.
        2.  **Act:** Choose ONE action and provide the necessary code or parameters.

        **Available Actions:**
        - `WRITE_CODE`: Write new code or completely replace a file's content.
        - `REFACTOR_CODE`: Modify or refactor a block of existing code.
        - `SEARCH_INTERNAL`: Search within the project files.
        - `SEARCH_EXTERNAL`: Search the web for information.
        - `ANALYZE_CODE`: Provide analysis or answer a question about the code.
        - `NO_ACTION`: If the step is complete or no action is needed.

        **Response Format (Strict):**

        THOUGHT:
        <Your detailed reasoning and plan for executing this step.>

        ACTION: <Chosen Action>

        CODE:
        ```<language or query>
        <The code to write, code to search for, or your analysis text.>
        ```
        """
        return prompt
        
    def _parse_llm_response(self, response: str) -> Tuple[str, str]:
        """Parses the action and code from the LLM's response."""
        action_match = re.search(r"ACTION:\s*(\w+)", response)
        action = action_match.group(1) if action_match else "NO_ACTION"
        
        code_match = re.search(r"CODE:\n```[a-zA-Z]*\n(.*?)\n```", response, re.DOTALL)
        code = code_match.group(1).strip() if code_match else ""
        
        return action, code

    async def _execute_action(self, action: str, code_block: str, state: AgentState, step: PlanStep) -> Dict[str, Any]:
        """Executes the parsed action."""
        try:
            if action == "WRITE_CODE":
                # Assuming single file context for now
                file_path = step.target_files[0] if step.target_files else "new_file.py"
                success = await internal_write(file_path, code_block, change_description=step.description)
                if success:
                    state.metrics.files_modified += 1
                    step.tools_used.append("internal_write")
                    return {"success": True, "new_code": code_block}
                else:
                    return {"success": False, "error": "Failed to write file"}
            
            elif action == "REFACTOR_CODE":
                # This is a simplified refactor. A real implementation would be more robust.
                # For now, it just replaces the whole code.
                file_path = step.target_files[0] if step.target_files else "main.py"
                success = await internal_write(file_path, code_block, change_description=f"Refactor: {step.description}")
                if success:
                    state.metrics.files_modified += 1
                    step.tools_used.append("internal_write")
                    return {"success": True, "new_code": code_block}
                else:
                    return {"success": False, "error": "Failed to refactor code"}

            elif action == "SEARCH_INTERNAL":
                results = await search_internal(code_block)
                state.update_working_memory(f"search_results_{step.id}", results)
                step.tools_used.append("search_internal")
                return {"success": True}
                
            elif action == "SEARCH_EXTERNAL":
                results = await search_external(code_block)
                state.update_working_memory(f"search_results_{step.id}", results)
                step.tools_used.append("search_external")
                return {"success": True}
                
            elif action == "ANALYZE_CODE":
                state.feedback_messages.append(code_block)
                return {"success": True}

            elif action == "NO_ACTION":
                return {"success": True}

            return {"success": True} # Default success for now
            
        except Exception as e:
            logger.error(f"Error executing action {action}: {e}")
            return {"success": False, "error": str(e)}

# --- New function for simple inquiries ---
async def answer_simple_inquiry(state: AgentState) -> str:
    """
    Directly answers a simple question using an LLM.
    Bypasses the main planner/developer loop.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    You are a helpful AI assistant. The user has a question.

    **User's Question:**
    "{state.user_instruction}"

    **Provided Code Snippet (for context, if any):**
    ```
    {state.current_code[:1000] if state.current_code else "No code provided."}
    ```

    Please provide a clear and concise answer to the user's question. If the question is about the code, refer to it in your explanation.
    """
    
    try:
        response = await model.generate_content_async(prompt)
        state.metrics.llm_calls += 1
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error during simple inquiry: {e}")
        return "I'm sorry, I encountered an error while trying to answer your question."


# Global developer instance
developer = AdvancedDeveloper()

async def execute_next_step(state: AgentState) -> bool:
    """Execute the next atomic step from the plan"""
    return await developer.execute_atomic_step(state)