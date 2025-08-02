from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import json
import uuid

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
    VALIDATOR = "validator"
    SIMPLE_INQUIRY = "simple_inquiry"
    CODE_GENERATOR = "code_generator"


@dataclass
class PlanStep:
    """Represents a single step in the execution plan"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    description: str = ""
    action_type: str = ""  # search, analyze, write, refactor, etc.
    target_files: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)  # Other step IDs this depends on
    reasoning: str = ""  # Chain-of-thought reasoning
    status: StepStatus = StepStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    tools_used: List[str] = field(default_factory=list)

@dataclass
class ExecutionMetrics:
    """Metrics for tracking agent performance"""
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    total_execution_time: float = 0.0
    internal_searches: int = 0
    external_searches: int = 0
    files_modified: int = 0
    llm_calls: int = 0

@dataclass
class AgentState:
    """The overall state of the agent's execution"""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_instruction: str = ""
    current_code: str = ""
    
    # New triage fields
    route: Optional[str] = None
    complexity: Optional[int] = None
    
    plan_steps: List[PlanStep] = field(default_factory=list)
    planning_complete: bool = False
    
    execution_log: List[Dict[str, Any]] = field(default_factory=list)
    feedback_messages: List[str] = field(default_factory=list)
    
    working_memory: Dict[str, Any] = field(default_factory=dict)
    
    loop_count: int = 0
    max_loops: int = 10
    
    task_complete: bool = False
    task_failed: bool = False
    failure_reason: str = ""  # Added missing field
    
    # Added missing fields
    created_at: Optional[datetime] = field(default_factory=datetime.now)
    
    metrics: ExecutionMetrics = field(default_factory=ExecutionMetrics)
    
    final_code: Optional[str] = None
    final_explanation: Optional[str] = None

    def log_message(self, message: str, node: NodeType, data: Optional[Dict[str, Any]] = None):
        """Log a message to the execution log"""
        self.execution_log.append({
            "timestamp": datetime.now().isoformat(),
            "node": node.value,
            "message": message,
            "data": data or {}
        })
    
    def start_task(self, instruction: str, code: str):
        """Initialize task state"""
        self.user_instruction = instruction
        self.current_code = code
        self.created_at = datetime.now()
        self.task_id = str(uuid.uuid4())
        self.log_message(f"Task started: {self.task_id}", NodeType.TRIAGE)

    def get_next_pending_step(self) -> Optional[PlanStep]:
        """Get the next step that is ready to be executed"""
        for step in self.plan_steps:
            if step.status == StepStatus.PENDING:
                # Check if dependencies are met
                if all(self.get_step_by_id(dep_id).status == StepStatus.COMPLETED for dep_id in step.dependencies):
                    return step
        return None

    def get_step_by_id(self, step_id: str) -> Optional[PlanStep]:
        """Find a step by its ID"""
        for step in self.plan_steps:
            if step.id == step_id:
                return step
        return None

    def add_plan_step(self, description: str, action_type: str, reasoning: str = "", 
                     target_files: List[str] = None, dependencies: List[str] = None) -> str:
        """Add a new plan step and return its ID"""
        step = PlanStep(
            description=description,
            action_type=action_type,
            reasoning=reasoning,
            target_files=target_files or [],
            dependencies=dependencies or []
        )
        self.plan_steps.append(step)
        return step.id

    def record_node_execution(self, node_type: NodeType, step_id: str = "", 
                            input_data: Dict[str, Any] = None, output_data: Dict[str, Any] = None,
                            reasoning: str = "", tools_used: List[str] = None, 
                            execution_time: float = 0.0, status: StepStatus = StepStatus.COMPLETED,
                            error_message: str = ""):
        """Record execution of a node"""
        self.log_message(
            f"Node {node_type.value} executed",
            node_type,
            {
                "step_id": step_id,
                "input_data": input_data or {},
                "output_data": output_data or {},
                "reasoning": reasoning,
                "tools_used": tools_used or [],
                "execution_time": execution_time,
                "status": status.value,
                "error_message": error_message
            }
        )

    def get_progress_summary(self) -> Dict[str, Any]:
        """Get a summary of the current progress"""
        if not self.plan_steps:
            return {"progress": {"percentage": 0, "completed": 0, "total": 0}}
        
        completed_steps = sum(1 for step in self.plan_steps if step.status == StepStatus.COMPLETED)
        total_steps = len(self.plan_steps)
        percentage = (completed_steps / total_steps) * 100 if total_steps > 0 else 0
        
        return {
            "progress": {
                "percentage": min(100, max(0, percentage)),  # Ensure 0-100 range
                "completed": completed_steps,
                "total": total_steps
            },
            "current_step": self.get_next_pending_step().description if self.get_next_pending_step() else "Finalizing..."
        }
    
    def fail_task(self, reason: str):
        """Mark task as failed"""
        self.task_failed = True
        self.failure_reason = reason
        self.log_message(f"Task failed: {reason}", NodeType.VALIDATOR)

    def update_working_memory(self, key: str, value: Any):
        """Update the agent's working memory"""
        self.working_memory[key] = value

    def get_from_working_memory(self, key: str, default: Any = None) -> Any:
        """Get value from working memory"""
        return self.working_memory.get(key, default)

    def cache_search_results(self, query: str, results: List[Dict[str, Any]]):
        """Cache search results in working memory"""
        if "search_cache" not in self.working_memory:
            self.working_memory["search_cache"] = {}
        self.working_memory["search_cache"][query] = results

    def to_json(self) -> str:
        """Serialize state to JSON"""
        return json.dumps(self.to_dict(), indent=2)

    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for serialization"""
        return {
            "task_id": self.task_id,
            "user_instruction": self.user_instruction,
            "current_code": self.current_code,
            "route": self.route,
            "complexity": self.complexity,
            "planning_complete": self.planning_complete,
            "plan_steps": [
                {
                    "id": step.id,
                    "description": step.description,
                    "action_type": step.action_type,
                    "status": step.status.value,
                    "reasoning": step.reasoning,
                    "tools_used": step.tools_used
                } for step in self.plan_steps
            ],
            "execution_log": self.execution_log[-20:],  # Last 20 log entries
            "feedback_messages": self.feedback_messages,
            "progress": self.get_progress_summary(),
            "task_complete": self.task_complete,
            "task_failed": self.task_failed,
            "failure_reason": self.failure_reason,
            "final_code": self.final_code,
            "final_explanation": self.final_explanation,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "metrics": {
                "start_time": self.metrics.start_time.isoformat(),
                "end_time": self.metrics.end_time.isoformat() if self.metrics.end_time else None,
                "total_execution_time": self.metrics.total_execution_time,
                "llm_calls": self.metrics.llm_calls,
                "internal_searches": self.metrics.internal_searches,
                "external_searches": self.metrics.external_searches,
                "files_modified": self.metrics.files_modified
            }
        }