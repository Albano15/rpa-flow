import type { Edge, Node } from "@xyflow/react";
import type { FlowNode, Workflow } from "../types/workflow";

export const START_ID = "__flow_start__";
export const ADD_ID = "__flow_add__";
export const END_ID = "__flow_end__";
const GAP = 76;
const PADDING = 30;
const HEADER = 64;
export function orderedActions(w: Workflow): FlowNode[] {
  const actions = w.nodes.filter((n) => n.type === "action");
  const byId = new Map(actions.map((n) => [n.id, n]));
  const incoming = new Set(w.edges.map((e) => e.target));
  const next = new Map(w.edges.map((e) => [e.source, e.target]));
  const ordered: FlowNode[] = [];
  const seen = new Set<string>();
  for (const root of [
    ...actions.filter((n) => !incoming.has(n.id)),
    ...actions,
  ]) {
    let node: FlowNode | undefined = root;
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      ordered.push(node);
      node = byId.get(next.get(node.id) ?? "");
    }
  }
  return ordered;
}
export function sequenceEdges(w: Workflow, ids: string[]) {
  w.edges = ids.slice(1).map(
    (target, i) =>
      w.edges.find((e) => e.source === ids[i] && e.target === target) ?? {
        id: `edge_${ids[i]}_${target}`,
        source: ids[i],
        target,
        type: "insert",
      },
  );
}

/** Layout is computed from sequence + nesting, never from user coordinates. */
export function linearDiagram(w: Workflow): { nodes: Node[]; edges: Edge[] } {
  const rank = new Map(orderedActions(w).map((n, i) => [n.id, i]));
  const children = new Map<string | undefined, FlowNode[]>();
  const nodeIds = new Set(w.nodes.map((n) => n.id));
  for (const node of w.nodes) {
    const parent =
      node.parentId && nodeIds.has(node.parentId) ? node.parentId : undefined;
    children.set(parent, [...(children.get(parent) ?? []), node]);
  }
  const rankOf = (node: FlowNode): number => {
    if (rank.has(node.id)) return rank.get(node.id)!;
    const nested = (children.get(node.id) ?? []).map(rankOf);
    if (nested.length) return Math.min(...nested);
    const index = w.nodes.indexOf(node);
    const following = w.nodes.slice(index + 1).find((n) => rank.has(n.id));
    return following
      ? rank.get(following.id)! - 0.5
      : rank.size + index / (w.nodes.length + 1);
  };
  children.forEach((list) => list.sort((a, b) => rankOf(a) - rankOf(b)));
  const sizes = new Map<string, { width: number; height: number }>();
  const measure = (node: FlowNode): { width: number; height: number } => {
    const nested = (children.get(node.id) ?? []).map(measure);
    const size =
      node.type === "action"
        ? {
            width: 290,
            height:
              node.measured?.height ??
              (node.data.config.image_asset
                ? 225
                : node.data.action === "flow.subroutine"
                  ? 190
                  : 170),
          }
        : node.data.collapsed
          ? { width: 350, height: 100 }
          : {
              width: Math.max(
                350,
                nested.reduce((sum, s) => sum + s.width, 0) +
                  Math.max(0, nested.length - 1) * GAP +
                  PADDING * 2,
              ),
              height: Math.max(56, ...nested.map((s) => s.height)) + HEADER * 2,
            };
    sizes.set(node.id, size);
    return size;
  };
  const roots = children.get(undefined) ?? [];
  roots.forEach(measure);
  const height = Math.max(240, ...roots.map((n) => sizes.get(n.id)!.height));
  const nodes: Node[] = [];
  const stops: {
    id: string;
    first?: string;
    last?: string;
    emptyScope?: string;
  }[] = [];
  const leaves = (node: FlowNode): string[] =>
    node.type === "action"
      ? [node.id]
      : (children.get(node.id) ?? []).flatMap(leaves);
  const place = (node: FlowNode, x: number, y: number, hidden = false) => {
    const size = sizes.get(node.id)!;
    nodes.push({
      ...node,
      position: { x, y },
      hidden,
      draggable: false,
      connectable: false,
      ...(node.type === "scope" ? { style: { ...node.style, ...size } } : {}),
    });
    const ids = leaves(node);
    if (
      !hidden &&
      (node.type === "action" ||
        node.data.collapsed ||
        !children.get(node.id)?.length)
    )
      stops.push({
        id: node.id,
        first: ids[0],
        last: ids.at(-1),
        ...(!ids.length ? { emptyScope: node.id } : {}),
      });
    let left = PADDING;
    for (const child of children.get(node.id) ?? []) {
      place(
        child,
        left,
        (size.height - sizes.get(child.id)!.height) / 2,
        hidden || (node.type === "scope" && node.data.collapsed),
      );
      left += sizes.get(child.id)!.width + GAP;
    }
  };
  let x = 140;
  for (const root of roots) {
    place(root, x, (height - sizes.get(root.id)!.height) / 2);
    x += sizes.get(root.id)!.width + GAP;
  }
  const terminal = (id: string, kind: "start" | "end", top: number): Node => ({
    id,
    type: "terminal",
    position: { x: top, y: height / 2 - 32 },
    data: { kind },
    style: { width: 64, height: 64 },
    measured: { width: 64, height: 64 },
    selectable: false,
    deletable: false,
    draggable: false,
    connectable: false,
  });
  nodes.unshift(terminal(START_ID, "start", 0));
  if (!roots.length) {
    nodes.push({
      id: ADD_ID,
      type: "placeholder",
      position: { x: 140, y: height / 2 - 45 },
      data: {},
      measured: { width: 200, height: 90 },
      selectable: false,
      deletable: false,
      draggable: false,
      connectable: false,
    });
    stops.push({ id: ADD_ID });
  }
  nodes.push(terminal(END_ID, "end", roots.length ? x : 416));
  const rootOf = (id: string): string => {
    const node = w.nodes.find((n) => n.id === id);
    return node?.parentId ? rootOf(node.parentId) : id;
  };
  const chain = [{ id: START_ID }, ...stops, { id: END_ID }] as typeof stops;
  const edges = chain.slice(1).map((target, i): Edge => {
    const source = chain[i];
    return {
      id: `visual_${source.id}_${target.id}`,
      source: source.id,
      target: target.id,
      type: "insert",
      selectable: false,
      deletable: false,
      data: {
        insertion:
          rootOf(source.id) !== rootOf(target.id)
            ? target.id !== END_ID && target.id !== ADD_ID
              ? { nodeId: rootOf(target.id), side: "before", outside: true }
              : source.id !== START_ID && source.id !== ADD_ID
                ? { nodeId: rootOf(source.id), side: "after", outside: true }
                : {}
            : target.first
              ? { nodeId: target.first, side: "before" }
              : {},
      },
    };
  });
  return { nodes, edges };
}
