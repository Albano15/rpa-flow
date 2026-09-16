"""Pure domain model for the sequential AST, including empty editor drafts."""
from dataclasses import dataclass
import re


@dataclass(frozen=True)
class Step:
    id: str
    action: str
    config: dict
    enabled: bool
    next_id: str | None


@dataclass(frozen=True)
class Workflow:
    id: str
    steps: tuple[Step, ...]

    @classmethod
    def from_ast(cls, ast):
        identifier = ast.get('workflow_id', '')
        if not isinstance(identifier, str) or not re.fullmatch(r'[a-zA-Z0-9_-]+', identifier):
            raise ValueError('ID do fluxo inválido')
        steps = tuple(Step(n['id'], n['type'], n.get('config', {}), n.get('enabled', True), n.get('next_node_id')) for n in ast['nodes'])
        ids = {step.id for step in steps}
        if len(ids) != len(steps):
            raise ValueError('IDs de ações duplicados')
        incoming = [step.next_id for step in steps if step.next_id is not None]
        if any(target not in ids for target in incoming) or len(incoming) != len(set(incoming)):
            raise ValueError('Conexão inválida ou ramificação')
        if steps:
            roots = ids - set(incoming)
            if len(roots) != 1:
                raise ValueError('O fluxo deve ser uma sequência sem ciclos')
            by_id = {step.id: step for step in steps}
            seen, cursor = set(), next(iter(roots))
            while cursor is not None:
                if cursor in seen:
                    raise ValueError('Ciclo no fluxo')
                seen.add(cursor)
                cursor = by_id[cursor].next_id
            if seen != ids:
                raise ValueError('Ações desconectadas')
        return cls(identifier, steps)
