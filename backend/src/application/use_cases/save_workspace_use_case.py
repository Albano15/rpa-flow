from backend.src.domain.ports.workflow_repo import IWorkflowRepository
from backend.src.application.mappers.workflow_mapper import from_editor


class SaveWorkspaceUseCase:
    def __init__(self, repository: IWorkflowRepository):
        self.repository = repository

    def execute(self, payload):
        editors = payload.get('workflows', [payload['workflow']] if 'workflow' in payload else [])
        documents = [from_editor(editor) for editor in editors]
        if len({d['workflow_id'] for d in documents}) != len(documents):
            raise ValueError('Fluxos duplicados')
        self.repository.save_workspace(documents, payload.get('assets', {}), payload.get('folders'), payload.get('activeId'))
        return {'success': True}
