import google.generativeai as genai
import logging
from typing import Dict, Any
import json
import os

from state import AgentState

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TriageAgent:
    """TriageAgent classifies incoming requests to optimize the workflow."""

    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        logger.info("TriageAgent initialized with gemini-2.5-flash")

    async def assess_request(self, state: AgentState) -> Dict[str, Any]:
        """Analyzes the user's instruction and code to decide the execution route."""
        prompt = self._build_triage_prompt(state.user_instruction, state.current_code)
        logger.info("Assessing request complexity...")

        try:
            response = await self.model.generate_content_async(prompt)
            
            responseText = response.text.strip()
            # Clean the response to be valid JSON
            json_str = responseText.replace("```json", "").replace("```", "").strip()
            
            logger.debug(f"Triage LLM raw response: {json_str}")

            assessment = json.loads(json_str)
            route = assessment.get("route", "complex_modification")
            complexity = assessment.get("complexity", 5)

            logger.info(f"Triage assessment: route='{route}', complexity={complexity}")
            return {"route": route, "complexity": complexity}

        except Exception as e:
            logger.error(f"Error during triage assessment: {e}", exc_info=True)
            # Default to a safe, complex route if triage fails
            return {"route": "complex_modification", "complexity": 8}

    def _build_triage_prompt(self, instruction: str, code: str) -> str:
        """Builds the prompt for the triage LLM."""
        
        code_snippet = code[:2000] if code else "No code provided."

        prompt = f"""
        You are a triage agent for an AI-powered code editor. Your task is to analyze the user's request and determine the most appropriate execution path and complexity.

        **User Instruction:**
        {instruction}

        **Code Snippet (for context):**
        ```
        {code_snippet}
        ```

        **Execution Routes:**
        1.  **`simple_inquiry`**: For simple questions, explanations, or requests that don't require code modification.
        2.  **`code_generation`**: For requests to generate new code from a detailed description, without modifying existing files.
        3.  **`simple_modification`**: For requests that involve small changes to the provided code, like fixing a bug, adding a simple feature, or refactoring a small part.
        4.  **`complex_modification`**: For requests that require significant changes, understanding multiple files, or complex logic implementation within the existing codebase.
        5.  **`research_and_implement`**: For requests that require external web searches to find information, libraries, or APIs before implementing the code.

        **Analysis:**
        1.  **Analyze the instruction:** What is the user's primary intent? Is it to ask, generate, or modify?
        2.  **Consider the code:** Is there code? Does the instruction refer to it? How complex does the modification seem?
        3.  **Estimate Complexity:** On a scale of 1-10, how complex is this task? (1=very simple, 10=very complex).

        **Output:**
        Provide your assessment in a JSON object with "route" and "complexity" keys. For example:
        ```json
        {{
          "route": "simple_modification",
          "complexity": 3
        }}
        ```
        """
        return prompt

# Global triage agent instance
triage_agent = TriageAgent()

async def assess_request_complexity(state: AgentState) -> Dict[str, Any]:
    """
    Assess the complexity and determine the route for the user's request.
    """
    return await triage_agent.assess_request(state)