"""Run a workflow from the same repository used by the Studio."""
import argparse
import json
from pathlib import Path
from backend.src.application.use_cases.execute_workflow_use_case import ExecuteWorkflowUseCase
from backend.src.infra.desktop.pyautogui_driver import PyAutoGUIDriver
from backend.src.infra.persistence.mock_file_workflow_repository import MockFileWorkflowRepository


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('workflow_id')
    parser.add_argument('--database', type=Path, default=Path(__file__).parent / 'database')
    args = parser.parse_args()
    driver = PyAutoGUIDriver(args.database)
    try:
        result = ExecuteWorkflowUseCase(MockFileWorkflowRepository(args.database), driver).execute(args.workflow_id)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    finally:
        driver.close()


if __name__ == '__main__':
    main()
