"""Usage: python backend/run_workflow.py database/workflows/example.rpa.json"""
import sys
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
import argparse
import json
import re
from pathlib import Path
from backend.drivers import HostDriver
from backend.runner import Runner


def main():
    parser = argparse.ArgumentParser(description="Executar um contrato RPA exportado")
    parser.add_argument("workflow", type=Path)
    args = parser.parse_args()
    def load(workflow_id):
        if not re.fullmatch(r"[a-zA-Z0-9_-]+", workflow_id):
            raise ValueError("ID inválido")
        for directory in (args.workflow.parent, args.workflow.parent / "subroutines"):
            for suffix in (".sub.json", ".rpa.json"):
                file = directory / (workflow_id + suffix)
                if file.exists():
                    return json.loads(file.read_text(encoding="utf-8"))
        raise ValueError(f"Sub-rotina não encontrada: {workflow_id}")
    driver = HostDriver()
    try:
        results = Runner(driver, load).run(json.loads(args.workflow.read_text(encoding="utf-8")))
        print(json.dumps(results, ensure_ascii=False, indent=2))
    finally:
        driver.close()


if __name__ == "__main__":
    main()
