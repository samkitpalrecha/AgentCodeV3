import asyncio
import logging
from typing import Dict, Any, Literal

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from state import AgentState, NodeType
from planner import plan_task
from developer import execute_next_step, answer_simple_inquiry
from triage import assess_request_complexity

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AgentGraph:
    """
    The main agent workflow graph.
    """
    
    def __init__(self):
        self.memory = MemorySaver()
        self.graph = self._build_graph()
        self.current_stream_queue = None  # Store reference to current queue
        logger.info("AgentGraph initialized.")

    def _build_graph(self) -> StateGraph:
        """Builds the agent workflow graph."""
        workflow = StateGraph(AgentState)

        # Nodes
        workflow.add_node("triage", self.triage_node)
        workflow.add_node("simple_inquiry", self.simple_inquiry_node)
        workflow.add_node("planner", self.planner_node)
        workflow.add_node("developer", self.developer_node)

        # Edges
        workflow.set_entry_point("triage")
        workflow.add_conditional_edges(
            "triage",
            self.route_after_triage,
            {
                "simple_inquiry": "simple_inquiry",
                "planner": "planner"
            }
        )
        workflow.add_edge("planner", "developer")
        workflow.add_conditional_edges(
            "developer",
            self.decide_after_developer,
            {
                "continue": "developer",
                "end": END
            }
        )
        workflow.add_edge("simple_inquiry", END)
        
        return workflow.compile(checkpointer=self.memory)

    async def _stream_state_update(self, state: AgentState):
        """Helper to stream state updates if queue is available"""
        if self.current_stream_queue:
            try:
                await self.current_stream_queue.put(state.to_dict())
            except Exception as e:
                logger.error(f"Error streaming state update: {e}")

    async def triage_node(self, state: AgentState) -> AgentState:
        """Triage the request to determine the route."""
        state.log_message("Triage started.", NodeType.TRIAGE)
        await self._stream_state_update(state)
        
        assessment = await assess_request_complexity(state)
        state.working_memory['triage_assessment'] = assessment
        state.log_message(f"Triage complete: route={assessment['route']}", NodeType.TRIAGE)
        
        await self._stream_state_update(state)
        return state

    def route_after_triage(self, state: AgentState) -> Literal["simple_inquiry", "planner"]:
        """Route based on triage assessment."""
        route = state.working_memory.get('triage_assessment', {}).get('route', 'planner')
        logger.info(f"Routing after triage: {route}")
        if route == 'simple_inquiry':
            return "simple_inquiry"
        else:
            # All other routes (simple_modification, complex_modification, etc.) go to the planner.
            return "planner"

    async def simple_inquiry_node(self, state: AgentState) -> AgentState:
        """Handle simple inquiries directly."""
        state.log_message("Handling simple inquiry.", NodeType.SIMPLE_INQUIRY)
        await self._stream_state_update(state)
        
        await answer_simple_inquiry(state)
        state.log_message("Simple inquiry answered.", NodeType.SIMPLE_INQUIRY)
        
        await self._stream_state_update(state)
        return state

    async def planner_node(self, state: AgentState) -> AgentState:
        """Generate a plan to address the request."""
        state.log_message("Planning started.", NodeType.PLANNER)
        await self._stream_state_update(state)
        
        await plan_task(state)
        state.log_message("Planning completed.", NodeType.PLANNER)
        
        await self._stream_state_update(state)
        return state

    async def developer_node(self, state: AgentState) -> AgentState:
        """Execute the next step in the plan."""
        await self._stream_state_update(state)
        
        await execute_next_step(state)
        
        await self._stream_state_update(state)
        return state

    def decide_after_developer(self, state: AgentState) -> Literal["continue", "end"]:
        """Decide whether to continue development or end."""
        if state.task_complete or state.task_failed:
            logger.info("Developer task finished or failed. Ending execution.")
            return "end"
        else:
            logger.info("Developer task not yet complete. Continuing execution.")
            return "continue"

    async def execute_workflow(self, instruction: str, code: str, stream_queue: asyncio.Queue) -> Dict[str, Any]:
        """Executes the agent workflow and streams state updates."""
        initial_state = AgentState()
        initial_state.start_task(instruction, code)
        
        # Store queue reference for streaming
        self.current_stream_queue = stream_queue
        
        config = {"configurable": {"thread_id": initial_state.task_id}}
        
        try:
            # Send initial state
            await stream_queue.put(initial_state.to_dict())
            
            final_state_result = None
            
            # Process the graph with streaming
            async for event in self.graph.astream(initial_state, config=config):
                logger.info(f"Graph event: {list(event.keys())}")
                
                # Extract the state from the event
                node_name = next(iter(event))
                if node_name != END:
                    current_state = event[node_name]
                    if isinstance(current_state, AgentState):
                        # Stream the current state
                        await stream_queue.put(current_state.to_dict())
                        logger.info(f"Streamed state after node: {node_name}")
                
                if END in event:
                    final_state_result = event[END]
                    logger.info("Workflow reached END state")

            # Send final state
            if final_state_result and isinstance(final_state_result, AgentState):
                await stream_queue.put(final_state_result.to_dict())
                logger.info("Sent final state to stream")
                return final_state_result.to_dict()
            else:
                # Fallback to initial state if no final result
                await stream_queue.put(initial_state.to_dict())
                return initial_state.to_dict()

        except Exception as e:
            logger.error(f"Workflow execution failed for task {initial_state.task_id}: {e}", exc_info=True)
            error_state = AgentState()
            error_state.start_task(instruction, code)
            error_state.task_failed = True
            error_state.failure_reason = str(e)
            error_state.log_message(f"Critical error: {e}", NodeType.TRIAGE)
            
            # Stream the final error state
            await stream_queue.put(error_state.to_dict())
            
            return error_state.to_dict()
        finally:
            # Clean up queue reference
            self.current_stream_queue = None

# Global agent graph instance
agent_graph = AgentGraph()

async def execute_agent_workflow(instruction: str, code: str, stream_queue: asyncio.Queue) -> Dict[str, Any]:
    """Entry point to execute the agent workflow."""
    return await agent_graph.execute_workflow(instruction, code, stream_queue)