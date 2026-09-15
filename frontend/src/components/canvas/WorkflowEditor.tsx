"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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
  beginDrag,
  endDrag,
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
import { ActionNode, GroupNode, InsertEdge } from "./CustomNodes";
import { FileExplorer } from "../sidebar/FileExplorer";
import { NodeProperties } from "../sidebar/NodeProperties";
import { ActionPalette } from "../sidebar/ActionPalette";
import { ScreenSnipModal } from "../modals/ScreenSnipModal";
import { VariableManagerModal } from "../modals/VariableManagerModal";
import "@xyflow/react/dist/style.css";
const nodeTypes = { action: ActionNode, scope: GroupNode };
const edgeTypes = { insert: InsertEdge };
const storageKey = "flowbot.workspace.v1";
function Editor() {
  const s = useWorkflowStore();
  const w = useWorkflowStore(activeWorkflow);
  const rf = useReactFlow();
  const [sidebar, setSidebar] = useState(true);
  const [variables, setVariables] = useState(false);
  const [ready, setReady] = useState(false);
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
        useWorkflowStore.setState({ ...parsed, tabs: [parsed.activeId] });
      }
    } catch {
      useWorkflowStore.setState({
        notice:
          "Não foi possível restaurar o workspace local. O exemplo foi carregado.",
      });
    }
    useWorkflowStore.temporal.getState().clear();
    const readyTimer = setTimeout(() => setReady(true), 0);
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
      clearTimeout(readyTimer);
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
  const nodes = useMemo(
    () =>
      w.nodes.map((n) => {
        if (n.type === "scope" && n.data.collapsed)
          return { ...n, style: { ...n.style, width: 350, height: 100 } };
        const p = w.nodes.find((p) => p.id === n.parentId);
        return { ...n, hidden: p?.type === "scope" && p.data.collapsed };
      }),
    [w.nodes],
  );
  const edges = useMemo(
    () =>
      w.edges.map((e) => {
        const source = w.nodes.find((n) => n.id === e.source),
          target = w.nodes.find((n) => n.id === e.target);
        const sp = w.nodes.find((n) => n.id === source?.parentId),
          tp = w.nodes.find((n) => n.id === target?.parentId);
        const a = sp?.type === "scope" && sp.data.collapsed ? sp.id : e.source,
          b = tp?.type === "scope" && tp.data.collapsed ? tp.id : e.target;
        return {
          ...e,
          source: a,
          target: b,
          hidden: a === b,
          type: a !== e.source || b !== e.target ? "default" : "insert",
        };
      }),
    [w.nodes, w.edges],
  );
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
                onNodesChange={(c) =>
                  s.nodesChanged(c as Parameters<typeof s.nodesChanged>[0])
                }
                onEdgesChange={s.edgesChanged}
                onConnect={s.connect}
                onNodeDragStart={beginDrag}
                onNodeDragStop={(_, n) => {
                  s.moveIntoScope(n.id);
                  endDrag();
                }}
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
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const type = e.dataTransfer.getData(
                    "application/rpa-action",
                  ) as ActionType;
                  if (actionTypes.includes(type))
                    s.add(
                      type,
                      rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }),
                    );
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
                    <Monitor size={13} /> DESKTOP AUTOMATION <span>v1.0.0</span>
                  </div>
                </Panel>
                {!w.nodes.length && (
                  <Panel position="top-center">
                    <div className="canvas-empty">
                      <Workflow size={36} />
                      <h2>Grandes fluxos começam com uma etapa.</h2>
                      <p>Adicione uma ação para criar sua automação.</p>
                      <button
                        className="primary"
                        onClick={() =>
                          useWorkflowStore.setState({ palette: {} })
                        }
                      >
                        <Plus size={16} /> Adicionar primeira etapa
                      </button>
                    </div>
                  </Panel>
                )}
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
              <MousePointer2 size={12} /> Shift + clique para selecionar{" "}
              <span className="toolbar-divider" />
              {zoom}%
            </span>
          </footer>
        </main>
        <NodeProperties />
      </div>
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
