import unittest
from backend.src.domain.entities.workflow import Workflow


class WorkflowTests(unittest.TestCase):
    def test_empty_draft_is_valid(self):
        self.assertEqual(Workflow.from_ast({'workflow_id': 'wf_empty', 'nodes': []}).steps, ())

    def test_rejects_cycles_and_missing_targets(self):
        for target in ('a', 'missing'):
            with self.assertRaises(ValueError):
                Workflow.from_ast({'workflow_id': 'wf_test', 'nodes': [{'id': 'a', 'type': 'desktop.wait_delay', 'config': {}, 'next_node_id': target}]})
