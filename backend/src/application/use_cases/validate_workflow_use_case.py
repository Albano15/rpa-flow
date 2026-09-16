from backend.src.domain.entities.workflow import Workflow


class ValidateWorkflowUseCase:
    def execute(self, ast):
        return Workflow.from_ast(ast)
