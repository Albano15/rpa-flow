import JSZip from "jszip";
import { exportWorkflow, type Workflow } from "../types/workflow";
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportFiles(
  workflow: Workflow,
  workflows: Workflow[],
  assets: Record<string, string>,
) {
  const ast = exportWorkflow(workflow);
  const related: Workflow[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  function visit(w: Workflow) {
    if (visiting.has(w.id))
      throw new Error("Referência circular entre sub-rotinas.");
    if (visited.has(w.id)) return;
    visiting.add(w.id);
    for (const n of w.nodes) {
      if (
        n.type === "action" &&
        n.data.enabled &&
        n.data.action === "flow.subroutine"
      ) {
        const sub = workflows.find(
          (w) =>
            w.id === n.data.config.subroutine_id && w.kind === "subroutine",
        );
        if (!sub)
          throw new Error(`Sub-rotina não encontrada: ${n.data.customLabel}`);
        visit(sub);
      }
    }
    visiting.delete(w.id);
    visited.add(w.id);
    related.push(w);
  }
  visit(workflow);
  const paths = new Set(
    related.flatMap((w) =>
      w.nodes
        .filter((n) => n.type === "action")
        .map((n) =>
          n.type === "action" ? String(n.data.config.image_asset ?? "") : "",
        )
        .filter(Boolean),
    ),
  );
  for (const p of paths) {
    if (!assets[p])
      throw new Error(
        `Template ausente: ${p}. Capture ou envie a imagem novamente.`,
      );
  }
  const name = `${workflow.name.replace(/[^\p{L}\p{N}_ -]/gu, "_")}.${workflow.kind === "workflow" ? "rpa" : "sub"}.json`;
  if (paths.size || related.length > 1) {
    const zip = new JSZip();
    zip.file(name, JSON.stringify(ast, null, 2));
    for (const sub of related.filter((w) => w.id !== workflow.id))
      zip.file(
        `subroutines/${sub.id}.sub.json`,
        JSON.stringify(exportWorkflow(sub), null, 2),
      );
    for (const p of paths)
      zip.file(p, assets[p].split(",")[1], { base64: true });
    download(await zip.generateAsync({ type: "blob" }), `${workflow.name}.zip`);
  } else
    download(
      new Blob([JSON.stringify(ast, null, 2)], { type: "application/json" }),
      name,
    );
}
