from backend.src.application.use_cases.execute_workflow_use_case import ExecuteWorkflowUseCase


class ExecuteSubroutineUseCase(ExecuteWorkflowUseCase):
    """Execute a saved child workflow with its input mapping."""
