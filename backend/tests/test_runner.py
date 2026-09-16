import unittest
from unittest.mock import Mock
from backend.runner import Runner


def flow(nodes):
    return {"workflow_id": "test", "variables": {}, "nodes": [dict(id=str(i), type=t, config=c, enabled=True, next_node_id=str(i+1) if i+1<len(nodes) else None) for i,(t,c) in enumerate(nodes)]}


class RunnerTests(unittest.TestCase):
    def test_api_result_drives_loop_and_decision(self):
        driver = Mock()
        driver.execute.return_value = {"body": {"count": 3}, "status": 200}
        sub = flow([("flow.value", {"value": "ok"})])
        loader = Mock(return_value=sub)
        ref = {"source": "action", "actionId": "0", "path": "body.count", "valueType": "number"}
        document = flow([("http.request", {}), ("flow.loop", {"times": ref, "subroutine_id": "child"}), ("flow.decision", {"left": ref, "right": 3, "operator": "equals", "then_subroutine_id": "child", "else_subroutine_id": ""})])
        sub["workflow_id"] = "child"
        results = Runner(driver, loader).run(document)
        self.assertEqual(results["1"]["iterations"], 3)
        self.assertTrue(results["2"]["matched"])
        self.assertEqual(loader.call_count, 4)

    def test_disabled_action_and_invalid_reference(self):
        driver = Mock()
        document = flow([("flow.value", {"value": 12}), ("flow.value", {"value": {"source": "action", "actionId": "0", "path": "value", "valueType": "number"}})])
        self.assertEqual(Runner(driver).run(document)["1"]["value"], 12)
        document["nodes"][0]["enabled"] = False
        with self.assertRaises(ValueError):
            Runner(driver).run(document)
        driver.execute.assert_not_called()

    def test_rejects_cycle_before_side_effects(self):
        driver = Mock()
        document = flow([("http.request", {}), ("http.request", {})])
        document["nodes"][1]["next_node_id"] = "0"
        with self.assertRaises(ValueError):
            Runner(driver).run(document)
        driver.execute.assert_not_called()

class DriverTests(unittest.TestCase):
    def test_browser_actions_use_selected_page(self):
        from backend.drivers import HostDriver
        driver = HostDriver()
        first, second = Mock(), Mock()
        driver.pages = {"first": first, "second": second}
        driver.execute("web.type_text", {"browser": "second", "selector": "#name", "text": "Ana"}, "step")
        first.locator.assert_not_called()
        second.locator.assert_called_once_with("#name")
        second.locator.return_value.fill.assert_called_once_with("Ana")

    def test_api_keeps_error_response_body(self):
        from backend.drivers import HostDriver
        from unittest.mock import patch
        from urllib.error import HTTPError
        from io import BytesIO
        error = HTTPError("https://example.test", 422, "Invalid", {"Content-Type": "application/json"}, BytesIO(b'{"error":"invalid"}'))
        with patch("backend.drivers.urlopen", side_effect=error):
            result = HostDriver().execute("http.request", {"method": "POST", "endpoint": "https://example.test", "body": {"name": "Ana"}}, "api")
        self.assertEqual(result["status"], 422)
        self.assertEqual(result["body"], {"error": "invalid"})
