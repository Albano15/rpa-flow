"use client";
import { useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  SelectionMode,
  type Node,
  type Edge,
} from "@xyflow/react";
import {
  Workflow,
  ChevronRight,
  Download,
  Undo2,
  Redo2,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Braces,
  Group,
  LayoutGrid,
  Check,
  Upload,
  MousePointer2,
  X,
  Monitor,
  CheckCircle2,
} from "lucide-react";
import { useStore } from "zustand";
import {
  activeWorkflow,
  isWithin,
  useWorkflowStore,
} from "../../stores/useWorkflowStore";
import {
  actionTypes,
  importWorkflow,
  type ActionType,
  type FlowNode,
  type Workflow as WorkflowDocument,
  type Folder,
} from "../../types/workflow";
import { exportFiles } from "../../lib/files";
import {
  linearDiagram,
  orderedActions,
  sequenceEdges,
} from "../../lib/linearLayout";
import {
  ActionNode,
  GroupNode,
  InsertEdge,
  TerminalNode,
  PlaceholderNode,
} from "./CustomNodes";
import { FileExplorer } from "../sidebar/FileExplorer";
import { NodeProperties } from "../sidebar/NodeProperties";
import { ActionPalette } from "../sidebar/ActionPalette";
import { ScreenSnipModal } from "../modals/ScreenSnipModal";
import { VariableManagerModal } from "../modals/VariableManagerModal";
import "@xyflow/react/dist/style.css";
const nodeTypes = {
  action: ActionNode,
  scope: GroupNode,
  terminal: TerminalNode,
  placeholder: PlaceholderNode,
};
const edgeTypes = { insert: InsertEdge };
const storageKey = "flowbot.workspace.v1";
function Editor() {
  const s = useWorkflowStore();
  const w = useWorkflowStore(activeWorkflow);
  const rf = useReactFlow();
  const [context, setContext] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [autoSave, setAutoSave] = useState(false);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Não sincronizado");
  const [syncedDocument, setSyncedDocument] = useState("");
  const saveQueue = useRef(Promise.resolve());
  const synchronize = (document: WorkflowDocument) => {
    setSyncStatus("Sincronizando…");
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(async () => {
        try {
          const response = await fetch("/api/workspace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workflow: document,
              activeId: document.id,
              workflows: useWorkflowStore.getState().workflows,
              folders: useWorkflowStore.getState().folders,
              assets: useWorkflowStore.getState().assets,
            }),
          });
          if (!response.ok)
            throw new Error("Falha ao sincronizar com o backend");
          setSyncedDocument(JSON.stringify(document));
          setSyncStatus("Sincronizado com backend");
        } catch (error) {
          setSyncStatus(String(error));
        }
      });
  };
  useEffect(() => {
    const timer = setTimeout(
      () => setAutoSave(localStorage.getItem("flowbot.autosave") === "true"),
      0,
    );
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!autoSave || !ready) return;
    const timer = setTimeout(() => synchronize(w), 900);
    return () => clearTimeout(timer);
  }, [autoSave, ready, w, s.workflows]);
  const [sidebar, setSidebar] = useState(true);
  const [variables, setVariables] = useState(false);
  const [saved, setSaved] = useState(true);
  const [zoom, setZoom] = useState(100);
  const fileRef = useRef<HTMLInputElement>(null);
  const past = useStore(useWorkflowStore.temporal, (t) => t.pastStates.length);
  const future = useStore(
    useWorkflowStore.temporal,
    (t) => t.futureStates.length,
  );
  const history = { ...useWorkflowStore.temporal.getState(), past, future };
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          workflows: WorkflowDocument[];
          folders: Folder[];
          assets: Record<string, string>;
          activeId: string;
          dark: boolean;
        };
        if (
          !Array.isArray(parsed.workflows) ||
          !parsed.workflows.length ||
          !Array.isArray(parsed.folders) ||
          parsed.workflows.some(
            (w) => !Array.isArray(w.nodes) || !Array.isArray(w.edges),
          )
        )
          throw new Error();
        parsed.workflows.forEach((w) =>
          sequenceEdges(
            w,
            orderedActions(w).map((n) => n.id),
          ),
        );
        useWorkflowStore.setState({ ...parsed, tabs: [parsed.activeId] });
      }
    } catch {
      useWorkflowStore.setState({
        notice:
          "Não foi possível restaurar o workspace local. O exemplo foi carregado.",
      });
    }
    let cancelled = false;
    void fetch("/api/workspace")
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Não foi possível carregar o banco de dados");
        const payload = (await response.json()) as {
          activeId?: string;
          workflows: WorkflowDocument[];
          assets: Record<string, string>;
          folders: Folder[];
        };
        if (cancelled) return;
        if (payload.workflows.length) {
          const state = useWorkflowStore.getState();
          const activeId = payload.workflows.some(
            (flow) => flow.id === (payload.activeId ?? state.activeId),
          )
            ? (payload.activeId ?? state.activeId)
            : payload.workflows[0].id;
          useWorkflowStore.setState({
            workflows: payload.workflows,
            assets: payload.assets,
            ...(payload.folders.length ? { folders: payload.folders } : {}),
            activeId,
            tabs: [activeId],
          });
          setSyncStatus("Sincronizado com backend");
          setSyncedDocument(
            JSON.stringify(
              payload.workflows.find((flow) => flow.id === activeId),
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled)
          useWorkflowStore.setState({
            notice:
              "Backend indisponível. As alterações locais foram preservadas.",
          });
      })
      .finally(() => {
        if (!cancelled) {
          useWorkflowStore.temporal.getState().clear();
          setReady(true);
        }
      });
    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = useWorkflowStore.subscribe((state, previous) => {
      if (
        state.workflows === previous.workflows &&
        state.folders === previous.folders &&
        state.assets === previous.assets &&
        state.dark === previous.dark &&
        state.activeId === previous.activeId
      )
        return;
      setSaved(false);
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              workflows: state.workflows,
              folders: state.folders,
              assets: state.assets,
              activeId: state.activeId,
              dark: state.dark,
            }),
          );
          setSaved(true);
        } catch {
          useWorkflowStore.setState({
            notice:
              "Armazenamento local cheio. Exporte seu fluxo para preservar as alterações.",
          });
        }
      }, 350);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", s.dark);
  }, [s.dark]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        !!e.target.closest('input,textarea,select,[contenteditable="true"]');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useWorkflowStore.setState({ palette: {} });
        return;
      }
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useWorkflowStore.temporal.getState().redo();
        else useWorkflowStore.temporal.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useWorkflowStore.temporal.getState().redo();
      }
      if (e.key.toLowerCase() === "d" && !e.ctrlKey && !e.metaKey) {
        useWorkflowStore.getState().edit((w) =>
          w.nodes.forEach((n) => {
            if (n.selected && n.type === "action")
              n.data.enabled = !n.data.enabled;
          }),
        );
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(
      () => rf.fitView({ padding: 0.22, maxZoom: 1, duration: 150 }),
      80,
    );
    return () => clearTimeout(timer);
  }, [ready, w.id, w.nodes.length, rf]);
  const { nodes, edges } = linearDiagram(w);
  const dropTarget = (point: { x: number; y: number }, movingId?: string) => {
    const absolute = (node: Node): { x: number; y: number } => {
      const parent = nodes.find((n) => n.id === node.parentId);
      const pos = parent ? absolute(parent) : { x: 0, y: 0 };
      return { x: pos.x + node.position.x, y: pos.y + node.position.y };
    };
    const scopes = nodes
      .filter(
        (n) =>
          n.type === "scope" &&
          !n.hidden &&
          n.id !== movingId &&
          !(movingId && isWithin(w, n.id, movingId)),
      )
      .reverse();
    const parent = scopes.find((n) => {
      const p = absolute(n);
      return (
        point.x >= p.x &&
        point.x <= p.x + Number(n.style?.width) &&
        point.y >= p.y + 35 &&
        point.y <= p.y + Number(n.style?.height)
      );
    });
    const before = nodes.find(
      (n) =>
        n.type !== "terminal" &&
        n.type !== "placeholder" &&
        !n.hidden &&
        n.id !== movingId &&
        !(movingId && isWithin(w, n.id, movingId)) &&
        n.parentId === parent?.id &&
        absolute(n).x +
          (n.type === "scope" ? Number(n.style?.width) : 290) / 2 >
          point.x,
    );
    return { parentId: parent?.id, beforeId: before?.id };
  };
  const exportJSON = async () => {
    try {
      await exportFiles(w, s.workflows, s.assets);
      useWorkflowStore.setState({
        notice: "Exportação concluída. JSON validado e pronto para o executor.",
      });
    } catch (e) {
      useWorkflowStore.setState({
        notice: e instanceof Error ? e.message : String(e),
      });
    }
  };
  if (!ready)
    return (
      <div className="editor-loading" role="status">
        Carregando fluxos…
      </div>
    );
  return (
    <div className="editor-shell">
      <header className="topbar">
        <div className="brand">
          <span>
            <Workflow size={22} />
          </span>
          flowbot<span className="brand-label">STUDIO</span>
        </div>
        <div className="breadcrumb">
          Workspace <ChevronRight size={13} /> Automações{" "}
          <ChevronRight size={13} />
          <strong>{w.name}</strong>
        </div>
        <div className="top-actions">
          <label className="autosave-option">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => {
                setAutoSave(e.target.checked);
                localStorage.setItem(
                  "flowbot.autosave",
                  String(e.target.checked),
                );
              }}
            />{" "}
            Autosalvamento
          </label>
          <button onClick={() => synchronize(w)}>Salvar</button>
          <small role="status">
            {syncStatus === "Sincronizado com backend" &&
            syncedDocument !== JSON.stringify(w)
              ? "Alterações não sincronizadas"
              : syncStatus}
          </small>
          <span className="save-status">
            {saved ? <Check size={14} /> : <span className="ready-dot" />}
            {saved ? "Salvo neste navegador" : "Salvando…"}
          </span>
          <button
            className="icon-button"
            title="Alternar tema"
            onClick={() => useWorkflowStore.setState({ dark: !s.dark })}
          >
            {s.dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="primary" onClick={exportJSON}>
            <Download size={15} /> Exportar JSON
          </button>
          <span className="avatar">EN</span>
        </div>
      </header>
      <div className="editor-body">
        {sidebar && <FileExplorer />}
        <main className="main">
          <div className="canvas-tabs">
            {s.tabs
              .filter((id) => s.workflows.some((w) => w.id === id))
              .map((id) => (
                <div
                  key={id}
                  className={`canvas-tab ${w.id === id ? "active" : ""}`}
                >
                  <button onClick={() => s.open(id)}>
                    <Workflow size={14} />
                    {s.workflows.find((w) => w.id === id)?.name}
                  </button>
                  {s.tabs.length > 1 && (
                    <button
                      title="Fechar aba"
                      onClick={() => {
                        const tabs = s.tabs.filter((t) => t !== id);
                        useWorkflowStore.setState({
                          tabs,
                          ...(s.activeId === id ? { activeId: tabs[0] } : {}),
                        });
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            <button
              className="icon-button"
              title="Nova automação"
              onClick={() => s.createFile("workflow")}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="canvas-toolbar">
            <div>
              <button
                className="icon-button"
                title="Recolher explorador"
                onClick={() => setSidebar(!sidebar)}
              >
                {sidebar ? (
                  <PanelLeftClose size={17} />
                ) : (
                  <PanelLeftOpen size={17} />
                )}
              </button>
              <span className="toolbar-divider" />
              <button
                title="Desfazer (Ctrl+Z)"
                disabled={!history.past}
                onClick={() => history.undo()}
              >
                <Undo2 size={16} />
              </button>
              <button
                title="Refazer (Ctrl+Y)"
                disabled={!history.future}
                onClick={() => history.redo()}
              >
                <Redo2 size={16} />
              </button>
              <span className="toolbar-divider" />
              <button title="Agrupar seleção" onClick={s.group}>
                <Group size={16} />
                <span>Agrupar</span>
              </button>
              <button
                title="Organizar fluxo"
                onClick={() => {
                  s.layout();
                  setTimeout(() => rf.fitView({ padding: 0.2 }), 50);
                }}
              >
                <LayoutGrid size={16} />
                <span>Organizar</span>
              </button>
            </div>
            <div>
              <button onClick={() => setVariables(true)}>
                <Braces size={16} />
                <span>Variáveis</span>
              </button>
              <button
                title="Importar JSON"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={16} />
              </button>
              <button
                className="add-step"
                onClick={() => useWorkflowStore.setState({ palette: {} })}
              >
                <Plus size={16} /> Adicionar etapa <kbd>⌘ K</kbd>
              </button>
            </div>
          </div>
          <div className="canvas-area">
            {ready && (
              <ReactFlow
                key={w.id}
                nodes={nodes as Node[]}
                edges={edges as Edge[]}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodeContextMenu={(event, node) => {
                  event.preventDefault();
                  if (node.type === "terminal" || node.type === "placeholder")
                    return;
                  setContext({
                    id: node.id,
                    x: Math.min(event.clientX, window.innerWidth - 240),
                    y: Math.min(event.clientY, window.innerHeight - 260),
                  });
                }}
                onPaneClick={() => setContext(null)}
                onBeforeDelete={async ({ nodes }) => {
                  s.nodesChanged(
                    nodes.map((n) => ({ type: "remove" as const, id: n.id })),
                  );
                  return false;
                }}
                onNodesChange={(c) =>
                  s.nodesChanged(c as Parameters<typeof s.nodesChanged>[0])
                }
                onEdgesChange={s.edgesChanged}
                nodesDraggable={false}
                nodesConnectable={false}
                edgesReconnectable={false}
                onNodeDoubleClick={(_, n) => {
                  const node = n as FlowNode;
                  if (
                    node.type === "action" &&
                    node.data.action === "flow.subroutine"
                  )
                    s.open(String(node.data.config.subroutine_id));
                }}
                onMove={(_, v) => setZoom(Math.round(v.zoom * 100))}
                fitView
                fitViewOptions={{ padding: 0.22, maxZoom: 1 }}
                minZoom={0.15}
                maxZoom={2}
                selectionOnDrag
                selectionMode={SelectionMode.Partial}
                panOnDrag={[1, 2]}
                multiSelectionKeyCode="Shift"
                deleteKeyCode={["Backspace", "Delete"]}
                colorMode={s.dark ? "dark" : "light"}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = e.dataTransfer.types.includes(
                    "application/rpa-node",
                  )
                    ? "move"
                    : "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const movingId = e.dataTransfer.getData(
                    "application/rpa-node",
                  );
                  const target = dropTarget(
                    rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }),
                    movingId,
                  );
                  if (movingId) {
                    s.moveBlock(movingId, target.parentId, target.beforeId);
                    return;
                  }
                  const type = e.dataTransfer.getData(
                    "application/rpa-action",
                  ) as ActionType;
                  useWorkflowStore.setState({
                    palette: {
                      scopeId: target.parentId,
                      nodeId: target.beforeId,
                      side: "before",
                    },
                  });
                  if (String(type) === "flow.section") s.addScope();
                  else if (actionTypes.includes(type)) s.add(type);
                }}
              >
                <Background
                  gap={22}
                  size={1}
                  color={s.dark ? "#343a4c" : "#d6dae3"}
                />
                <Controls showInteractive={false} />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(n) => String(n.data.color ?? "#6366f1")}
                  maskColor={s.dark ? "#161923aa" : "#f4f5f8aa"}
                />
                <Panel position="top-left">
                  <div className="canvas-label">
                    <Monitor size={13} /> WEB & DESKTOP <span>v1.0.0</span>
                  </div>
                </Panel>
              </ReactFlow>
            )}
          </div>
          <footer className="canvas-status">
            <span>
              <span className="ready-dot" />
              {w.nodes.filter((n) => n.type === "action").length} etapas{" "}
              <span className="muted">·</span> {w.edges.length} conexões
            </span>
            <span>
              <MousePointer2 size={12} /> Arraste pela alça para reordenar{" "}
              <span className="toolbar-divider" />
              {zoom}%
            </span>
          </footer>
        </main>
        <NodeProperties />
      </div>
      {context && (
        <div
          className="node-context-menu"
          role="menu"
          style={{
            position: "fixed",
            left: context.x,
            top: context.y,
            zIndex: 1000,
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setContext(null);
          }}
        >
          <button
            role="menuitem"
            onClick={() => {
              const node = w.nodes.find((n) => n.id === context.id);
              const name = window.prompt(
                "Nome da etapa ou seção",
                node?.data.customLabel,
              );
              if (name?.trim())
                s.edit((w) => {
                  w.nodes.find((n) => n.id === context.id)!.data.customLabel =
                    name.trim();
                });
              setContext(null);
            }}
          >
            Renomear
          </button>
          {w.nodes.find((n) => n.id === context.id)?.type === "scope" && (
            <button
              role="menuitem"
              onClick={() => {
                s.edit((w) => {
                  const n = w.nodes.find((n) => n.id === context.id);
                  if (n?.type === "scope") n.data.collapsed = !n.data.collapsed;
                });
                setContext(null);
              }}
            >
              Recolher / expandir
            </button>
          )}
          <button
            role="menuitem"
            onClick={() => {
              s.edit((w) => {
                const targets = w.nodes.filter(
                  (n) =>
                    n.type === "action" &&
                    (n.id === context.id || isWithin(w, n.id, context.id)),
                );
                const enabled = !targets.some(
                  (n) => n.type === "action" && n.data.enabled,
                );
                targets.forEach((n) => {
                  if (n.type === "action") n.data.enabled = enabled;
                });
              });
              setContext(null);
            }}
          >
            Ativar / inativar
          </button>
          <button
            role="menuitem"
            onClick={() => {
              useWorkflowStore.setState({
                palette: { nodeId: context.id, side: "after" },
              });
              setContext(null);
            }}
          >
            Adicionar depois
          </button>
          <button
            role="menuitem"
            onClick={() => {
              s.nodesChanged([{ type: "remove", id: context.id }]);
              setContext(null);
            }}
          >
            Excluir
          </button>
        </div>
      )}
      <ActionPalette />
      <ScreenSnipModal />
      <VariableManagerModal
        open={variables}
        onClose={() => setVariables(false)}
      />
      {s.notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{s.notice}</span>
          <button
            title="Fechar mensagem"
            onClick={() => useWorkflowStore.setState({ notice: "" })}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept=".json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const imported = importWorkflow(JSON.parse(await f.text()));
            if (s.workflows.some((w) => w.id === imported.id))
              throw new Error(
                "Já existe um fluxo com este ID. Exclua-o ou importe em outro workspace.",
              );
            useWorkflowStore.setState({
              workflows: [...s.workflows, imported],
            });
            s.open(imported.id);
          } catch (error) {
            useWorkflowStore.setState({ notice: String(error) });
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
