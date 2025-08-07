import asyncio
import json
import logging
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime
import uuid
import os

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

from agent_graph import execute_agent_workflow
from state import AgentState

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class AgentRequest(BaseModel):
    instruction: str
    code: str = ""

app = FastAPI(
    title="Agentic Code Editor Backend",
    description="An advanced AI agent for code generation, modification, and explanation.",
    version="2.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/agent/stream")
async def agent_stream(request: AgentRequest):
    """
    Main endpoint to interact with the agent, with real-time streaming of progress.
    """
    task_id = str(uuid.uuid4())
    logger.info(f"Streaming agent request received: {task_id}")
    
    stream_queue = asyncio.Queue(maxsize=100)  # Add maxsize to prevent memory issues

    async def stream_generator():
        # Start the agent workflow in the background
        workflow_task = asyncio.create_task(
            execute_agent_workflow(request.instruction, request.code, stream_queue)
        )

        task_complete = False
        update_count = 0

        try:
            while not task_complete:
                try:
                    # Reduced timeout and added better error handling
                    state_dict = await asyncio.wait_for(stream_queue.get(), timeout=30.0)
                    update_count += 1
                    
                    logger.info(f"Streaming update #{update_count} for task {task_id}")
                    yield f"data: {json.dumps(state_dict)}\n\n"
                    
                    # Check if task is complete or failed
                    if state_dict.get("task_complete") or state_dict.get("task_failed"):
                        logger.info(f"Task completed/failed for {task_id}. Sent {update_count} updates.")
                        task_complete = True
                        break
                        
                except asyncio.TimeoutError:
                    logger.warning(f"Timeout waiting for stream update #{update_count + 1} for task {task_id}")
                    
                    # Check if workflow task is still running
                    if workflow_task.done():
                        logger.info(f"Workflow task completed, breaking stream for {task_id}")
                        break
                    else:
                        # Send a heartbeat to keep connection alive
                        heartbeat = {
                            "task_id": task_id,
                            "heartbeat": True,
                            "timestamp": datetime.now().isoformat()
                        }
                        yield f"data: {json.dumps(heartbeat)}\n\n"
                        continue
                        
        except asyncio.CancelledError:
            logger.info(f"Stream cancelled for task {task_id}")
        except Exception as e:
            logger.error(f"Error in stream generator for task {task_id}: {e}", exc_info=True)

        # Ensure the workflow task is complete and handle its result
        try:
            if not workflow_task.done():
                logger.info(f"Waiting for workflow task to complete for {task_id}")
                final_result = await asyncio.wait_for(workflow_task, timeout=10.0)
            else:
                final_result = await workflow_task
                
            # Send final result if we haven't already
            if not task_complete and final_result:
                logger.info(f"Sending final result for task {task_id}")
                yield f"data: {json.dumps(final_result)}\n\n"
                
        except asyncio.TimeoutError:
            logger.error(f"Timeout waiting for final workflow result for task {task_id}")
            error_payload = {
                "task_id": task_id,
                "task_failed": True,
                "failure_reason": "Workflow timeout"
            }
            yield f"data: {json.dumps(error_payload)}\n\n"
        except Exception as e:
            logger.error(f"Workflow task failed with exception for task {task_id}: {e}", exc_info=True)
            error_payload = {
                "task_id": task_id,
                "task_failed": True,
                "failure_reason": str(e)
            }
            yield f"data: {json.dumps(error_payload)}\n\n"
        finally:
            # Cancel workflow task if still running
            if not workflow_task.done():
                workflow_task.cancel()

        logger.info(f"Stream finished for task {task_id}. Total updates: {update_count}")

    return StreamingResponse(
        stream_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.get("/")
def read_root():
    return {"message": "Agentic Code Editor Backend is running."}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)