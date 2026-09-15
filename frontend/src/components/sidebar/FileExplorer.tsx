import { useState } from "react";
import {
  Folder,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  FileCode2,
  Plus,
  Copy,
  Trash2,
  Pencil,
  Search,
  Workflow,
} from "lucide-react";
import { useWorkflowStore } from "../../stores/useWorkflowStore";
import { uid } from "../../types/workflow";
import { ActionList } from "./ActionPalette";
import { Modal } from "../modals/Dialog";
export function FileExplorer() {
  const s = useWorkflowStore();
  const [tab, setTab] = useState("files");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [naming, setNaming] = useState<{
    id: string;
    folder: boolean;
    create: boolean;
    value: string;
  } | null>(null);
  const rename = (id: string, folder = false) =>
    setNaming({
      id,
      folder,
      create: false,
      value:
        (folder
          ? s.folders.find((f) => f.id === id)?.name
          : s.workflows.find((w) => w.id === id)?.name) ?? "",
    });
  const addFolder = (parentId: string) =>
    setNaming({ id: parentId, folder: true, create: true, value: "" });
  const saveName = () => {
    if (!naming?.value.trim()) return;
    const { id, folder, create, value } = naming;
    const name = value.trim();
    useWorkflowStore.setState((state) =>
      create
        ? {
            folders: [
              ...state.folders,
              { id: uid("folder"), parentId: id, name },
            ],
          }
        : folder
          ? {
              folders: state.folders.map((f) =>
                f.id === id ? { ...f, name } : f,
              ),
            }
          : {
              workflows: state.workflows.map((w) =>
                w.id === id ? { ...w, name } : w,
              ),
            },
    );
    setNaming(null);
  };
  const tree = (id: string, depth = 0): React.ReactNode => {
    const folder = s.folders.find((f) => f.id === id);
    if (!folder) return null;
    const closed = collapsed.includes(id);
    return (
      <div key={id}>
        <div
          className="tree-folder"
          style={{ paddingLeft: 12 + depth * 13 }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const file = e.dataTransfer.getData("application/rpa-file");
            useWorkflowStore.setState({
              workflows: s.workflows.map((w) =>
                w.id === file ? { ...w, folderId: id } : w,
              ),
            });
          }}
        >
          <button
            onClick={() =>
              setCollapsed(
                closed ? collapsed.filter((c) => c !== id) : [...collapsed, id],
              )
            }
          >
            {closed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            <Folder size={15} />
            <span>{folder.name}</span>
          </button>
          <div className="row-tools">
            <button
              title="Nova automação nesta pasta"
              onClick={() => s.createFile("workflow", id)}
            >
              <Plus size={13} />
            </button>
            <button title="Nova subpasta" onClick={() => addFolder(id)}>
              <FolderPlus size={13} />
            </button>
            {id !== "root" && (
              <>
                <button title="Renomear pasta" onClick={() => rename(id, true)}>
                  <Pencil size={12} />
                </button>
                <button
                  title="Excluir pasta vazia"
                  onClick={() => {
                    if (
                      s.folders.some((f) => f.parentId === id) ||
                      s.workflows.some((w) => w.folderId === id)
                    ) {
                      useWorkflowStore.setState({
                        notice:
                          "Mova os arquivos e subpastas antes de excluir a pasta.",
                      });
                      return;
                    }
                    useWorkflowStore.setState({
                      folders: s.folders.filter((f) => f.id !== id),
                    });
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>
        {!closed && (
          <>
            {s.folders
              .filter((f) => f.parentId === id)
              .map((f) => tree(f.id, depth + 1))}
            {s.workflows
              .filter(
                (w) =>
                  w.folderId === id &&
                  w.name.toLowerCase().includes(query.toLowerCase()),
              )
              .map((w) => (
                <div
                  key={w.id}
                  className={`tree-file ${s.activeId === w.id ? "active" : ""}`}
                  style={{ paddingLeft: 24 + depth * 13 }}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("application/rpa-file", w.id)
                  }
                >
                  <button className="file-name" onClick={() => s.open(w.id)}>
                    {w.kind === "workflow" ? (
                      <FileCode2 size={15} />
                    ) : (
                      <Workflow size={15} />
                    )}
                    <span>
                      {w.name}
                      <small>
                        {w.kind === "workflow" ? ".rpa.json" : ".sub.json"}
                      </small>
                    </span>
                  </button>
                  <div className="row-tools">
                    <button title="Renomear" onClick={() => rename(w.id)}>
                      <Pencil size={12} />
                    </button>
                    <button
                      title="Duplicar"
                      onClick={() => {
                        const copy = structuredClone(w);
                        copy.id = uid(w.kind === "workflow" ? "wf" : "sub");
                        copy.name += " (cópia)";
                        useWorkflowStore.setState({
                          workflows: [...s.workflows, copy],
                        });
                        s.open(copy.id);
                      }}
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      title="Excluir arquivo"
                      onClick={() => {
                        if (confirm(`Excluir “${w.name}”?`)) s.deleteFile(w.id);
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    );
  };
  return (
    <aside className="explorer">
      <div className="workspace-label">
        <span className="workspace-avatar">F</span>
        <div>
          <strong>Workspace Financeiro</strong>
          <small>Ambiente de desenvolvimento</small>
        </div>
      </div>
      <div className="sidebar-tabs">
        <button
          className={tab === "files" ? "active" : ""}
          onClick={() => setTab("files")}
        >
          Explorador
        </button>
        <button
          className={tab === "actions" ? "active" : ""}
          onClick={() => setTab("actions")}
        >
          Ações <span>9</span>
        </button>
      </div>
      <div className="search">
        <Search size={15} />
        <input
          aria-label="Buscar"
          placeholder={tab === "files" ? "Buscar automações…" : "Buscar ações…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {tab === "files" ? (
        <>
          <div className="section-caption">
            AUTOMAÇÕES
            <button title="Nova pasta" onClick={() => addFolder("root")}>
              <FolderPlus size={15} />
            </button>
          </div>
          <div className="tree">{tree("root")}</div>
          <div className="create-buttons">
            <button onClick={() => s.createFile("workflow")}>
              <Plus size={15} /> Nova automação
            </button>
            <button onClick={() => s.createFile("subroutine")}>
              <Workflow size={15} /> Nova sub-rotina
            </button>
          </div>
        </>
      ) : (
        <ActionList query={query} />
      )}
      <div className="sidebar-tip">
        <span className="tip-icon">⌘</span>
        <strong>Seu próximo passo, a um atalho.</strong>
        <p>
          Use <kbd>Ctrl K</kbd> para adicionar ações ou arraste-as para o
          canvas.
        </p>
      </div>
      <div className="workspace-footer">
        <span className="ready-dot" /> Armazenamento local <span>v1.0</span>
      </div>
      <Modal
        open={!!naming}
        onClose={() => setNaming(null)}
        title={naming?.create ? "Nova pasta" : "Renomear"}
        description="Escolha um nome para organizar seu workspace."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveName();
          }}
        >
          <label className="field">
            Nome
            <input
              autoFocus
              value={naming?.value ?? ""}
              onChange={(e) =>
                setNaming(naming ? { ...naming, value: e.target.value } : null)
              }
            />
          </label>
          <button
            className="primary"
            type="submit"
            disabled={!naming?.value.trim()}
          >
            Salvar nome
          </button>
        </form>
      </Modal>
    </aside>
  );
}
