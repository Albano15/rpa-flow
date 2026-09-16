import tempfile
import unittest
from pathlib import Path
from backend.src.application.use_cases.save_workspace_use_case import SaveWorkspaceUseCase
from backend.src.infra.persistence.mock_file_workflow_repository import MockFileWorkflowRepository


def editor(identifier='wf_test', kind='workflow'):
    return {'id': identifier, 'kind': kind, 'name': 'Teste', 'nodes': [
        {'id': 'section', 'type': 'scope', 'position': {'x': 0, 'y': 0}, 'data': {'customLabel': 'Seção', 'collapsed': False}},
        {'id': 'a', 'type': 'action', 'parentId': 'section', 'position': {'x': 0, 'y': 0}, 'data': {'action': 'desktop.wait_delay', 'customLabel': 'Espera', 'enabled': False, 'config': {'duration_ms': 10}}},
        {'id': 'b', 'type': 'action', 'position': {'x': 0, 'y': 0}, 'data': {'action': 'flow.subroutine', 'customLabel': 'Filho', 'enabled': True, 'config': {'subroutine_id': 'sub_child', 'inputs': {}}}},
    ], 'edges': [{'id': 'ab', 'source': 'a', 'target': 'b'}]}


class RepositoryTests(unittest.TestCase):
    def test_save_load_ast_and_visual_data(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = MockFileWorkflowRepository(Path(directory))
            SaveWorkspaceUseCase(repo).execute({'workflows': [editor(), dict(editor('sub_child', 'subroutine'), nodes=[], edges=[])], 'assets': {'assets/template.png': 'data:image/png;base64,aGVsbG8='}})
            ast = repo.load('wf_test')
            self.assertEqual(ast['nodes'][0]['next_node_id'], 'b')
            self.assertFalse(ast['nodes'][0]['enabled'])
            self.assertEqual(ast['sections'][0]['node_ids'], ['a'])
            self.assertEqual(repo.workspace()['workflows'][0]['nodes'][1]['parentId'], 'section')
            self.assertTrue((Path(directory) / 'subroutines/sub_child.json').exists())
            self.assertEqual(len(repo.workspace()['workflows']), 2)

    def test_invalid_batch_does_not_save_valid_prefix(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = MockFileWorkflowRepository(Path(directory))
            with self.assertRaises(ValueError):
                SaveWorkspaceUseCase(repo).execute({'workflows': [editor(), editor('../escape')], 'assets': {}})
            self.assertEqual(repo.workspace()['workflows'], [])

    def test_database_contract_changes_are_reflected_in_editor(self):
        import json
        with tempfile.TemporaryDirectory() as directory:
            repo = MockFileWorkflowRepository(Path(directory))
            SaveWorkspaceUseCase(repo).execute({'workflow': editor(), 'assets': {}})
            path = Path(directory) / 'workflows/wf_test.json'
            document = json.loads(path.read_text())
            document['nodes'][0]['name'] = 'Alterado no banco'
            document['nodes'][0]['config']['duration_ms'] = 250
            path.write_text(json.dumps(document))
            node = repo.workspace()['workflows'][0]['nodes'][1]
            self.assertEqual(node['data']['customLabel'], 'Alterado no banco')
            self.assertEqual(node['data']['config']['duration_ms'], 250)

    def test_materializes_templates_and_rejects_path_traversal(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = MockFileWorkflowRepository(Path(directory))
            SaveWorkspaceUseCase(repo).execute({'workflow': editor(), 'assets': {'assets/template.png': 'data:image/png;base64,aGVsbG8='}})
            self.assertEqual((Path(directory) / 'assets/template.png').read_bytes(), b'hello')
            with self.assertRaises(ValueError):
                SaveWorkspaceUseCase(repo).execute({'workflow': editor(), 'assets': {'../escape.png': 'data:image/png;base64,aGVsbG8='}})
