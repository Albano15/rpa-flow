"""Translate the editor graph into the execution contract without discarding drafts."""
from copy import deepcopy
from backend.src.domain.entities.workflow import Workflow


def from_editor(editor):
    if editor.get('kind') not in ('workflow', 'subroutine'):
        raise ValueError('Tipo de fluxo inválido')
    nodes = editor['nodes']
    by_id = {n['id']: n for n in nodes}
    if len(by_id) != len(nodes):
        raise ValueError('IDs duplicados')
    for node in nodes:
        if node['type'] not in ('action', 'scope'):
            raise ValueError('Tipo de nó inválido')
        seen, parent = {node['id']}, node.get('parentId')
        while parent:
            if parent in seen or parent not in by_id or by_id[parent]['type'] != 'scope':
                raise ValueError('Hierarquia de seções inválida')
            seen.add(parent)
            parent = by_id[parent].get('parentId')
    actions = [n for n in nodes if n['type'] == 'action']
    action_ids = {n['id'] for n in actions}
    next_ids, incoming = {}, set()
    for edge in editor['edges']:
        source, target = edge['source'], edge['target']
        if source not in action_ids or target not in action_ids or source in next_ids or target in incoming:
            raise ValueError('Conexão inválida')
        next_ids[source] = target
        incoming.add(target)
    ast = {
        '$schema': 'https://rpa-platform.local/schemas/workflow.v1.json',
        'workflow_id': editor['id'], 'name': editor['name'], 'version': '1.0.0',
        'description': editor.get('description', ''), 'metadata': editor.get('metadata', {}),
        'variables': editor.get('variables', {}),
        'nodes': [dict(id=n['id'], name=n['data']['customLabel'], type=n['data']['action'], enabled=n['data'].get('enabled', True), config=n['data']['config'], next_node_id=next_ids.get(n['id']), **{k: n['data'][k] for k in ('outputs', 'retry_policy') if n['data'].get(k) is not None}) for n in actions],
        'sections': [dict(id=n['id'], label=n['data']['customLabel'], node_ids=[a['id'] for a in actions if a.get('parentId') == n['id']], collapsed=n['data'].get('collapsed', False), **({'parent_id': n['parentId']} if n.get('parentId') else {})) for n in nodes if n['type'] == 'scope'],
    }
    Workflow.from_ast(ast)
    return {**deepcopy(ast), 'editor': deepcopy(editor)}


def to_editor(document):
    """AST is authoritative; the editor snapshot only supplies appearance and folders."""
    Workflow.from_ast(document)
    editor = deepcopy(document.get('editor', {}))
    visual = {n['id']: n for n in editor.get('nodes', [])}
    editor.update(id=document['workflow_id'], name=document.get('name', ''), description=document.get('description', ''), metadata=document.get('metadata', {}), variables=document.get('variables', {}))
    editor.setdefault('kind', 'subroutine' if document['workflow_id'].startswith('sub_') else 'workflow')
    editor.setdefault('folderId', 'root')
    editor.setdefault('tags', [])
    actions = []
    for step in document['nodes']:
        node = deepcopy(visual.get(step['id'], {'id': step['id'], 'type': 'action', 'position': {'x': 0, 'y': 0}, 'data': {'notes': '', 'color': '#6366f1'}}))
        node.pop('parentId', None)
        node['data'].update(action=step['type'], customLabel=step['name'], enabled=step.get('enabled', True), config=step.get('config', {}))
        for key in ('outputs', 'retry_policy'):
            node['data'].pop(key, None)
            if key in step:
                node['data'][key] = step[key]
        actions.append(node)
    scopes = []
    for section in document.get('sections', []):
        node = deepcopy(visual.get(section['id'], {'id': section['id'], 'type': 'scope', 'position': {'x': 0, 'y': 0}, 'data': {'color': '#6366f1'}}))
        node.pop('parentId', None)
        node['data'].update(customLabel=section['label'], collapsed=section.get('collapsed', False))
        if section.get('parent_id'):
            node['parentId'] = section['parent_id']
        scopes.append(node)
        for action in actions:
            if action['id'] in section['node_ids']:
                action['parentId'] = section['id']
    editor['nodes'] = scopes + actions
    editor['edges'] = [dict(id='edge_' + step['id'] + '_' + step['next_node_id'], source=step['id'], target=step['next_node_id'], type='insert') for step in document['nodes'] if step.get('next_node_id')]
    return editor
