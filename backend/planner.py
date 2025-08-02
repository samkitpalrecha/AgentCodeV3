"""
Enhanced Planner for AgentCodeV2
Implements Chain-of-Thought reasoning and atomic step planning
"""
import asyncio
import time
from typing import Dict, List, Any, Optional
import google.generativeai as genai
import logging
from datetime import datetime

from state import AgentState, StepStatus, NodeType
from tools import search_internal, search_external, search_and_scrape, analyze_code_with_llm

logger = logging.getLogger(__name__)

class AdvancedPlanner:
    """
    Advanced planner that creates atomic, executable steps with Chain-of-Thought reasoning
    """
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.max_planning_loops = 10
        
    async def plan_atomic_step(self, state: AgentState) -> bool:
        """
        Plan one atomic step at a time using Chain-of-Thought reasoning
        
        Args:
            state: Current agent state
            
        Returns:
            True if a step was planned, False if planning is complete
        """
        start_time = time.time()
        
        try:
            # Check if we need more steps
            if not self._needs_more_steps(state):
                state.planning_complete = True
                return False
            
            # Step 1: Search for relevant information
            search_results = await self._gather_context(state)
            
            # Step 2: Analyze current situation with Chain-of-Thought
            reasoning = await self._chain_of_thought_analysis(state, search_results)
            
            # Step 3: Generate next atomic step
            next_step = await self._generate_next_step(state, reasoning, search_results)
            
            if next_step:
                # Add the step to the plan
                step_id = state.add_plan_step(
                    description=next_step["description"],
                    action_type=next_step["action_type"],
                    reasoning=reasoning,
                    target_files=next_step.get("target_files", []),
                    dependencies=next_step.get("dependencies", [])
                )
                
                # Record execution with proper method signature
                execution_time = time.time() - start_time
                state.record_node_execution(
                    node_type=NodeType.PLANNER,
                    step_id=step_id,
                    input_data={"instruction": state.user_instruction, "current_code": state.current_code},
                    output_data=next_step,
                    reasoning=reasoning,
                    tools_used=["search_internal", "search_external", "llm_analysis"],
                    execution_time=execution_time,
                    status=StepStatus.COMPLETED
                )
                
                state.log_message(f"Planned atomic step: {next_step['description']}", NodeType.PLANNER)
                return True
            
            else:
                state.planning_complete = True
                return False
                
        except Exception as e:
            logger.error(f"Error in atomic planning: {e}")
            state.record_node_execution(
                node_type=NodeType.PLANNER,
                reasoning=f"Planning failed: {e}",
                status=StepStatus.FAILED,
                error_message=str(e)
            )
            state.log_message(f"Planning failed: {str(e)}", NodeType.PLANNER)
            return False

    def _needs_more_steps(self, state: AgentState) -> bool:
        """Determine if more planning steps are needed"""
        if len(state.plan_steps) >= 20:  # Maximum steps limit
            return False
        
        # Check if we have a complete plan
        if len(state.plan_steps) == 0:
            return True
        
        # Check if the last few steps indicate completion
        recent_steps = state.plan_steps[-3:] if len(state.plan_steps) >= 3 else state.plan_steps
        completion_indicators = ["finalize", "complete", "finish", "done", "test"]
        
        for step in recent_steps:
            if any(indicator in step.description.lower() for indicator in completion_indicators):
                return False
        
        return True

    async def _gather_context(self, state: AgentState) -> List[Dict[str, Any]]:
        """Gather relevant context through internal and external search"""
        context_results = []
        
        try:
            # Search internal codebase
            internal_query = f"{state.user_instruction} {' '.join(state.get_from_working_memory('keywords', []))}"
            internal_results = await search_internal(internal_query)
            
            # Convert SearchResult objects to dicts
            for result in internal_results:
                context_results.append({
                    "title": result.title,
                    "content": result.content,
                    "source_type": result.source_type,
                    "relevance_score": result.relevance_score
                })
            
            # Search external resources if needed
            if len(internal_results) < 3:
                external_query = f"python {state.user_instruction}"
                external_results = await search_external(external_query, max_results=3)
                
                for result in external_results:
                    context_results.append({
                        "title": result.title,
                        "content": result.content,
                        "source_type": result.source_type,
                        "url": getattr(result, 'url', ''),
                        "relevance_score": result.relevance_score
                    })
            
            # Cache results
            state.cache_search_results(internal_query, context_results)
            
        except Exception as e:
            logger.error(f"Error gathering context: {e}")
        
        return context_results

    async def _chain_of_thought_analysis(self, state: AgentState, search_results: List[Dict[str, Any]]) -> str:
        """Perform Chain-of-Thought analysis to determine next step"""
        
        # Build context from search results
        context_summary = self._summarize_search_results(search_results)
        
        # Get existing plan summary
        existing_steps = [f"- {step.description} ({step.status.value})" for step in state.plan_steps]
        plan_summary = "\n".join(existing_steps) if existing_steps else "No steps planned yet."
        
        prompt = f"""
You are an expert software development planner. Your task is to think step-by-step and plan the NEXT ATOMIC STEP for implementing the user's instruction.

**Current Context:**
User Instruction: {state.user_instruction}

Current Code:
```python
{state.current_code[:1000]}{'...' if len(state.current_code) > 1000 else ''}
```

Existing Plan Steps:
{plan_summary}

Search Results Context:
{context_summary}

**Chain of Thought - Think Through This Step by Step:**

1. **ANALYSIS**: What is the current state of the code and what needs to be done?
   - What has already been planned/completed?
   - What is the most logical next atomic step?
   - What specific action should be taken?

2. **REASONING**: Why is this the right next step?
   - How does it contribute to the overall goal?
   - What dependencies or prerequisites exist?
   - What tools/searches might be needed?

3. **ATOMICITY CHECK**: Is this step small and focused enough?
   - Can it be completed in one developer action?
   - Does it have a clear, measurable outcome?
   - Is it independent or properly dependent on previous steps?

4. **RISK ASSESSMENT**: What could go wrong?
   - What information might be missing?
   - What searches should be done first?
   - Are there any edge cases to consider?

**Your Reasoning (be thorough and explicit):**
"""

        try:
            response = await self.model.generate_content_async(prompt)
            reasoning = response.text
            
            # Store reasoning in working memory
            state.update_working_memory("last_reasoning", reasoning)
            
            return reasoning
            
        except Exception as e:
            logger.error(f"Error in CoT analysis: {e}")
            return f"Analysis failed: {e}"

    async def _generate_next_step(self, state: AgentState, reasoning: str, search_results: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Generate the next atomic step based on reasoning"""
        
        context_summary = self._summarize_search_results(search_results)
        existing_steps = [f"- {step.description}" for step in state.plan_steps]
        plan_summary = "\n".join(existing_steps) if existing_steps else "No steps planned yet."
        
        prompt = f"""
Based on the following analysis, generate the NEXT ATOMIC STEP as a JSON object.

Previous Reasoning:
{reasoning}

Current Context:
- User Instruction: {state.user_instruction}
- Existing Steps: {plan_summary}
- Available Context: {context_summary}

Generate a JSON object with this exact structure:
{{
    "description": "Clear, specific description of what this step will do",
    "action_type": "one of: search, analyze, write, refactor, test, validate, research",
    "target_files": ["list of files this step will affect"],
    "dependencies": ["list of step IDs this depends on (empty if none)"],
    "tools_needed": ["list of tools: search_internal, search_external, scraper, internal_write"],
    "success_criteria": "How to know this step is complete",
    "estimated_complexity": "low/medium/high"
}}

Make sure the step is:
1. ATOMIC - can be completed in one action
2. SPECIFIC - clear what needs to be done
3. ACTIONABLE - the developer node can execute it
4. MEASURABLE - clear success criteria

JSON:
"""

        try:
            response = await self.model.generate_content_async(prompt)
            response_text = response.text.strip()
            
            # Extract JSON from response
            import json
            import re
            
            # Find JSON in response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                step_data = json.loads(json_str)
                
                # Validate required fields
                required_fields = ["description", "action_type"]
                if all(field in step_data for field in required_fields):
                    return step_data
                else:
                    logger.error("Generated step missing required fields")
                    return None
            else:
                logger.error("No valid JSON found in step generation response")
                return None
                
        except Exception as e:
            logger.error(f"Error generating next step: {e}")
            return None

    def _summarize_search_results(self, search_results: List[Dict[str, Any]]) -> str:
        """Summarize search results for context"""
        if not search_results:
            return "No relevant search results found."
        
        summary = "Relevant Information Found:\n"
        for i, result in enumerate(search_results[:5], 1):
            summary += f"{i}. {result['title']} ({result['source_type']})\n"
            summary += f"   {result['content'][:200]}...\n\n"
        
        return summary

    async def validate_plan_completeness(self, state: AgentState) -> bool:
        """Validate if the current plan is complete and logical"""
        
        if len(state.plan_steps) == 0:
            return False
        
        prompt = f"""
Analyze this execution plan for completeness and logical flow:

User Instruction: {state.user_instruction}

Current Plan:
{chr(10).join([f"{i+1}. {step.description} ({step.action_type})" for i, step in enumerate(state.plan_steps)])}

Evaluation Criteria:
1. Does the plan address the user instruction completely?
2. Are the steps in logical order?
3. Are there any missing steps?
4. Is each step atomic and actionable?

Respond with:
- COMPLETE: if the plan is ready for execution
- INCOMPLETE: if more steps are needed
- NEEDS_REVISION: if existing steps need modification

Then explain your reasoning.

Assessment:
"""

        try:
            response = await self.model.generate_content_async(prompt)
            assessment = response.text.strip()
            
            state.update_working_memory("plan_assessment", assessment)
            
            return "COMPLETE" in assessment.upper()
            
        except Exception as e:
            logger.error(f"Error validating plan: {e}")
            return False

# Global planner instance
planner = AdvancedPlanner()

async def plan_next_step(state: AgentState) -> bool:
    """Plan the next atomic step"""
    return await planner.plan_atomic_step(state)

async def validate_plan(state: AgentState) -> bool:
    """Validate plan completeness"""
    return await planner.validate_plan_completeness(state)