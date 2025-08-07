import asyncio
import time
from typing import Dict, List, Any, Optional
import google.generativeai as genai
import logging
import json
import os

from state import AgentState, StepStatus, NodeType, PlanStep
from tools import search_internal, search_external, analyze_code_with_llm

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AdvancedPlanner:
    """
    Advanced planner that creates atomic, executable steps with Chain-of-Thought reasoning.
    """
    
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.max_planning_loops = 5
        logger.info("AdvancedPlanner initialized with gemini-2.5-flash")

    async def plan(self, state: AgentState) -> bool:
        """
        Generates a complete, atomic plan for the given request.
        """
        logger.info("Starting planning process...")
        state.log_message("Starting planning process.", NodeType.PLANNER)

        # Step 1: Gather context through search if necessary
        search_results = await self._gather_context(state)
        state.update_working_memory("initial_search_results", [res.__dict__ for res in search_results])

        # Step 2: Generate the full plan
        plan_generated = await self._generate_full_plan(state, search_results)
        if not plan_generated:
            state.log_message("Failed to generate a plan.", NodeType.PLANNER, status=StepStatus.FAILED)
            state.task_failed = True
            state.failure_reason = "Planner failed to generate a plan."
            return False

        state.planning_complete = True
        state.log_message(f"Planning complete. Generated {len(state.plan_steps)} steps.", NodeType.PLANNER)
        logger.info(f"Planning complete for task {state.task_id}")
        return True

    async def _gather_context(self, state: AgentState) -> List[Any]:
        """Gathers context from internal and external sources."""
        logger.info("Gathering context...")
        query = f"How to solve this: {state.user_instruction}"
        
        internal_search_task = search_internal(query)
        external_search_task = search_external(query)
        
        results = await asyncio.gather(internal_search_task, external_search_task)
        
        all_results = results[0] + results[1]
        logger.info(f"Gathered {len(all_results)} search results.")
        return all_results

    async def _generate_full_plan(self, state: AgentState, search_results: List[Any]) -> bool:
        """Generates a complete, step-by-step plan."""
        logger.info("Generating full execution plan...")
        
        context_str = "\n".join([f"Title: {res.title}\nContent: {res.content[:300]}...\n" for res in search_results])
        code_snippet = state.current_code[:2000] if state.current_code else "No code provided."

        # CORRECTED: Build the prompt using an f-string directly, which is safer
        # than .format() when the string contains many curly braces.
        prompt = f"""
        You are an expert AI planner. Your task is to create a detailed, step-by-step plan to address the user's request.
        The final step of your plan MUST be a `finish` action.

        **User Instruction:**
        {state.user_instruction}

        **Current Code (if any):**
        ```python
        {code_snippet}
        ```

        **Available Actions:**
        - `analyze_code(code, instruction)`: Analyze a piece of code.
        - `finish(final_explanation, final_code)`: Mark the task as complete. This MUST be the last step.

        **CRITICAL INSTRUCTIONS:**
        1.  Your output MUST be a valid JSON array of objects.
        2.  The final object in the array MUST be an action of type `finish`.
        3.  The `finish` action's parameters MUST contain a `final_explanation` key with a detailed explanation of the fix.
        4.  The `finish` action's parameters MUST also contain a `final_code` key with the complete, corrected code.

        **Example of a perfect response:**
        ```json
        [
            {{
                "description": "Analyze the Python code to find the syntax error.",
                "action_type": "analyze_code",
                "parameters": {{"code": "priint(\\"adfd\\")", "instruction": "Identify the typo in the function name."}}
            }},
            {{
                "description": "Provide the final explanation and the corrected code.",
                "action_type": "finish",
                "parameters": {{
                    "final_explanation": "The code failed because `priint` is a typo. The correct function is `print`. I have corrected this in the final code.",
                    "final_code": "print(\\"adfd\\")"
                }}
            }}
        ]
        ```

        Now, generate the complete and valid JSON plan for the user's request.
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            responseText = response.text.strip().replace("```json", "").replace("```", "").strip()
            
            logger.debug(f"Plan generation raw response: {responseText}")

            plan_json = json.loads(responseText)
            
            for i, step_data in enumerate(plan_json):
                step = PlanStep(
                    description=step_data['description'],
                    action_type=step_data['action_type'],
                    parameters=step_data.get('parameters', {}),
                    reasoning=f"Step {i+1} of the generated plan."
                )
                state.add_plan_step(step)

            return True
        except Exception as e:
            logger.error(f"Error generating plan: {e}", exc_info=True)
            return False

# Global planner instance
planner = AdvancedPlanner()

async def plan_task(state: AgentState) -> bool:
    """Entry point for the planning node."""
    return await planner.plan(state)