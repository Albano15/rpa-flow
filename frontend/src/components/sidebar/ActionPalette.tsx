import { useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import { Modal } from "../modals/Dialog";
import { actionTypes, catalog } from "../../types/workflow";
import { useWorkflowStore } from "../../stores/useWorkflowStore";
import { ActionIcon } from "../canvas/CustomNodes";
export function ActionList({ query = "" }: { query?: string }) {
  const add = useWorkflowStore((s) => s.add);
  const filtered = actionTypes.filter((t) =>
    (catalog[t].label + t)
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  return (
    <div className="action-list">
      {filtered.map((t) => (
        <button
          key={t}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/rpa-action", t);
            e.dataTransfer.effectAllowed = "copy";
          }}
          onClick={() => add(t)}
        >
          <span className="catalog-icon" style={{ color: catalog[t].color }}>
            <ActionIcon action={t} />
          </span>
          <span>
            <strong>{catalog[t].label}</strong>
            <small>{catalog[t].description}</small>
          </span>
          <ArrowUpRight size={13} />
        </button>
      ))}
      {!filtered.length && <p className="empty">Nenhuma ação encontrada.</p>}
    </div>
  );
}
export function ActionPalette() {
  const palette = useWorkflowStore((s) => s.palette);
  const [query, setQuery] = useState("");
  return (
    <Modal
      open={palette !== null}
      onClose={() => useWorkflowStore.setState({ palette: null })}
      title="Adicionar uma etapa"
      description="Escolha uma ação. As conexões são refeitas ao inserir entre etapas."
    >
      <div className="search">
        <Search size={16} />
        <input
          autoFocus
          placeholder="Buscar ação…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd>Esc</kbd>
      </div>
      <ActionList query={query} />
    </Modal>
  );
}
