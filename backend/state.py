from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import json
import uuid
import asyncio

class StepStatus(Enum):
    """Status of individual steps"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class NodeType(Enum):
    """Types of nodes in the workflow"""
    TRIAGE = "triage"
    PLANNER = "planner"
    DEVELOPER = "developer"
    SIMPLE_INQUIRY = "simple_inquiry"
    FINISH = "finish"

@dataclass
class PlanStep:
    """Represents a single step in the execution plan"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    description: str = ""
    action_type: str = ""
    parameters: Dict[str, Any] = field(default_factory=dict)
    reasoning: str = ""
    status: StepStatus = StepStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class ExecutionLog:
    """A single log entry in the execution history"""
    timestamp: datetime = field(default_factory=datetime.now)
    node: NodeType = NodeType.TRIAGE
    message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)
    status: Optional[StepStatus] = None

@dataclass
class AgentMetrics:
    """Metrics for tracking agent performance"""
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    total_execution_time: float = 0.0
    llm_calls: int = 0
    internal_searches: int = 0
    external_searches: int = 0

@dataclass
class AgentState:
    """The complete state of the agent's execution. This class is now fully serializable."""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_instruction: str = ""
    current_code: str = ""
    
    # Planning
    planning_complete: bool = False
    plan_steps: List[PlanStep] = field(default_factory=list)

    # Execution
    working_memory: Dict[str, Any] = field(default_factory=dict)
    execution_log: List[ExecutionLog] = field(default_factory=list)
    
    # Status
    task_complete: bool = False
    task_failed: bool = False
    failure_reason: str = ""
    
    # Output
    final_code: str = ""
    final_explanation: str = ""
    
    # System
    created_at: datetime = field(default_factory=datetime.now)
    metrics: AgentMetrics = field(default_factory=AgentMetrics)
    
    # NOTE: The stream_queue has been removed to ensure the state is serializable.

    def start_task(self, instruction: str, code: str):
        self.user_instruction = instruction
        self.current_code = code
        self.log_message(f"Task started: {instruction}", NodeType.TRIAGE)

    def log_message(self, message: str, node: NodeType, details: Dict[str, Any] = None, status: Optional[StepStatus] = None):
        log_entry = ExecutionLog(
            node=node,
            message=message,
            details=details or {},
            status=status
        )
        self.execution_log.append(log_entry)

    def add_plan_step(self, step: PlanStep):
        self.plan_steps.append(step)
        self.log_message(f"Planned step: {step.description}", NodeType.PLANNER, {"step_id": step.id})

    def get_next_pending_step(self) -> Optional[PlanStep]:
        return next((step for step in self.plan_steps if step.status == StepStatus.PENDING), None)

    def update_working_memory(self, key: str, value: Any):
        self.working_memory[key] = value
        self.log_message(f"Updated working memory with key: {key}", NodeType.DEVELOPER)

    def get_progress_summary(self) -> Dict[str, Any]:
        completed_steps = sum(1 for step in self.plan_steps if step.status == StepStatus.COMPLETED)
        total_steps = len(self.plan_steps)
        return {
            "completed_steps": completed_steps,
            "total_steps": total_steps,
            "percentage": (completed_steps / total_steps * 100) if total_steps > 0 else 0
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serializes the state to a dictionary for API responses, handling non-serializable types."""
        if self.metrics.end_time is None and (self.task_complete or self.task_failed):
            self.metrics.end_time = datetime.now()
            self.metrics.total_execution_time = (self.metrics.end_time - self.metrics.start_time).total_seconds()

        return {
            "task_id": self.task_id,
            "user_instruction": self.user_instruction,
            "planning_complete": self.planning_complete,
            "plan_steps": [
                {
                    "id": step.id,
                    "description": step.description,
                    "action_type": step.action_type,
                    "status": step.status.value, # Convert Enum to string
                    "reasoning": step.reasoning,
                    "created_at": step.created_at.isoformat() # Convert datetime to string
                } for step in self.plan_steps
            ],
            "execution_log": [
                {
                    "timestamp": log.timestamp.isoformat(), # Convert datetime
                    "node": log.node.value, # Convert Enum
                    "message": log.message,
                    "details": log.details,
                    "status": log.status.value if log.status else None # Convert Enum
                } for log in self.execution_log[-20:]
            ],
            "progress": self.get_progress_summary(),
            "task_complete": self.task_complete,
            "task_failed": self.task_failed,
            "failure_reason": self.failure_reason,
            "final_code": self.final_code,
            "final_explanation": self.final_explanation,
            "metrics": {
                "start_time": self.metrics.start_time.isoformat(), # Convert datetime
                "end_time": self.metrics.end_time.isoformat() if self.metrics.end_time else None, # Convert datetime
                "total_execution_time": self.metrics.total_execution_time,
                "llm_calls": self.metrics.llm_calls,
                "internal_searches": self.metrics.internal_searches,
                "external_searches": self.metrics.external_searches,
            },
        }