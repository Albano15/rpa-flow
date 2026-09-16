import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import { actionTypes } from "../../../src/types/workflow";

export const runtime = "nodejs";
const workflowSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
    kind: z.enum(["workflow", "subroutine"]),
    name: z.string(),
    nodes: z.array(
      z
        .object({
          id: z.string(),
          type: z.enum(["scope", "action"]),
          position: z.object({ x: z.number(), y: z.number() }),
          data: z.record(z.string(), z.unknown()),
        })
        .passthrough(),
    ),
    edges: z.array(
      z
        .object({ id: z.string(), source: z.string(), target: z.string() })
        .passthrough(),
    ),
  })
  .passthrough();
const schema = z
  .object({
    activeId: z.string().optional(),
    workflow: workflowSchema.optional(),
    workflows: z.array(workflowSchema).optional(),
    assets: z.record(z.string(), z.string()),
    folders: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            parentId: z.string().nullable(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .refine((value) => value.workflow || value.workflows, "Informe os fluxos");

function backend(
  operation: string,
  payload?: unknown,
  id?: string,
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const args = ["-m", "backend.workspace_api", operation];
    if (id) args.push("--id", id);
    if (process.env.RPA_DATABASE_DIR)
      args.push("--database", process.env.RPA_DATABASE_DIR);
    const child = spawn(process.env.RPA_PYTHON ?? "python3", args, {
      cwd: path.resolve(process.cwd(), ".."),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Tempo limite do backend"));
    }, 15000);
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", () => {});
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        resolve({
          status: code === 0 ? 200 : code === 2 ? 400 : code === 3 ? 404 : 500,
          data: JSON.parse(output),
        });
      } catch {
        reject(new Error("Resposta inválida do backend"));
      }
    });
    child.stdin.on("error", () => {});
    child.stdin.end(payload === undefined ? "" : JSON.stringify(payload));
  });
}
export async function POST(request: Request) {
  const result = schema.safeParse(await request.json().catch(() => null));
  if (!result.success)
    return NextResponse.json({ error: "Workspace inválido" }, { status: 400 });
  const workflows = result.data.workflows ?? [result.data.workflow!];
  if (
    workflows.some((w) =>
      w.nodes.some(
        (n) =>
          n.type === "action" &&
          !actionTypes.includes(n.data.action as (typeof actionTypes)[number]),
      ),
    )
  ) {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }
  try {
    const response = await backend("save", result.data);
    return NextResponse.json(response.data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Falha ao acessar o backend Python" },
      { status: 500 },
    );
  }
}
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (id !== null && !/^[a-zA-Z0-9_-]+$/.test(id))
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const response = await backend(
      id ? "get" : "list",
      undefined,
      id ?? undefined,
    );
    return NextResponse.json(response.data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Falha ao acessar o backend Python" },
      { status: 500 },
    );
  }
}
