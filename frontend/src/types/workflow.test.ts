import { describe, expect, it } from "vitest";
import { createWorkflow, createNode, exportWorkflow } from "./workflow";
describe("contrato AST", () => {
  it("preserva ações inativas, ordena por conexões e exclui estado visual", () => {
    const w = createWorkflow("Teste");
    const a = createNode("desktop.wait_delay", { x: 0, y: 0 });
    const b = createNode("desktop.press_key", { x: 0, y: 200 });
    a.data.enabled = false;
    w.nodes = [b, a];
    w.edges = [{ id: "ab", source: a.id, target: b.id }];
    const ast = exportWorkflow(w);
    expect(ast.nodes.map((n) => n.id)).toEqual([a.id, b.id]);
    expect(ast.nodes[0].enabled).toBe(false);
    expect(ast.nodes[0].next_node_id).toBe(b.id);
    expect(ast.nodes[1].next_node_id).toBeNull();
    expect(ast.nodes[0]).not.toHaveProperty("position");
    expect(JSON.stringify(exportWorkflow(w))).toBe(JSON.stringify(ast));
  });
  it("rejeita ramificação e grafos desconectados", () => {
    const w = createWorkflow("Teste");
    w.nodes = [0, 1, 2].map((y) =>
      createNode("desktop.wait_delay", { x: 0, y }),
    );
    expect(() => exportWorkflow(w)).toThrow(/conectad/);
    w.edges = [1, 2].map((i) => ({
      id: String(i),
      source: w.nodes[0].id,
      target: w.nodes[i].id,
    }));
    expect(() => exportWorkflow(w)).toThrow(/ramifica/);
  });
  it("rejeita parâmetros obrigatórios e ciclos", () => {
    const w = createWorkflow("Teste");
    w.nodes = [createNode("desktop.open_app", { x: 0, y: 0 })];
    expect(() => exportWorkflow(w)).toThrow(/executável/);
    w.nodes[0] = createNode("desktop.wait_delay", { x: 0, y: 0 });
    w.edges = [{ id: "loop", source: w.nodes[0].id, target: w.nodes[0].id }];
    expect(() => exportWorkflow(w)).toThrow(/ciclo/);
  });
});
