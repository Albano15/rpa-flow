from pathlib import Path
from backend.drivers import HostDriver


class PyAutoGUIDriver(HostDriver):
    """Host adapter; saved image references resolve relative to its repository."""
    def __init__(self, database=None):
        super().__init__()
        self.database = Path(database).resolve() if database else None

    def execute(self, action, config, node_id):
        if self.database and action in ('desktop.click_image', 'desktop.wait_image'):
            config = dict(config)
            template = (self.database / config['image_asset']).resolve()
            if not template.is_relative_to(self.database / 'assets'):
                raise ValueError('Caminho de template inválido')
            config['image_asset'] = str(template)
        return super().execute(action, config, node_id)
