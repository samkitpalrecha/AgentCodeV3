"""
Refactored Agent Graph for AgentCodeV2
Implements intelligent routing based on request complexity.
"""
import asyncio
import logging
from typing import Dict, Any, Literal
from datetime import datetime

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from state import AgentState, StepStatus, NodeType
from planner import plan_next_step, validate_plan
from developer import execute_next_step, answer_simple_inquiry
from triage import assess_request_complexity

logger = logging.getLogger(__name__)

class EnhancedAgentGraph:
    """
    Enhanced agent workflow graph with intelligent routing.
    """
    
    def __init__(self):
        self.graph = None
        self.memory_saver = MemorySaver()
        self.build_graph()
    
    def build_graph(self):
        """Build the enhanced agent workflow graph with routing."""
        
        workflow = StateGraph(AgentState)
        
        # Add nodes for different routes
        workflow.add_node("triage", self.triage_node)
        workflow.add_node("simple_inquiry", self.simple_inquiry_node)
        workflow.add_node("planner", self.planner_node)
        workflow.add_node("developer", self.developer_node)
        workflow.add_node("validator", self.validator_node)
        
        # Set entry point to the new triage node
        workflow.set_entry_point("triage")
        
        # Add conditional edges for routing
        workflow.add_conditional_edges(
            "triage",
            self.decide_route,
            {
                "simple_inquiry": "simple_inquiry",
                "complex_modification": "planner",
                "research_and_implement": "planner", # Planner can handle research
                "code_generation": "planner", # Planner is good for this too
                "simple_modification": "planner",
            }
        )

        # Edges for the complex workflow
        workflow.add_edge("planner", "developer")
        workflow.add_edge("developer", "validator")
        workflow.add_conditional_edges(
            "validator",
            self.decide_next_step,
            {
                "continue": "planner",
                "finish": END
            }
        )
        
        # Simple inquiry route ends after its node
        workflow.add_edge("simple_inquiry", END)

        self.graph = workflow.compile(checkpointer=self.memory_saver)

    async def triage_node(self, state: AgentState) -> AgentState:
        """Assesses the user request and sets the route."""
        state.log_message("Assessing request complexity...", NodeType.TRIAGE)
        assessment = await assess_request_complexity(state)
        state.route = assessment["route"]
        state.complexity = assessment["complexity"]
        state.log_message(f"Route determined: {state.route} (Complexity: {state.complexity})", NodeType.TRIAGE, assessment)
        return state

    def decide_route(self, state: AgentState) -> str:
        """Determines the next node based on the triage assessment."""
        return state.route

    async def simple_inquiry_node(self, state: AgentState) -> AgentState:
        """Handles simple, non-coding questions."""
        state.log_message("Handling as a simple inquiry.", NodeType.SIMPLE_INQUIRY)
        response = await answer_simple_inquiry(state)
        state.final_explanation = response
        state.task_complete = True
        return state

    async def planner_node(self, state: AgentState) -> AgentState:
        """Plans the next step in the complex workflow."""
        state.log_message("Planning next step...", NodeType.PLANNER)
        await plan_next_step(state)
        return state

    async def developer_node(self, state: AgentState) -> AgentState:
        """Executes a step from the plan."""
        state.log_message("Executing development step...", NodeType.DEVELOPER)
        await execute_next_step(state)
        return state

    async def validator_node(self, state: AgentState) -> AgentState:
        """Validates the current state and plan."""
        state.log_message("Validating progress...", NodeType.VALIDATOR)
        # For now, simple validation. This can be expanded.
        if state.get_next_pending_step() is None:
            state.planning_complete = True
        return state

    def decide_next_step(self, state: AgentState) -> Literal["continue", "finish"]:
        """Decides whether to continue planning or finish."""
        if state.task_complete or state.task_failed or state.planning_complete:
            return "finish"
        if state.loop_count >= state.max_loops:
            state.task_failed = True
            state.log_message("Max loops reached. Ending execution.", NodeType.VALIDATOR)
            return "finish"
        return "continue"

    async def execute_workflow(self, instruction: str, code: str, config: Dict = None) -> Dict[str, Any]:
        """Execute the full agent workflow."""
        if config is None:
            config = {}
        
        # Create and initialize state properly
        initial_state = AgentState()
        initial_state.start_task(instruction, code)
        thread = {"configurable": {"thread_id": initial_state.task_id}}
        
        try:
            final_state = initial_state  # Initialize with the initial state
            async for event in self.graph.astream(initial_state, config=thread):
                # Extract the actual state from the event
                for node_name, state_data in event.items():
                    if isinstance(state_data, AgentState):
                        final_state = state_data
                        break
            
            logger.info("Workflow execution completed")
            return final_state.to_dict() if final_state else initial_state.to_dict()
            
        except Exception as e:
            logger.error(f"Workflow execution failed: {e}", exc_info=True)
            error_state = AgentState()
            error_state.start_task(instruction, code)
            error_state.task_failed = True
            error_state.failure_reason = str(e)
            error_state.log_message(f"Critical error: {e}", NodeType.TRIAGE)
            return error_state.to_dict()

# Global agent graph instance
agent_graph = EnhancedAgentGraph()

async def execute_agent_workflow(instruction: str, code: str = "", config: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Execute the agent workflow
    """
    if config is None:
        config = {}
    
    try:
        # Use the agent graph's execute_workflow method
        result = await agent_graph.execute_workflow(instruction, code, config)
        logger.info("Workflow execution completed")
        return result
        
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}", exc_info=True)
        error_state = AgentState()
        error_state.start_task(instruction, code)
        error_state.task_failed = True
        error_state.failure_reason = str(e)
        error_state.log_message(f"Critical error: {e}", NodeType.TRIAGE)
        return error_state.to_dict()