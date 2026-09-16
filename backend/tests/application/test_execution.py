import unittest
from unittest.mock import Mock
from backend.src.application.use_cases.execute_workflow_use_case import ExecuteWorkflowUseCase


class ExecutionTests(unittest.TestCase):
    def test_loads_from_port_and_bypasses_disabled_step(self):
        repo, driver = Mock(), Mock()
        repo.load.return_value = {'workflow_id': 'wf_test', 'nodes': [
            {'id': 'a', 'type': 'desktop.wait_delay', 'enabled': False, 'config': {}, 'next_node_id': 'b'},
            {'id': 'b', 'type': 'desktop.wait_delay', 'enabled': True, 'config': {'duration_ms': 0}, 'next_node_id': None}]}
        driver.execute.return_value = {}
        result = ExecuteWorkflowUseCase(repo, driver).execute('wf_test')
        self.assertEqual(result, {'b': {}})
        driver.execute.assert_called_once_with('desktop.wait_delay', {'duration_ms': 0}, 'b')

    def test_executes_empty_draft_without_effects(self):
        repo, driver = Mock(), Mock()
        repo.load.return_value = {'workflow_id': 'wf_empty', 'nodes': []}
        self.assertEqual(ExecuteWorkflowUseCase(repo, driver).execute('wf_empty'), {})
        driver.execute.assert_not_called()
