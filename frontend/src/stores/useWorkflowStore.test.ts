import { beforeEach, describe, expect, it } from "vitest";
import {
  activeWorkflow,
  beginDrag,
  endDrag,
  useWorkflowStore as store,
} from "./useWorkflowStore";
import {
  createNode,
  createWorkflow,
  exportWorkflow,
  importWorkflow,
} from "../types/workflow";
beforeEach(() => {
  const w = createWorkflow("Teste");
  w.nodes = [
    createNode("desktop.wait_delay", { x: 0, y: 0 }),
    createNode("desktop.press_key", { x: 0, y: 240 }),
  ];
  w.edges = [
    { id: "ab", source: w.nodes[0].id, target: w.nodes[1].id, type: "insert" },
  ];
  store.setState({
    workflows: [w],
    activeId: w.id,
    tabs: [w.id],
    palette: null,
  });
  store.temporal.getState().clear();
});
describe("operações atômicas do editor", () => {
  it("insere entre etapas e desfaz/refaz a transação inteira", () => {
    store.setState({ palette: { edgeId: "ab" } });
    store.getState().add("desktop.wait_delay");
    let w = activeWorkflow(store.getState());
    expect(w.nodes).toHaveLength(3);
    expect(w.edges).toHaveLength(2);
    expect(new Set(w.nodes.map((n) => n.position.y)).size).toBe(3);
    expect(exportWorkflow(w).nodes[1].id).toBe(w.nodes[2].id);
    store.temporal.getState().undo();
    w = activeWorkflow(store.getState());
    expect(w.nodes).toHaveLength(2);
    expect(w.edges[0].id).toBe("ab");
    store.temporal.getState().redo();
    expect(activeWorkflow(store.getState()).nodes).toHaveLength(3);
  });
  it("agrupa sem alterar a ordem de execução e preserva seções no roundtrip", () => {
    store.getState().edit((w) =>
      w.nodes.forEach((n) => {
        n.selected = true;
      }),
    );
    store.getState().group();
    const w = activeWorkflow(store.getState());
    expect(w.nodes[0].type).toBe("scope");
    const ast = exportWorkflow(w);
    expect(ast.sections[0].node_ids).toHaveLength(2);
    expect(exportWorkflow(importWorkflow(ast))).toEqual(ast);
  });
  it("bloqueia ciclos ao conectar", () => {
    const w = activeWorkflow(store.getState());
    const [a, b] = w.nodes;
    store.getState().connect({
      source: b.id,
      target: a.id,
      sourceHandle: null,
      targetHandle: null,
    });
    expect(activeWorkflow(store.getState()).edges).toHaveLength(1);
  });
  it("limpa conexões ao excluir e permite desfazer", () => {
    store.getState().edit((w) => {
      w.nodes[0].selected = true;
    });
    store.getState().remove();
    expect(activeWorkflow(store.getState()).edges).toHaveLength(0);
    store.temporal.getState().undo();
    expect(activeWorkflow(store.getState()).edges).toHaveLength(1);
  });
});

it("restaura o arquivo ativo ao desfazer a criação e agrupa arrastes", () => {
  const original = store.getState().activeId;
  store.getState().createFile("subroutine");
  store.temporal.getState().undo();
  expect(store.getState().activeId).toBe(original);
  const id = activeWorkflow(store.getState()).nodes[0].id;
  beginDrag();
  store
    .getState()
    .nodesChanged([
      { type: "position", id, position: { x: 20, y: 20 }, dragging: true },
    ]);
  store
    .getState()
    .nodesChanged([
      { type: "position", id, position: { x: 80, y: 90 }, dragging: false },
    ]);
  endDrag();
  store.temporal.getState().undo();
  expect(activeWorkflow(store.getState()).nodes[0].position).toEqual({
    x: 0,
    y: 0,
  });
});

it("seleção não muda os metadados exportados e agrupamento inválido orienta o usuário", () => {
  const w = activeWorkflow(store.getState());
  const before = exportWorkflow(w);
  store
    .getState()
    .nodesChanged([{ type: "select", id: w.nodes[0].id, selected: true }]);
  expect(exportWorkflow(activeWorkflow(store.getState()))).toEqual(before);
  store.getState().group();
  expect(store.getState().notice).toContain("Selecione ao menos duas");
});

it("reconecta uma ou várias etapas removidas e desfaz atomicamente", () => {
  store.getState().add("desktop.wait_delay");
  store.getState().add("desktop.wait_delay");
  const before = activeWorkflow(store.getState());
  const [a, b, c, d] = before.nodes;
  store.getState().nodesChanged([
    { type: "remove", id: b.id },
    { type: "remove", id: c.id },
  ]);
  expect(activeWorkflow(store.getState()).edges).toMatchObject([
    { source: a.id, target: d.id },
  ]);
  store.temporal.getState().undo();
  expect(activeWorkflow(store.getState()).edges).toEqual(before.edges);
});

it("aninha seções, impede ciclos e preserva filhos ao excluir o contêiner", () => {
  store.getState().addScope({ x: 400, y: 0 });
  const outer = activeWorkflow(store.getState()).nodes.at(-1)!;
  store.getState().addScope({ x: 440, y: 70 });
  const inner = activeWorkflow(store.getState()).nodes.at(-1)!;
  store.getState().moveIntoScope(inner.id);
  expect(
    activeWorkflow(store.getState()).nodes.find((n) => n.id === inner.id)
      ?.parentId,
  ).toBe(outer.id);
  store.getState().moveIntoScope(outer.id);
  expect(
    activeWorkflow(store.getState()).nodes.find((n) => n.id === outer.id)
      ?.parentId,
  ).toBeUndefined();
  const ast = exportWorkflow(activeWorkflow(store.getState()));
  expect(exportWorkflow(importWorkflow(ast))).toEqual(ast);
  store.getState().nodesChanged([{ type: "remove", id: outer.id }]);
  expect(
    activeWorkflow(store.getState()).nodes.find((n) => n.id === inner.id)
      ?.parentId,
  ).toBeUndefined();
});
