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
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
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

        prompt = f"""
        You are an expert AI planner. Your task is to create a detailed, step-by-step plan to address the user's request.
        The plan should consist of a series of atomic, executable actions.

        **User Instruction:**
        {state.user_instruction}

        **Current Code (if any):**
        ```
        {state.current_code[:2000] if state.current_code else "No code provided."}
        ```

        **Relevant Information from Searches:**
        {context_str if context_str else "No search results."}

        **Available Actions:**
        - `search_internal(query)`: Search within the project files.
        - `search_external(query)`: Search the web.
        - `internal_write(file_path, content, change_description)`: Write or overwrite a file.
        - `analyze_code(code, instruction)`: Analyze a piece of code.
        - `finish(final_explanation)`: Mark the task as complete.

        **Instructions:**
        - Break down the request into small, manageable steps.
        - For each step, provide a clear description and the exact action to take.
        - Think step-by-step and explain your reasoning for each step.
        - Output the plan as a valid JSON array of objects. Each object should have 'description', 'action_type', and 'parameters' keys.

        **Example JSON Output:**
        ```json
        [
            {{
                "description": "Search for how to implement a bubble sort in Python.",
                "action_type": "search_external",
                "parameters": {{"query": "python bubble sort implementation"}}
            }},
            {{
                "description": "Write the bubble sort implementation to 'sorter.py'.",
                "action_type": "internal_write",
                "parameters": {{"file_path": "sorter.py", "content": "def bubble_sort(arr):\\n  # ... implementation ...", "change_description": "Initial implementation of bubble sort."}}
            }},
            {{
                "description": "Explain the implementation and finish the task.",
                "action_type": "finish",
                "parameters": {{"final_explanation": "I have implemented the bubble sort algorithm in sorter.py."}}
            }}
        ]
        ```

        Now, generate the plan for the user's request.
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