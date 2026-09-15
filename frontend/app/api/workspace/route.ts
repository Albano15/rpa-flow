import { NextResponse } from "next/server";
import { mkdir, writeFile, rename, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { actionTypes } from "../../../src/types/workflow";
const schema = z.object({
  workflow: z
    .object({
      id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
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
    .passthrough(),
  assets: z.record(z.string(), z.string()),
});
const directory = path.join(process.cwd(), "../database/workspaces");
export async function POST(request: Request) {
  const result = schema.safeParse(await request.json().catch(() => null));
  if (
    !result.success ||
    result.data.workflow.nodes.some(
      (n) =>
        n.type === "action" &&
        !actionTypes.includes(n.data.action as (typeof actionTypes)[number]),
    )
  )
    return NextResponse.json({ error: "Workspace inválido" }, { status: 400 });
  try {
    await mkdir(directory, { recursive: true });
    const dest = path.join(directory, result.data.workflow.id + ".json");
    const temp = dest + "." + crypto.randomUUID() + ".tmp";
    await writeFile(temp, JSON.stringify(result.data, null, 2));
    await rename(temp, dest);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  }
}
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[a-zA-Z0-9_-]+$/.test(id))
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    return NextResponse.json(
      JSON.parse(await readFile(path.join(directory, id + ".json"), "utf8")),
    );
  } catch {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
}
