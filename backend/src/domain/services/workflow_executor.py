"""Sequential workflow engine. Drivers own desktop, browser and HTTP effects."""
from backend.src.domain.entities.workflow import Workflow
import re
from decimal import Decimal


class Runner:
    def __init__(self, driver, load_workflow=None):
        self.driver = driver
        self.load_workflow = load_workflow

    def run(self, workflow, inputs=None, stack=()):
        workflow_id = workflow["workflow_id"]
        if workflow_id in stack:
            raise ValueError("Referência circular entre sub-rotinas")
        stack = (*stack, workflow_id)
        Workflow.from_ast(workflow)
        if not workflow["nodes"]:
            return {}
        nodes = {n["id"]: n for n in workflow["nodes"]}
        if len(nodes) != len(workflow["nodes"]):
            raise ValueError("IDs duplicados")
        incoming = [n["next_node_id"] for n in nodes.values() if n.get("next_node_id")]
        roots = set(nodes) - set(incoming)
        if len(roots) != 1 or len(set(incoming)) != len(incoming):
            raise ValueError("O fluxo deve ser uma sequência")
        order, cursor = [], next(iter(roots))
        while cursor:
            if cursor in order or cursor not in nodes:
                raise ValueError("Ciclo ou conexão inválida")
            order.append(cursor)
            cursor = nodes[cursor].get("next_node_id")
        if len(order) != len(nodes):
            raise ValueError("Ações desconectadas")
        results = {}
        variables = {**workflow.get("variables", {}), **(inputs or {})}

        def resolve(value):
            if isinstance(value, dict):
                if value.get("source") == "action":
                    try:
                        result = results[value["actionId"]]
                        for part in value["path"].split("."):
                            result = result[int(part)] if isinstance(result, list) else result[part]
                        kind = value.get("valueType", "text")
                        return str(result) if kind == "text" else float(Decimal(str(result)))
                    except (KeyError, IndexError, TypeError, ValueError, ArithmeticError) as error:
                        raise ValueError("Resultado de ação indisponível ou incompatível") from error
                return {k: resolve(v) for k, v in value.items()}
            if isinstance(value, list):
                return [resolve(v) for v in value]
            if isinstance(value, str):
                def variable(match):
                    key = match.group(1).strip()
                    if key not in variables:
                        raise ValueError(f"Variável inexistente: {key}")
                    return str(variables[key])
                return re.sub(r"\{\{\s*(.*?)\s*\}\}", variable, value)
            return value

        def child(target, params=None):
            if not self.load_workflow:
                raise ValueError("Repositório de sub-rotinas não configurado")
            return self.run(self.load_workflow(target), params, stack)

        for node_id in order:
            node = nodes[node_id]
            if not node.get("enabled", True):
                continue
            config = resolve(node.get("config", {}))
            action = node["type"]
            if action == "flow.value":
                result = {"value": config["value"]}
            elif action == "flow.loop":
                times = config["times"]
                if isinstance(times, bool) or not isinstance(times, (int, float)) or times < 0 or int(times) != times:
                    raise ValueError("Repetições devem ser um inteiro não negativo")
                last = None
                for index in range(int(times)):
                    last = child(config["subroutine_id"], {"index": index})
                result = {"iterations": int(times), "last": last}
            elif action == "flow.decision":
                left, right = config["left"], config["right"]
                operators = {"equals": lambda: left == right, "not_equals": lambda: left != right, "greater": lambda: left > right, "less": lambda: left < right, "contains": lambda: right in left}
                matched = operators[config["operator"]]()
                target = config.get("then_subroutine_id" if matched else "else_subroutine_id")
                result = {"matched": matched, "result": child(target) if target else None}
            elif action == "flow.subroutine":
                result = child(config["subroutine_id"], config.get("inputs"))
            else:
                result = self.driver.execute(action, config, node_id)
            results[node_id] = result
            for key, variable_name in node.get("outputs", {}).items():
                if key in result:
                    variables[variable_name] = result[key]
        return results
