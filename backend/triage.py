"""
Triage Agent for AgentCodeV2
This agent analyzes the user's request to determine the complexity and the best execution path.
"""
import google.generativeai as genai
import logging
from typing import Dict, Any

from state import AgentState

logger = logging.getLogger(__name__)

class TriageAgent:
    """
    TriageAgent classifies incoming requests to optimize the workflow.
    """

    def __init__(self):
        # Using a fast and powerful model for this classification task
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    async def assess_request(self, state: AgentState) -> Dict[str, Any]:
        """
        Analyzes the user's instruction and code to decide the execution route.

        Args:
            state: The current agent state, containing user instruction and code.

        Returns:
            A dictionary with the determined 'route' and 'complexity'.
        """
        prompt = self._build_triage_prompt(state.user_instruction, state.current_code)

        try:
            response = await self.model.generate_content_async(prompt)
            
            # Basic parsing, can be improved with structured output from the model
            responseText = response.text.strip()
            route = "complex_modification" # default
            complexity = 5 # default
            
            if "ROUTE:" in responseText:
                route = responseText.split("ROUTE:")[1].split("\n")[0].strip()
            if "COMPLEXITY:" in responseText:
                complexity = int(responseText.split("COMPLEXITY:")[1].strip())

            logger.info(f"Triage assessment: route='{route}', complexity={complexity}")

            return {
                "route": route,
                "complexity": complexity
            }

        except Exception as e:
            logger.error(f"Error during triage assessment: {e}")
            # Default to the most comprehensive route in case of an error
            return {
                "route": "complex_modification",
                "complexity": 8 # Higher complexity due to uncertainty
            }

    def _build_triage_prompt(self, instruction: str, code: str) -> str:
        """
        Builds the prompt for the LLM to classify the request.
        """
        code_snippet = code[:500].strip() if code else "No code provided."

        prompt = f"""
        You are a triage agent for a sophisticated AI code editor. Your task is to analyze the user's instruction and determine the most efficient execution path.

        **User Instruction:**
        "{instruction}"

        **Provided Code Snippet (first 500 chars):**
        ```
        {code_snippet}
        ```

        **Execution Routes:**
        1.  **`simple_inquiry`**: For simple questions, explanations, or requests for small, self-contained code snippets that don't require file context.
        2.  **`code_generation`**: For requests to generate new files or larger pieces of code from a detailed description, without modifying existing files.
        3.  **`simple_modification`**: For requests that involve small changes to the provided code, like fixing a bug, adding a simple feature, or refactoring a small part.
        4.  **`complex_modification`**: For requests that require significant changes, understanding multiple files, or complex logic implementation within the existing codebase. This is the most resource-intensive route.
        5.  **`research_and_implement`**: For requests that require external web searches to find information, libraries, or APIs before implementing the code.

        **Analysis:**
        1.  **Analyze the instruction:** What is the user's primary intent? Is it to ask, generate, or modify?
        2.  **Consider the code:** Is there code? Does the instruction refer to it? How complex does the modification seem?
        3.  **Estimate Complexity:** On a scale of 1-10, how complex is this task? (1=very simple, 10=very complex).

        **Output:**
        Provide your assessment in the following format, and nothing else:

        ROUTE: <chosen_route>
        COMPLEXITY: <estimated_complexity>
        """
        return prompt

# Global triage agent instance
triage_agent = TriageAgent()

async def assess_request_complexity(state: AgentState) -> Dict[str, Any]:
    """
    Assess the complexity and determine the route for the user's request.
    """
    return await triage_agent.assess_request(state)
