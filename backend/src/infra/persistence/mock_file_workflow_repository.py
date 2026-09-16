from backend.src.application.mappers.workflow_mapper import to_editor
import base64
import binascii
import json
import re
import os
import tempfile
from pathlib import Path


class MockFileWorkflowRepository:
    def __init__(self, directory):
        self.directory = Path(directory)

    def _id(self, identifier):
        if not isinstance(identifier, str) or not re.fullmatch(r'[a-zA-Z0-9_-]+', identifier):
            raise ValueError('ID inválido')
        return identifier

    def _write(self, path, payload):
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as file:
                json.dump(payload, file, ensure_ascii=False, indent=2)
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)

    def save_workspace(self, documents, assets, folders=None, active_id=None):
        templates = {}
        for key, value in assets.items():
            if not re.fullmatch(r'assets/[a-zA-Z0-9_-]+\.png', key):
                raise ValueError('Caminho de template inválido')
            if not isinstance(value, str) or not value.startswith('data:image/png;base64,'):
                raise ValueError('Template PNG inválido')
            try:
                templates[key] = base64.b64decode(value.split(',', 1)[1], validate=True)
            except (ValueError, binascii.Error) as error:
                raise ValueError('Template inválido') from error
        for document in documents:
            identifier = self._id(document['workflow_id'])
            kind = document['editor']['kind']
            folder = 'subroutines' if kind == 'subroutine' else 'workflows'
            self._write(self.directory / folder / (identifier + '.json'), document)
        (self.directory / 'assets').mkdir(parents=True, exist_ok=True)
        for key, content in templates.items():
            dest = self.directory / key
            fd, temporary = tempfile.mkstemp(dir=dest.parent, suffix='.tmp')
            try:
                with os.fdopen(fd, 'wb') as file:
                    file.write(content)
                os.replace(temporary, dest)
            finally:
                if os.path.exists(temporary):
                    os.unlink(temporary)
        self._write(self.directory / 'assets' / 'index.json', assets)
        if folders is not None:
            self._write(self.directory / 'folders.json', folders)
        self._write(self.directory / 'workspace.json', {'ids': [d['workflow_id'] for d in documents], 'activeId': active_id})

    def load(self, workflow_id):
        identifier = self._id(workflow_id)
        for folder in ('workflows', 'subroutines'):
            path = self.directory / folder / (identifier + '.json')
            if path.exists():
                return json.loads(path.read_text(encoding='utf-8'))
        raise FileNotFoundError(identifier)

    def workspace(self):
        manifest = self.directory / 'workspace.json'
        ids = json.loads(manifest.read_text())['ids'] if manifest.exists() else [p.stem for folder in ('workflows', 'subroutines') for p in sorted((self.directory / folder).glob('*.json'))]
        documents = [self.load(identifier) for identifier in ids]
        assets_path = self.directory / 'assets/index.json'
        folders_path = self.directory / 'folders.json'
        return {'activeId': json.loads(manifest.read_text()).get('activeId') if manifest.exists() else None, 'workflows': [to_editor(d) for d in documents], 'assets': json.loads(assets_path.read_text()) if assets_path.exists() else {}, 'folders': json.loads(folders_path.read_text()) if folders_path.exists() else []}
