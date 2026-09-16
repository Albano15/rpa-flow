"""Local JSON IPC entrypoint used by Next.js; stdout is reserved for responses."""
import argparse
import json
import sys
from pathlib import Path
from backend.src.application.mappers.workflow_mapper import to_editor
from backend.src.application.use_cases.save_workspace_use_case import SaveWorkspaceUseCase
from backend.src.infra.persistence.mock_file_workflow_repository import MockFileWorkflowRepository


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('operation', choices=['save', 'list', 'get'])
    parser.add_argument('--id')
    parser.add_argument('--database', type=Path, default=Path(__file__).parent / 'database')
    args = parser.parse_args()
    repository = MockFileWorkflowRepository(args.database)
    try:
        if args.operation == 'save':
            result = SaveWorkspaceUseCase(repository).execute(json.load(sys.stdin))
        elif args.operation == 'list':
            result = repository.workspace()
        else:
            document = repository.load(args.id)
            result = {'workflow': to_editor(document), 'ast': {k: v for k, v in document.items() if k != 'editor'}}
        print(json.dumps(result, ensure_ascii=False))
    except (ValueError, KeyError, TypeError) as error:
        print(json.dumps({'error': str(error)}))
        return 2
    except FileNotFoundError:
        print(json.dumps({'error': 'Fluxo não encontrado'}))
        return 3
    return 0


if __name__ == '__main__':
    sys.exit(main())
