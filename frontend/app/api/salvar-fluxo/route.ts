import { NextResponse } from "next/server";
import { astSchema, importWorkflow } from "../../../src/types/workflow";
import { GET, POST as saveWorkspace } from "../workspace/route";

// Clientes de AST usam a mesma persistência Python do Studio.
export async function POST(request: Request) {
  let workflow;
  try {
    workflow = importWorkflow(astSchema.parse(await request.json()));
    if (!/^[a-zA-Z0-9_-]+$/.test(workflow.id)) throw new Error("ID inválido");
  } catch {
    return NextResponse.json(
      { success: false, error: "Contrato AST inválido." },
      { status: 400 },
    );
  }
  const response = await GET(
    new Request(new URL("/api/workspace", request.url)),
  );
  if (!response.ok) return response;
  const workspace = await response.json();
  return saveWorkspace(
    new Request(request.url, {
      method: "POST",
      body: JSON.stringify({
        workflows: [
          ...workspace.workflows.filter(
            (w: { id: string }) => w.id !== workflow.id,
          ),
          workflow,
        ],
        assets: workspace.assets,
        folders: workspace.folders,
      }),
    }),
  );
}
