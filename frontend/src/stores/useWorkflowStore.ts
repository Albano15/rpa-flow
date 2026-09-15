import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type XYPosition,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import {
  createWorkflow,
  createNode,
  uid,
  type Workflow,
  type Folder,
  type FlowNode,
  type ActionType,
  type ActionData,
} from "../types/workflow";
export type Insertion = {
  edgeId?: string;
  nodeId?: string;
  side?: "before" | "after";
};
type State = {
  workflows: Workflow[];
  folders: Folder[];
  activeId: string;
  tabs: string[];
  assets: Record<string, string>;
  palette: Insertion | null;
  snipNodeId: string | null;
  dark: boolean;
  notice: string;
  edit: (fn: (w: Workflow) => void, touch?: boolean) => void;
  open: (id: string) => void;
  add: (type: ActionType, position?: XYPosition) => void;
  connect: (connection: Connection) => void;
  nodesChanged: (changes: NodeChange<FlowNode>[]) => void;
  edgesChanged: (changes: EdgeChange[]) => void;
  group: () => void;
  addScope: (position?: XYPosition) => void;
  layout: () => void;
  patch: (id: string, patch: Partial<ActionData>) => void;
  remove: () => void;
  createFile: (kind: Workflow["kind"], folderId?: string) => void;
  deleteFile: (id: string) => void;
  moveIntoScope: (id: string) => void;
};
const initial = createWorkflow("Emissão de nota fiscal");
initial.id = "wf_faturamento";
initial.folderId = "financeiro";
initial.variables = {
  usuario: "operador",
  sistema_path: "C:\\ERP\\Faturamento.exe",
};
initial.tags = ["financeiro", "desktop"];
const first = createNode("desktop.open_app", { x: 100, y: 70 });
first.id = "step_abrir_erp";
first.data.customLabel = "Abrir ERP Faturamento";
first.data.config.path = "{{sistema_path}}";
const second = createNode("desktop.wait_delay", { x: 100, y: 300 });
second.id = "step_aguardar";
second.data.customLabel = "Aguardar inicialização";
second.data.config.duration_ms = 3000;
const third = createNode("desktop.type_text", { x: 100, y: 530 });
third.id = "step_usuario";
third.data.customLabel = "Preencher usuário";
third.data.config.text = "{{usuario}}";
initial.nodes = [first, second, third];
initial.edges = [
  { id: "edge_1", source: first.id, target: second.id, type: "insert" },
  { id: "edge_2", source: second.id, target: third.id, type: "insert" },
];
const edge = (source: string, target: string) => ({
  id: uid("edge"),
  source,
  target,
  type: "insert",
});
export const useWorkflowStore = create<State>()(
  temporal(
    immer((set, get) => ({
      workflows: [initial],
      folders: [
        { id: "root", name: "Workspace", parentId: null },
        { id: "financeiro", name: "Financeiro", parentId: "root" },
      ],
      activeId: initial.id,
      tabs: [initial.id],
      assets: {},
      palette: null,
      snipNodeId: null,
      dark: false,
      notice: "",
      edit: (fn, touch = true) =>
        set((s) => {
          const w =
            s.workflows.find((w) => w.id === s.activeId) ?? s.workflows[0];
          if (w) {
            fn(w);
            if (touch) w.metadata.updated_at = new Date().toISOString();
          }
        }),
      open: (id) =>
        set((s) => {
          if (s.workflows.some((w) => w.id === id)) {
            s.activeId = id;
            if (!s.tabs.includes(id)) s.tabs.push(id);
          }
        }),
      add: (type, position) => {
        const insertion = get().palette;
        let insertionAnchor: string | undefined;
        get().edit((w) => {
          const anchor = w.nodes.find((n) => n.id === insertion?.nodeId);
          let old = w.edges.find((e) => e.id === insertion?.edgeId);
          if (anchor)
            old = w.edges.find((e) =>
              insertion?.side === "before"
                ? e.target === anchor.id
                : e.source === anchor.id,
            );
          if (!old && !anchor) {
            const tail = w.nodes.findLast(
              (n) =>
                n.type === "action" && !w.edges.some((e) => e.source === n.id),
            );
            if (tail) insertionAnchor = tail.id;
          }
          const source = w.nodes.find((n) => n.id === old?.source);
          const n = createNode(
            type,
            position ?? {
              x: source?.position.x ?? anchor?.position.x ?? 100,
              y:
                (source?.position.y ??
                  anchor?.position.y ??
                  Math.max(-180, ...w.nodes.map((n) => n.position.y))) + 230,
            },
          );
          if (source?.parentId || anchor?.parentId)
            n.parentId = source?.parentId ?? anchor?.parentId;
          if (anchor && insertion?.side === "before" && !old && !position)
            n.position = { ...anchor.position };
          if (!position) {
            const parent = w.nodes.find((p) => p.id === n.parentId);
            for (const existing of w.nodes) {
              if (
                existing.parentId === n.parentId &&
                existing.position.y >= n.position.y
              )
                existing.position.y += 230;
              else if (
                parent &&
                !existing.parentId &&
                existing.id !== parent.id &&
                existing.position.y >= parent.position.y + n.position.y
              )
                existing.position.y += 230;
            }
            if (parent)
              parent.style = {
                ...parent.style,
                height: Math.max(
                  Number(parent.style?.height ?? 0) + 230,
                  n.position.y + 210,
                ),
              };
          }
          w.nodes.forEach((n) => {
            n.selected = false;
          });
          n.selected = true;
          w.nodes.push(n);
          if (old) {
            w.edges = w.edges.filter((e) => e.id !== old.id);
            w.edges.push(edge(old.source, n.id), edge(n.id, old.target));
          } else if (insertionAnchor) {
            w.edges.push(edge(insertionAnchor, n.id));
          } else if (anchor) {
            w.edges.push(
              insertion?.side === "before"
                ? edge(n.id, anchor.id)
                : edge(anchor.id, n.id),
            );
          }
        });
        set({ palette: null });
      },
      connect: (c) =>
        get().edit((w) => {
          if (
            c.source === c.target ||
            w.nodes.find((n) => n.id === c.source)?.type !== "action" ||
            w.nodes.find((n) => n.id === c.target)?.type !== "action"
          )
            return;
          if (
            w.edges.some((e) => e.source === c.source || e.target === c.target)
          )
            return;
          let cursor: string | undefined = c.target;
          const seen = new Set<string>();
          while (cursor && !seen.has(cursor)) {
            if (cursor === c.source) return;
            seen.add(cursor);
            cursor = w.edges.find((e) => e.source === cursor)?.target;
          }
          w.edges.push(edge(c.source, c.target));
        }),
      nodesChanged: (changes) => {
        const visual = changes.every(
          (c) => c.type === "select" || c.type === "dimensions",
        );
        const wasTracking = useWorkflowStore.temporal.getState().isTracking;
        if (visual && wasTracking) useWorkflowStore.temporal.getState().pause();
        get().edit((w) => {
          const removed = new Set(
            changes.filter((c) => c.type === "remove").map((c) => c.id),
          );
          deleteSteps(w, removed);
          w.nodes = applyNodeChanges(
            changes.filter((c) => c.type !== "remove"),
            w.nodes,
          );
        }, !visual);
        if (visual && wasTracking)
          useWorkflowStore.temporal.getState().resume();
      },
      edgesChanged: (changes) =>
        get().edit((w) => {
          w.edges = applyEdgeChanges(changes, w.edges);
        }),
      patch: (id, patch) =>
        get().edit((w) => {
          const n = w.nodes.find((n) => n.id === id);
          if (n?.type === "action") Object.assign(n.data, patch);
        }),
      remove: () =>
        get().edit((w) =>
          deleteSteps(
            w,
            new Set(w.nodes.filter((n) => n.selected).map((n) => n.id)),
          ),
        ),
      addScope: (position = { x: 480, y: 80 }) => {
        get().edit((w) => {
          w.nodes.forEach((n) => {
            n.selected = false;
          });
          w.nodes.push({
            id: uid("section"),
            type: "scope",
            position,
            selected: true,
            style: { width: 420, height: 320 },
            data: {
              customLabel: "Nova seção",
              color: "#6366f1",
              collapsed: false,
            },
          });
        });
        set({ palette: null });
      },
      group: () => {
        if (
          activeWorkflow(get()).nodes.filter(
            (n) => n.selected && n.type === "action" && !n.parentId,
          ).length < 2
        ) {
          set({
            notice:
              "Selecione ao menos duas ações sem seção usando Shift + clique.",
          });
          return;
        }
        get().edit((w) => {
          const selected = w.nodes.filter(
            (n) => n.selected && n.type === "action" && !n.parentId,
          );
          const x = Math.min(...selected.map((n) => n.position.x)) - 35,
            y = Math.min(...selected.map((n) => n.position.y)) - 65;
          const id = uid("section");
          w.nodes.unshift({
            id,
            type: "scope",
            position: { x, y },
            data: {
              customLabel: "Nova seção",
              color: "#6366f1",
              collapsed: false,
            },
            style: {
              width:
                Math.max(
                  ...selected.map(
                    (n) => n.position.x + Number(n.style?.width ?? 290),
                  ),
                ) -
                x +
                35,
              height:
                Math.max(...selected.map((n) => n.position.y + 180)) - y + 35,
            },
          });
          selected.forEach((n) => {
            n.parentId = id;
            n.position = { x: n.position.x - x, y: n.position.y - y };
            n.selected = false;
          });
        });
      },
      layout: () =>
        get().edit((w) => {
          const graph = new dagre.graphlib.Graph()
            .setGraph({ rankdir: "TB", ranksep: 85, nodesep: 70 })
            .setDefaultEdgeLabel(() => ({}));
          w.nodes
            .filter((n) => n.type === "action")
            .forEach((n) => graph.setNode(n.id, { width: 290, height: 170 }));
          w.edges.forEach((e) => graph.setEdge(e.source, e.target));
          dagre.layout(graph);
          w.nodes
            .filter((n) => n.type === "action")
            .forEach((n) => {
              const p = graph.node(n.id);
              n.position = { x: p.x - 145, y: p.y - 85 };
            });
          for (const scope of w.nodes
            .filter((n) => n.type === "scope")
            .sort((a, b) => depth(w, b.id) - depth(w, a.id))) {
            const children = w.nodes.filter((n) => n.parentId === scope.id);
            if (!children.length) continue;
            const x = Math.min(...children.map((n) => n.position.x)) - 35,
              y = Math.min(...children.map((n) => n.position.y)) - 65;
            scope.position = { x, y };
            scope.style = {
              width:
                Math.max(
                  ...children.map(
                    (n) => n.position.x + Number(n.style?.width ?? 290),
                  ),
                ) -
                x +
                35,
              height:
                Math.max(
                  ...children.map(
                    (n) => n.position.y + Number(n.style?.height ?? 170),
                  ),
                ) -
                y +
                35,
            };
            children.forEach((n) => {
              n.position = { x: n.position.x - x, y: n.position.y - y };
            });
          }
        }),
      createFile: (kind, folderId = "root") => {
        const w = createWorkflow(
          kind === "workflow" ? "Nova automação" : "Nova sub-rotina",
          kind,
          folderId,
        );
        set((s) => {
          s.workflows.push(w);
          s.activeId = w.id;
          s.tabs.push(w.id);
        });
      },
      deleteFile: (id) =>
        set((s) => {
          s.workflows = s.workflows.filter((w) => w.id !== id);
          s.tabs = s.tabs.filter((t) => t !== id);
          if (!s.workflows.length) {
            const w = createWorkflow("Nova automação");
            s.workflows.push(w);
          }
          if (s.activeId === id) s.activeId = s.workflows[0].id;
          if (!s.tabs.includes(s.activeId)) s.tabs.push(s.activeId);
        }),
      moveIntoScope: (id) =>
        get().edit((w) => {
          const n = w.nodes.find((n) => n.id === id);
          if (!n) return;
          const absolute = absolutePosition(w, n.id);
          const scopes = w.nodes
            .filter(
              (p) =>
                p.type === "scope" &&
                p.id !== id &&
                !isWithin(w, p.id, id) &&
                !p.data.collapsed,
            )
            .reverse();
          const scope = scopes.find((p) => {
            const pos = absolutePosition(w, p.id);
            return (
              absolute.x >= pos.x &&
              absolute.y >= pos.y &&
              absolute.x <= pos.x + Number(p.style?.width ?? 420) &&
              absolute.y <= pos.y + Number(p.style?.height ?? 320)
            );
          });
          if (scope) {
            const pos = absolutePosition(w, scope.id);
            n.parentId = scope.id;
            n.position = {
              x: Math.max(25, absolute.x - pos.x),
              y: Math.max(60, absolute.y - pos.y),
            };
            let child = n;
            while (child.parentId) {
              const parent = w.nodes.find((p) => p.id === child.parentId)!;
              parent.style = {
                ...parent.style,
                width: Math.max(
                  Number(parent.style?.width ?? 420),
                  child.position.x + Number(child.style?.width ?? 290) + 35,
                ),
                height: Math.max(
                  Number(parent.style?.height ?? 320),
                  child.position.y + Number(child.style?.height ?? 180) + 35,
                ),
              };
              child = parent;
            }
          } else {
            delete n.parentId;
            n.position = absolute;
          }
          w.nodes.sort((a, b) => depth(w, a.id) - depth(w, b.id));
        }),
    })),
    {
      limit: 100,
      partialize: (s) => ({
        workflows: s.workflows,
        folders: s.folders,
        assets: s.assets,
        activeId: s.activeId,
        tabs: s.tabs,
      }),
      equality: (a, b) =>
        a.workflows === b.workflows &&
        a.folders === b.folders &&
        a.assets === b.assets &&
        a.activeId === b.activeId &&
        a.tabs === b.tabs,
    },
  ),
);
export const activeWorkflow = (s: State) =>
  s.workflows.find((w) => w.id === s.activeId) ?? s.workflows[0];

// Um gesto de arrastar gera uma única entrada no histórico.
let dragSnapshot: Workflow[] | undefined;
export function beginDrag() {
  dragSnapshot = useWorkflowStore.getState().workflows;
  useWorkflowStore.temporal.getState().pause();
}
export function endDrag() {
  if (!dragSnapshot) return;
  const result = useWorkflowStore.getState().workflows;
  useWorkflowStore.setState({ workflows: dragSnapshot });
  dragSnapshot = undefined;
  useWorkflowStore.temporal.getState().resume();
  useWorkflowStore.setState({ workflows: result });
}

export function isWithin(w: Workflow, id: string, parentId: string): boolean {
  const parent = w.nodes.find((n) => n.id === id)?.parentId;
  return !!parent && (parent === parentId || isWithin(w, parent, parentId));
}
function depth(w: Workflow, id: string): number {
  const p = w.nodes.find((n) => n.id === id)?.parentId;
  return p ? 1 + depth(w, p) : 0;
}
export function absolutePosition(w: Workflow, id: string): XYPosition {
  const n = w.nodes.find((n) => n.id === id)!;
  const p = n.parentId ? absolutePosition(w, n.parentId) : { x: 0, y: 0 };
  return { x: n.position.x + p.x, y: n.position.y + p.y };
}
function deleteSteps(w: Workflow, removed: Set<string>) {
  // Removing an organizational section preserves its contents and absolute positions.
  const positions = new Map(
    w.nodes.map((n) => [n.id, absolutePosition(w, n.id)]),
  );
  const bridges = w.edges
    .filter((e) => !removed.has(e.source) && removed.has(e.target))
    .flatMap((e) => {
      let target: string | undefined = e.target;
      const seen = new Set<string>();
      while (target && removed.has(target) && !seen.has(target)) {
        seen.add(target);
        target = w.edges.find((next) => next.source === target)?.target;
      }
      return target && !removed.has(target) ? [edge(e.source, target)] : [];
    });
  for (const n of w.nodes)
    if (n.parentId && removed.has(n.parentId)) {
      let parent = w.nodes.find((p) => p.id === n.parentId)?.parentId;
      while (parent && removed.has(parent))
        parent = w.nodes.find((p) => p.id === parent)?.parentId;
      n.parentId = parent;
      const pos = positions.get(n.id)!,
        base = parent ? positions.get(parent)! : { x: 0, y: 0 };
      n.position = { x: pos.x - base.x, y: pos.y - base.y };
    }
  w.nodes = w.nodes.filter((n) => !removed.has(n.id));
  w.edges = [
    ...w.edges.filter((e) => !removed.has(e.source) && !removed.has(e.target)),
    ...bridges,
  ];
}
