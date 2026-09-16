import { beforeEach, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
import { spawn } from "node:child_process";
import { POST, GET } from "../../app/api/workspace/route";
import { createWorkflow, createNode } from "./workflow";
let written: string;
function processResponse(code = 0, response: unknown = { success: true }) {
  const child = Object.assign(new EventEmitter(), {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    stdin: Object.assign(new EventEmitter(), {
      end: vi.fn((value: string) => {
        written = value;
        queueMicrotask(() => {
          child.stdout.emit("data", JSON.stringify(response));
          child.emit("close", code);
        });
      }),
    }),
    kill: vi.fn(),
  });
  vi.mocked(spawn).mockReturnValue(
    child as unknown as ReturnType<typeof spawn>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  processResponse();
});
it("envia rascunhos incompletos e dados visuais ao backend Python", async () => {
  const workflow = createWorkflow("Rascunho");
  workflow.nodes = [createNode("http.request", { x: 42, y: 70 })];
  const response = await POST(
    new Request("http://localhost/api/workspace", {
      method: "POST",
      body: JSON.stringify({ workflow, assets: {} }),
    }),
  );
  expect(response.status).toBe(200);
  expect(spawn).toHaveBeenCalledWith(
    expect.any(String),
    ["-m", "backend.workspace_api", "save"],
    expect.objectContaining({ stdio: ["pipe", "pipe", "pipe"] }),
  );
  expect(JSON.parse(written).workflow.nodes[0].position).toEqual({
    x: 42,
    y: 70,
  });
});
it("recusa caminhos e ações inválidos sem iniciar o backend", async () => {
  const workflow = { ...createWorkflow("Inválido"), id: "../../escape" };
  expect(
    (
      await POST(
        new Request("http://localhost/api/workspace", {
          method: "POST",
          body: JSON.stringify({ workflow, assets: {} }),
        }),
      )
    ).status,
  ).toBe(400);
  expect(spawn).not.toHaveBeenCalled();
});
it("propaga falhas de persistência ao cliente", async () => {
  processResponse(1, { error: "Falha de persistência" });
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
it("carrega a lista de fluxos do backend", async () => {
  const workflows = [createWorkflow("Persistido")];
  processResponse(0, { workflows, assets: {}, folders: [] });
  const response = await GET(new Request("http://localhost/api/workspace"));
  expect((await response.json()).workflows).toEqual(workflows);
});
