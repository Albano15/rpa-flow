"""Host adapters. Optional GUI dependencies are imported only when needed."""
import json
import subprocess
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError


class HostDriver:
    def __init__(self):
        self.playwright = None
        self.browsers = {}
        self.pages = {}

    def close(self):
        for browser in self.browsers.values():
            browser.close()
        if self.playwright:
            self.playwright.stop()

    def execute(self, action, config, node_id):
        if action == "http.request":
            method = config["method"]
            headers = dict(config.get("headers", {}))
            body = None
            if method not in ("GET", "HEAD"):
                body = json.dumps(config.get("body")).encode("utf-8")
                headers.setdefault("Content-Type", "application/json")
            request = Request(config["endpoint"], data=body, headers=headers, method=method)
            try:
                response = urlopen(request, timeout=config.get("timeout_sec", 30))
            except HTTPError as error:
                response = error
            with response:
                text = response.read().decode("utf-8", errors="replace")
                try:
                    body = json.loads(text)
                except ValueError:
                    body = text
                return {"status": response.status, "headers": dict(response.headers), "body": body}
        if action == "web.create_browser":
            if not self.playwright:
                from playwright.sync_api import sync_playwright
                self.playwright = sync_playwright().start()
            browser = self.playwright.chromium.launch(headless=config.get("headless", False))
            if node_id in self.browsers:
                self.browsers[node_id].close()
            self.browsers[node_id] = browser
            page = browser.new_page()
            self.pages[node_id] = page
            page.goto(config["url"])
            return {"browser": node_id, "url": page.url}
        if action.startswith("web."):
            if config["browser"] not in self.pages:
                raise ValueError("Navegador ainda não foi criado")
            page = self.pages[config["browser"]]
            element = page.locator(config["selector"])
            if action == "web.select_element":
                element.wait_for(state="attached")
                return {"browser": config["browser"], "selector": config["selector"], "text": element.inner_text()}
            if action == "web.type_text":
                element.fill(str(config["text"]))
            elif action == "web.click":
                element.click()
            else:
                raise ValueError(f"Ação web desconhecida: {action}")
            return {"url": page.url}
        if action == "desktop.wait_delay":
            time.sleep(config["duration_ms"] / 1000)
            return {}
        if action == "desktop.open_app":
            process = subprocess.Popen([config["path"], *config.get("args", [])], cwd=config.get("cwd") or None)
            return {"process_id": process.pid}
        import pyautogui as gui
        if action == "desktop.focus_window":
            windows = gui.getWindowsWithTitle(config["title"])
            if not windows:
                raise ValueError("Janela não encontrada")
            window = windows[0]
            if window.isMinimized:
                window.restore()
            window.activate()
            return {"title": window.title}
        if action == "desktop.type_text":
            if config.get("write_method") == "paste":
                import pyperclip
                pyperclip.copy(str(config["text"]))
                gui.hotkey("ctrl", "v")
            else:
                gui.write(str(config["text"]), interval=config.get("interval_sec", 0.05))
        elif action == "desktop.press_key":
            for _ in range(config.get("repeat_count", 1)):
                gui.hotkey(*config.get("modifiers", []), config["keys"])
        elif action == "desktop.click_coordinate":
            time.sleep(config.get("delay_ms", 0) / 1000)
            gui.click(config["x"], config["y"], clicks=2 if config.get("click_type") == "double" else 1, button=config.get("button", "left"))
        elif action in ("desktop.click_image", "desktop.wait_image"):
            deadline = time.monotonic() + config.get("timeout_sec", 30)
            point = None
            while time.monotonic() < deadline:
                try:
                    point = gui.locateCenterOnScreen(config["image_asset"], confidence=config.get("confidence", .85))
                except gui.ImageNotFoundException:
                    point = None
                if point:
                    break
                time.sleep(config.get("interval_sec", .5))
            if not point:
                raise ValueError("Imagem não encontrada")
            if action == "desktop.click_image":
                button = config.get("button", "left")
                gui.click(point.x + config.get("dx", 0), point.y + config.get("dy", 0), button="left" if button == "double" else button, clicks=2 if button == "double" else 1)
            return {"found": True, "point_x": point.x, "point_y": point.y}
        elif action == "desktop.ocr_extract":
            import pytesseract
            import re
            region = config["region"]
            shot = gui.screenshot(region=tuple(region[k] for k in ("x", "y", "width", "height")))
            if config.get("grayscale"):
                shot = shot.convert("L")
            if config.get("binarize"):
                shot = shot.convert("L").point(lambda x: 255 if x >= config.get("threshold", 128) else 0)
            text = pytesseract.image_to_string(shot, lang=config.get("lang", "por"))
            if config.get("regex_filter"):
                text = "\n".join(match.group(0) for match in re.finditer(config["regex_filter"], text))
            return {"extracted_text": text}
        else:
            raise ValueError(f"Ação desconhecida: {action}")
        return {}
