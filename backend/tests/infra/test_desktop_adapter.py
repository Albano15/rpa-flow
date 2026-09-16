import unittest
from pathlib import Path
from unittest.mock import patch
from backend.src.infra.desktop.pyautogui_driver import PyAutoGUIDriver


class DesktopAdapterTests(unittest.TestCase):
    def test_resolves_saved_template_without_calling_gui(self):
        with patch('backend.drivers.HostDriver.execute', return_value={'found': True}) as execute:
            driver = PyAutoGUIDriver(Path('/tmp/database'))
            driver.execute('desktop.wait_image', {'image_asset': 'assets/template.png'}, 'a')
            self.assertEqual(execute.call_args.args[1]['image_asset'], '/tmp/database/assets/template.png')
