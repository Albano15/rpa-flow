import { expect, it } from "vitest";
import { createNode, createWorkflow, type FlowNode } from "../types/workflow";
import { END_ID, linearDiagram, sequenceEdges, START_ID } from "./linearLayout";
it("centra ações e marcadores e conecta uma sub-rotina até o fim", () => {
  const w = createWorkflow("Teste");
  w.nodes = [
    createNode("desktop.wait_delay", { x: 800, y: 90 }),
    createNode("flow.subroutine", { x: -50, y: 0 }),
  ];
  sequenceEdges(
    w,
    w.nodes.map((n) => n.id),
  );
  const diagram = linearDiagram(w);
  expect(diagram.edges.map((e) => [e.source, e.target])).toEqual([
    [START_ID, w.nodes[0].id],
    [w.nodes[0].id, w.nodes[1].id],
    [w.nodes[1].id, END_ID],
  ]);
  const centers = diagram.nodes.map(
    (n) => n.position.x + (n.type === "terminal" ? 32 : 145),
  );
  expect(new Set(centers).size).toBe(1);
  expect(diagram.nodes.every((n) => n.draggable === false)).toBe(true);
});
it("dimensiona seções aninhadas e reduz o fluxo ao recolher", () => {
  const w = createWorkflow("Teste");
  const scope = (id: string, parentId?: string): FlowNode => ({
    id,
    parentId,
    type: "scope",
    position: { x: 0, y: 0 },
    data: { customLabel: id, color: "#6366f1", collapsed: false },
  });
  const a = createNode("desktop.wait_delay", { x: 0, y: 0 });
  a.parentId = "inner";
  a.measured = { width: 290, height: 240 };
  w.nodes = [
    scope("outer"),
    scope("inner", "outer"),
    a,
    createNode("flow.subroutine", { x: 0, y: 0 }),
  ];
  sequenceEdges(w, [a.id, w.nodes[3].id]);
  const expanded = linearDiagram(w);
  const outer = expanded.nodes.find((n) => n.id === "outer")!,
    inner = expanded.nodes.find((n) => n.id === "inner")!;
  expect(Number(outer.style?.height)).toBeGreaterThan(
    Number(inner.style?.height),
  );
  expect(Number(inner.style?.height)).toBeGreaterThan(240);
  const node = w.nodes[0];
  if (node.type === "scope") node.data.collapsed = true;
  const collapsed = linearDiagram(w);
  expect(collapsed.nodes.find((n) => n.id === a.id)?.hidden).toBe(true);
  expect(collapsed.nodes.at(-1)!.position.y).toBeLessThan(
    expanded.nodes.at(-1)!.position.y,
  );
  expect(collapsed.edges.map((e) => [e.source, e.target])).toEqual([
    [START_ID, "outer"],
    ["outer", w.nodes[3].id],
    [w.nodes[3].id, END_ID],
  ]);
});
it("um fluxo vazio conecta início ao fim e permite inserir", () => {
  const d = linearDiagram(createWorkflow("Vazio"));
  expect(d.nodes).toHaveLength(2);
  expect(d.edges[0]).toMatchObject({
    source: START_ID,
    target: END_ID,
    data: { insertion: {} },
  });
});
