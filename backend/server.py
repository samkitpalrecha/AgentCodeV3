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
    
    stream_queue = asyncio.Queue()

    async def stream_generator():
        # Start the agent workflow in the background
        workflow_task = asyncio.create_task(
            execute_agent_workflow(request.instruction, request.code, stream_queue)
        )

        while True:
            try:
                # Wait for the next update from the queue
                state_dict = await asyncio.wait_for(stream_queue.get(), timeout=60.0)
                yield f"data: {json.dumps(state_dict)}\n\n"
                
                if state_dict.get("task_complete") or state_dict.get("task_failed"):
                    break
            except asyncio.TimeoutError:
                logger.warning(f"Timeout waiting for stream update for task {task_id}")
                break
            except asyncio.CancelledError:
                logger.info(f"Stream cancelled for task {task_id}")
                break

        # Ensure the workflow task is complete and handle its result
        try:
            final_result = await workflow_task
            # Send one final update
            yield f"data: {json.dumps(final_result)}\n\n"
        except Exception as e:
            logger.error(f"Workflow task failed with exception: {e}", exc_info=True)
            error_payload = {
                "task_id": task_id,
                "task_failed": True,
                "failure_reason": str(e)
            }
            yield f"data: {json.dumps(error_payload)}\n\n"

        logger.info(f"Stream finished for task {task_id}")


    return StreamingResponse(stream_generator(), media_type="text/event-stream")

@app.get("/")
def read_root():
    return {"message": "Agentic Code Editor Backend is running."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)