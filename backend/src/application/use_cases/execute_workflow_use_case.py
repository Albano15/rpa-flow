from backend.src.domain.ports.workflow_repo import IWorkflowRepository
from backend.src.domain.ports.desktop_port import IDesktopAutomationDriver
from backend.src.domain.services.workflow_executor import Runner


class ExecuteWorkflowUseCase:
    def __init__(self, repository: IWorkflowRepository, driver: IDesktopAutomationDriver):
        self.repository = repository
        self.driver = driver

    def execute(self, workflow_id, inputs=None):
        return Runner(self.driver, self.repository.load).run(self.repository.load(workflow_id), inputs)
