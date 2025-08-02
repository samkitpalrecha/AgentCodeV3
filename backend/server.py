"""
Enhanced FastAPI Server for AgentCodeV2
Supports streaming, real-time progress, and advanced agent operations
"""
import asyncio
import json
import logging
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime
import uuid

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

from agent_graph import execute_agent_workflow, agent_graph
from state import AgentState

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class AgentRequest(BaseModel):
    instruction: str
    code: str = ""
    stream: bool = False
    config: Optional[Dict[str, Any]] = None

class AgentResponse(BaseModel):
    task_id: str
    success: bool
    final_code: str = ""
    execution_log: list = []
    feedback_messages: list = []
    progress_summary: Optional[Dict[str, Any]] = None
    error_message: str = ""
    execution_time: float = 0.0

class ProgressUpdate(BaseModel):
    task_id: str
    status: str
    progress_percentage: float
    current_step: Optional[str] = None
    logs: list = []
    timestamp: str

# FastAPI app
app = FastAPI(
    title="AgentCodeV2 API",
    description="Advanced AI-powered code development agent",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active tasks
active_tasks: Dict[str, AgentState] = {}

def extract_agent_state_from_event(event: Dict[str, Any]) -> Optional[AgentState]:
    """Extract AgentState from graph event"""
    # The event structure from LangGraph is typically: {"node_name": state}
    for node_name, state_data in event.items():
        if isinstance(state_data, AgentState):
            return state_data
        elif isinstance(state_data, dict) and node_name in ["triage", "planner", "developer", "validator", "simple_inquiry"]:
            # If it's a dict, log and return None - we'll handle this gracefully
            logger.debug(f"Received dict instead of AgentState from node: {node_name}")
            return None
    return None

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AgentCodeV2 API v2.0",
        "status": "running",
        "features": [
            "Atomic step execution",
            "Chain-of-thought reasoning",
            "Advanced tool integration",
            "Real-time streaming",
            "Progress tracking"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_tasks": len(active_tasks)
    }

@app.post("/agent", response_model=AgentResponse)
async def execute_agent(request: AgentRequest, background_tasks: BackgroundTasks):
    """
    Execute agent workflow (non-streaming)
    
    Args:
        request: Agent request containing instruction and code
        background_tasks: FastAPI background tasks
        
    Returns:
        Agent response with results
    """
    task_id = str(uuid.uuid4())
    start_time = datetime.now()
    
    logger.info(f"Agent request received: {task_id}")
    
    try:
        # Execute workflow
        result = await execute_agent_workflow(
            instruction=request.instruction,
            code=request.code,
            config=request.config
        )
        
        # Handle the result properly
        if isinstance(result, dict):
            # Extract AgentState information from the dict
            success = result.get("task_complete", False)
            error_message = result.get("failure_reason", "") if result.get("task_failed", False) else ""
            
            # Create a minimal progress summary if not available
            progress_summary = result.get("progress", {
                "progress": {"percentage": 100 if success else 0, "completed": 0, "total": 0}
            })
            
            response = AgentResponse(
                task_id=task_id,
                success=success,
                final_code=result.get("final_code", "") or result.get("current_code", ""),
                execution_log=result.get("execution_log", []),
                feedback_messages=result.get("feedback_messages", []),
                progress_summary=progress_summary,
                error_message=error_message,
                execution_time=(datetime.now() - start_time).total_seconds()
            )
        else:
            # Handle error case
            response = AgentResponse(
                task_id=task_id,
                success=False,
                error_message="Invalid response format from agent",
                execution_time=(datetime.now() - start_time).total_seconds()
            )
        
        # Schedule cleanup
        background_tasks.add_task(cleanup_task, task_id, delay=3600)  # 1 hour
        
        return response
            
    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Agent execution failed: {str(e)}"
        )

@app.post("/agent/stream")
async def stream_agent_execution(request: AgentRequest):
    """
    Execute agent workflow with real-time streaming
    """
    task_id = str(uuid.uuid4())
    logger.info(f"Streaming agent request received: {task_id}")
    
    async def generate_stream():
        """Generate streaming updates"""
        try:
            # Initial response
            yield f"data: {json.dumps({
                'task_id': task_id,
                'status': 'started',
                'message': 'Agent workflow initiated',
                'timestamp': datetime.now().isoformat()
            })}\n\n"
            
            # Create and initialize agent state
            agent_state = AgentState()
            agent_state.start_task(request.instruction, request.code)
            active_tasks[task_id] = agent_state
            
            # Execute workflow with streaming updates
            last_progress = 0
            current_state = agent_state
            
            async for event in agent_graph.graph.astream(
                agent_state,
                config={"configurable": {"thread_id": task_id}}
            ):
                # Extract state from event
                extracted_state = extract_agent_state_from_event(event)
                if extracted_state:
                    current_state = extracted_state
                    active_tasks[task_id] = current_state
                
                # Calculate progress
                try:
                    if hasattr(current_state, 'get_progress_summary'):
                        progress_summary = current_state.get_progress_summary()
                        current_progress = progress_summary["progress"]["percentage"]
                    else:
                        # Fallback progress calculation
                        current_progress = min(last_progress + 10, 90)  # Increment by 10, max 90
                        progress_summary = {
                            "progress": {"percentage": current_progress, "completed": 0, "total": 1},
                            "current_step": "Processing..."
                        }
                except Exception as e:
                    logger.warning(f"Error calculating progress: {e}")
                    current_progress = min(last_progress + 5, 90)
                    progress_summary = {
                        "progress": {"percentage": current_progress, "completed": 0, "total": 1},
                        "current_step": "Processing..."
                    }
                
                # Send update if progress changed significantly
                if current_progress - last_progress >= 5:  # 5% threshold
                    try:
                        logs = current_state.execution_log[-3:] if hasattr(current_state, 'execution_log') else []
                    except:
                        logs = []
                    
                    update = ProgressUpdate(
                        task_id=task_id,
                        status="processing",
                        progress_percentage=current_progress,
                        current_step=progress_summary.get("current_step", "Processing..."),
                        logs=logs,
                        timestamp=datetime.now().isoformat()
                    )
                    
                    yield f"data: {update.json()}\n\n"
                    last_progress = current_progress
                    
                    # Small delay to prevent overwhelming the client
                    await asyncio.sleep(0.1)
        
            # Final completion message
            final_state = active_tasks.get(task_id, current_state)
            
            # Safely extract final state information
            task_complete = getattr(final_state, 'task_complete', False)
            task_failed = getattr(final_state, 'task_failed', False)
            final_code = getattr(final_state, 'final_code', '') or getattr(final_state, 'current_code', '')
            execution_log = getattr(final_state, 'execution_log', [])
            failure_reason = getattr(final_state, 'failure_reason', '') if task_failed else ""
            
            final_update = {
                "task_id": task_id,
                "status": "completed" if task_complete else "failed",
                "progress_percentage": 100.0 if task_complete else last_progress,
                "final_code": final_code,
                "execution_log": execution_log,
                "error_message": failure_reason,
                "timestamp": datetime.now().isoformat()
            }
            
            yield f"data: {json.dumps(final_update)}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming execution failed: {e}")
            error_update = {
                "task_id": task_id,
                "status": "error",
                "error_message": str(e),
                "timestamp": datetime.now().isoformat()
            }
            yield f"data: {json.dumps(error_update)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.get("/agent/status/{task_id}")
async def get_task_status(task_id: str):
    """
    Get status of a specific task
    
    Args:
        task_id: Task ID to check
        
    Returns:
        Current task status
    """
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    agent_state = active_tasks[task_id]
    
    # Safely extract state information
    try:
        progress = agent_state.get_progress_summary() if hasattr(agent_state, 'get_progress_summary') else {
            "progress": {"percentage": 0, "completed": 0, "total": 0}
        }
    except:
        progress = {"progress": {"percentage": 0, "completed": 0, "total": 0}}
    
    task_complete = getattr(agent_state, 'task_complete', False)
    task_failed = getattr(agent_state, 'task_failed', False)
    execution_log = getattr(agent_state, 'execution_log', [])
    current_code = getattr(agent_state, 'current_code', '')
    
    return {
        "task_id": task_id,
        "status": "completed" if task_complete else "failed" if task_failed else "running",
        "progress": progress,
        "logs": execution_log[-10:],  # Last 10 logs
        "current_code": current_code,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/agent/tasks")
async def list_active_tasks():
    """List all active tasks"""
    task_summaries = []
    for task_id, agent_state in active_tasks.items():
        try:
            progress_percentage = 0
            if hasattr(agent_state, 'get_progress_summary'):
                progress_percentage = agent_state.get_progress_summary()["progress"]["percentage"]
        except:
            progress_percentage = 0
        
        summary = {
            "task_id": task_id,
            "instruction": getattr(agent_state, 'user_instruction', ''),
            "status": "completed" if getattr(agent_state, 'task_complete', False) else "failed" if getattr(agent_state, 'task_failed', False) else "running",
            "progress_percentage": progress_percentage,
            "created_at": getattr(agent_state, 'created_at', datetime.now()).isoformat() if hasattr(getattr(agent_state, 'created_at', None), 'isoformat') else None
        }
        task_summaries.append(summary)
    
    return {
        "active_tasks": len(active_tasks),
        "tasks": task_summaries
    }

@app.delete("/agent/tasks/{task_id}")
async def cancel_task(task_id: str):
    """
    Cancel a specific task
    
    Args:
        task_id: Task ID to cancel
        
    Returns:
        Cancellation confirmation
    """
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    agent_state = active_tasks[task_id]
    if hasattr(agent_state, 'fail_task'):
        agent_state.fail_task("Task cancelled by user")
    
    return {
        "message": f"Task {task_id} cancelled",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/agent/validate")
async def validate_instruction(instruction: str):
    """
    Validate instruction without executing
    
    Args:
        instruction: Instruction to validate
        
    Returns:
        Validation result
    """
    try:
        # Simple validation logic
        if not instruction or len(instruction.strip()) < 5:
            return {
                "valid": False,
                "message": "Instruction too short",
                "suggestions": ["Provide more specific details", "Include what you want to achieve"]
            }
        
        # Check for common patterns
        code_keywords = ["function", "class", "variable", "method", "import", "def", "return"]
        has_code_context = any(keyword in instruction.lower() for keyword in code_keywords)
        
        return {
            "valid": True,
            "message": "Instruction appears valid",
            "has_code_context": has_code_context,
            "estimated_complexity": "medium" if has_code_context else "low"
        }
        
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        return {
            "valid": False,
            "message": f"Validation error: {str(e)}"
        }

async def cleanup_task(task_id: str, delay: int = 0):
    """
    Clean up completed tasks after delay
    
    Args:
        task_id: Task to clean up
        delay: Delay before cleanup in seconds
    """
    if delay > 0:
        await asyncio.sleep(delay)
    
    if task_id in active_tasks:
        del active_tasks[task_id]
        logger.info(f"Cleaned up task: {task_id}")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return {
        "error": exc.detail,
        "status_code": exc.status_code,
        "timestamp": datetime.now().isoformat()
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return {
        "error": "Internal server error",
        "message": str(exc),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )