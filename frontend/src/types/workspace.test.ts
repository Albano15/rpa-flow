import { beforeEach, expect, it, vi } from "vitest";
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  readFile: vi.fn(),
}));
import { mkdir, writeFile, rename } from "node:fs/promises";
import { POST } from "../../app/api/workspace/route";
import { createWorkflow, createNode } from "./workflow";
beforeEach(() => vi.clearAllMocks());
it("persiste rascunhos incompletos atomicamente, incluindo posições", async () => {
  const workflow = createWorkflow("Rascunho");
  workflow.nodes = [createNode("http.request", { x: 42, y: 70 })];
  const response = await POST(
    new Request("http://localhost/api/workspace", {
      method: "POST",
      body: JSON.stringify({ workflow, assets: {} }),
    }),
  );
  expect(response.status).toBe(200);
  expect(mkdir).toHaveBeenCalled();
  expect(rename).toHaveBeenCalled();
  expect(
    JSON.parse(vi.mocked(writeFile).mock.calls[0][1] as string).workflow
      .nodes[0].position,
  ).toEqual({ x: 42, y: 70 });
});
it("recusa caminhos e ações inválidos sem escrever", async () => {
  const workflow = { ...createWorkflow("Inválido"), id: "../../escape" };
  const response = await POST(
    new Request("http://localhost/api/workspace", {
      method: "POST",
      body: JSON.stringify({ workflow, assets: {} }),
    }),
  );
  expect(response.status).toBe(400);
  expect(writeFile).not.toHaveBeenCalled();
});
it("propaga falhas de persistência ao cliente", async () => {
  vi.mocked(writeFile).mockRejectedValueOnce(new Error("disk full"));
  const response = await POST(
    new Request("http://localhost/api/workspace", {
      method: "POST",
      body: JSON.stringify({
        workflow: createWorkflow("Rascunho"),
        assets: {},
      }),
    }),
  );
  expect(response.status).toBe(500);
});
