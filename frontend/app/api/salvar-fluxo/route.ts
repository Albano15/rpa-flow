import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { astSchema, importWorkflow } from "../../../src/types/workflow";

// Compatibilidade com clientes que salvam no host; o Studio exporta por download.
export async function POST(request: Request) {
  let data;
  try {
    data = astSchema.parse(await request.json());
    importWorkflow(data); // Verifica a sequência e os parâmetros antes de persistir.
    if (!/^[a-zA-Z0-9_-]+$/.test(data.workflow_id))
      throw new Error("workflow_id inválido");
  } catch {
    return NextResponse.json(
      { success: false, error: "Contrato AST inválido." },
      { status: 400 },
    );
  }
  try {
    const directory = path.join(process.cwd(), "../database/workflows");
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, `${data.workflow_id}.rpa.json`),
      JSON.stringify(data, null, 2),
      "utf8",
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Não foi possível salvar o fluxo." },
      { status: 500 },
    );
  }
}
