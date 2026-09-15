import { useState } from "react";
import { Modal } from "./Dialog";
import {
  activeWorkflow,
  useWorkflowStore,
} from "../../stores/useWorkflowStore";
export function ValueField({
  label,
  value,
  nodeId,
  onChange,
}: {
  label: string;
  value: unknown;
  nodeId: string;
  onChange: (v: unknown) => void;
}) {
  const w = useWorkflowStore(activeWorkflow);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("literal");
  const [kind, setKind] = useState("text");
  const [literal, setLiteral] = useState("");
  const [actionId, setActionId] = useState("");
  const [path, setPath] = useState("body");
  const previous = new Set<string>();
  let cursor = w.edges.find((e) => e.target === nodeId)?.source;
  while (cursor && !previous.has(cursor)) {
    previous.add(cursor);
    cursor = w.edges.find((e) => e.target === cursor)?.source;
  }
  const actions = w.nodes.filter(
    (n) => n.type === "action" && previous.has(n.id),
  );
  const ref =
    value && typeof value === "object"
      ? (value as Record<string, string>)
      : null;
  const number = Number(
    literal
      .replace(/\s|R\$/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", "."),
  );
  return (
    <div className="field">
      <span>{label}</span>
      <button
        className="capture-button"
        onClick={() => {
          setSource(ref ? "action" : "literal");
          setKind(
            ref?.valueType ?? (typeof value === "number" ? "number" : "text"),
          );
          setLiteral(ref ? "" : String(value ?? ""));
          setActionId(ref?.actionId ?? "");
          setPath(ref?.path ?? "body");
          setOpen(true);
        }}
      >
        {ref
          ? `${w.nodes.find((n) => n.id === ref.actionId)?.data.customLabel ?? ref.actionId} → ${ref.path}`
          : String(value ?? "") || "Definir valor…"}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Definir ${label}`}
        description="Informe um valor ou escolha o retorno de uma etapa anterior."
      >
        <label className="field">
          Origem
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="literal">Digitar valor</option>
            <option value="action">Resultado de outra ação</option>
          </select>
        </label>
        <label className="field">
          Tipo
          <select aria-label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="text">Texto</option>
            <option value="number">Numérico</option>
            <option value="money">Monetário</option>
          </select>
        </label>
        {source === "literal" ? (
          <label className="field">
            Valor
            <input
              value={literal}
              onChange={(e) => setLiteral(e.target.value)}
              placeholder={kind === "money" ? "1.234,56" : ""}
            />
          </label>
        ) : (
          <>
            <label className="field">
              Ação
              <select
                value={actionId}
                onChange={(e) => setActionId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {actions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.data.customLabel}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Campo do resultado
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="body.clientes.0.nome"
              />
              <small>
                API: body, status, headers · Valor: value · OCR: extracted_text
              </small>
            </label>
          </>
        )}
        <button
          className="primary"
          disabled={
            source === "action"
              ? !actionId || !path.trim()
              : kind !== "text" && (!literal.trim() || !Number.isFinite(number))
          }
          onClick={() => {
            onChange(
              source === "action"
                ? {
                    source: "action",
                    actionId,
                    path: path.trim(),
                    valueType: kind,
                  }
                : kind === "text"
                  ? literal
                  : number,
            );
            setOpen(false);
          }}
        >
          Usar valor
        </button>
      </Modal>
    </div>
  );
}
