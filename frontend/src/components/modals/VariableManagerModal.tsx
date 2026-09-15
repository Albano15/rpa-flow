import { Modal } from "./Dialog";
import { JsonField } from "../sidebar/NodeProperties";
import {
  activeWorkflow,
  useWorkflowStore,
} from "../../stores/useWorkflowStore";
export function VariableManagerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const w = useWorkflowStore(activeWorkflow);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Variáveis e contexto"
      description="Defina as entradas globais disponíveis para interpolação nos campos."
    >
      <JsonField
        key={w.id + String(open)}
        label="Variáveis globais (JSON)"
        value={w.variables}
        onChange={(v) =>
          useWorkflowStore.getState().edit((w) => {
            w.variables = v as Record<string, unknown>;
          })
        }
      />
      <h4 className="mt-5">Saídas disponíveis em runtime</h4>
      {w.nodes
        .filter((n) => n.type === "action" && n.data.outputs)
        .map((n) => (
          <div className="runtime-row" key={n.id}>
            <strong>{n.data.customLabel}</strong>
            <code>
              {n.type === "action" &&
                Object.values(n.data.outputs ?? {}).join(", ")}
            </code>
          </div>
        ))}
      <button className="primary mt-5" onClick={onClose}>
        Concluir
      </button>
    </Modal>
  );
}
