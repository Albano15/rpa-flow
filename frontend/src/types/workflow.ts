import { z } from "zod";
import type { Node, Edge, XYPosition } from "@xyflow/react";
export const actionTypes = [
  "desktop.open_app",
  "desktop.click_image",
  "desktop.click_coordinate",
  "desktop.wait_delay",
  "desktop.wait_image",
  "desktop.type_text",
  "desktop.press_key",
  "desktop.ocr_extract",
  "flow.subroutine",
  "desktop.focus_window",
  "web.create_browser",
  "web.select_element",
  "web.type_text",
  "web.click",
  "http.request",
  "flow.loop",
  "flow.decision",
  "flow.value",
] as const;
export type ActionType = (typeof actionTypes)[number];
export type Config = Record<string, unknown>;
export type ActionData = {
  action: ActionType;
  customLabel: string;
  enabled: boolean;
  notes: string;
  color: string;
  config: Config;
  outputs?: Record<string, string>;
  retry_policy?: { max_attempts: number; delay_seconds: number };
};
export type ScopeData = {
  customLabel: string;
  color: string;
  collapsed: boolean;
};
export type FlowNode = Node<ActionData, "action"> | Node<ScopeData, "scope">;
export type Workflow = {
  id: string;
  name: string;
  kind: "workflow" | "subroutine";
  folderId: string;
  description: string;
  metadata: { author: string; created_at: string; updated_at: string };
  variables: Record<string, unknown>;
  nodes: FlowNode[];
  edges: Edge[];
  tags: string[];
};
export type Folder = { id: string; name: string; parentId: string | null };
export const uid = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
export const catalog: Record<
  ActionType,
  { label: string; description: string; color: string; defaults: Config }
> = {
  "desktop.focus_window": {
    label: "Focar janela",
    description: "Ative uma janela pelo título",
    color: "#6366f1",
    defaults: { title: "" },
  },
  "web.create_browser": {
    label: "Criar navegador",
    description: "Crie uma sessão e uma aba para outras ações",
    color: "#6366f1",
    defaults: { url: "about:blank", headless: false },
  },
  "web.select_element": {
    label: "Selecionar elemento do navegador",
    description: "Localize um elemento por seletor CSS na aba escolhida",
    color: "#6366f1",
    defaults: { browser: "", selector: "" },
  },
  "web.type_text": {
    label: "Digitar texto (Web)",
    description: "Preencha um elemento na aba escolhida",
    color: "#6366f1",
    defaults: { browser: "", selector: "", text: "" },
  },
  "web.click": {
    label: "Clicar em elemento (Web)",
    description: "Clique em um elemento na aba escolhida",
    color: "#6366f1",
    defaults: { browser: "", selector: "" },
  },
  "http.request": {
    label: "Chamar API",
    description: "Armazene status, headers e body para outras ações",
    color: "#6366f1",
    defaults: {
      method: "GET",
      endpoint: "",
      body: {},
      headers: {},
      timeout_sec: 30,
    },
  },
  "flow.loop": {
    label: "Loop",
    description: "Repita uma sub-rotina pelo número informado",
    color: "#6366f1",
    defaults: { times: 1, subroutine_id: "" },
  },
  "flow.decision": {
    label: "Decisão",
    description: "Compare valores e execute a sub-rotina correspondente",
    color: "#6366f1",
    defaults: {
      left: "",
      operator: "equals",
      right: "",
      then_subroutine_id: "",
      else_subroutine_id: "",
    },
  },
  "flow.value": {
    label: "Pegar valor",
    description: "Defina um valor ou reutilize o retorno de uma ação",
    color: "#6366f1",
    defaults: { value: "" },
  },
  "desktop.open_app": {
    label: "Abrir Programa",
    description: "Inicie um aplicativo desktop",
    color: "#6366f1",
    defaults: {
      path: "",
      args: [],
      cwd: "",
      wait_window: true,
      timeout_sec: 30,
    },
  },
  "desktop.click_image": {
    label: "Clicar em Imagem",
    description: "Encontre e clique em um elemento",
    color: "#0ea5e9",
    defaults: {
      image_asset: "",
      confidence: 0.85,
      button: "left",
      dx: 0,
      dy: 0,
      timeout_sec: 30,
    },
  },
  "desktop.click_coordinate": {
    label: "Clicar em Coordenada",
    description: "Clique em uma posição da tela",
    color: "#0ea5e9",
    defaults: { x: 0, y: 0, button: "left", click_type: "single", delay_ms: 0 },
  },
  "desktop.wait_delay": {
    label: "Aguardar Tempo",
    description: "Adicione uma pausa ao fluxo",
    color: "#d49a25",
    defaults: { duration_ms: 1000 },
  },
  "desktop.wait_image": {
    label: "Aguardar Imagem",
    description: "Espere um elemento aparecer",
    color: "#d49a25",
    defaults: {
      image_asset: "",
      confidence: 0.85,
      timeout_sec: 30,
      interval_sec: 0.5,
    },
  },
  "desktop.type_text": {
    label: "Digitar texto (Desktop)",
    description: "Preencha campos com texto e variáveis",
    color: "#10b981",
    defaults: { text: "", interval_sec: 0.05, write_method: "paste" },
  },
  "desktop.press_key": {
    label: "Apertar Tecla",
    description: "Envie teclas e atalhos",
    color: "#10b981",
    defaults: { keys: "enter", modifiers: [], repeat_count: 1 },
  },
  "desktop.ocr_extract": {
    label: "Extrair Texto via OCR",
    description: "Transforme uma região em texto",
    color: "#a855f7",
    defaults: {
      region: { x: 0, y: 0, width: 200, height: 40 },
      lang: "por",
      grayscale: true,
      binarize: false,
      threshold: 128,
      regex_filter: "",
    },
  },
  "flow.subroutine": {
    label: "Sub-rotina",
    description: "Reutilize um fluxo modular",
    color: "#ec4899",
    defaults: { subroutine_id: "", inputs: {} },
  },
};
export function createNode(
  action: ActionType,
  position: XYPosition,
): Node<ActionData, "action"> {
  return {
    id: uid("step"),
    type: "action",
    position,
    data: {
      action,
      customLabel: catalog[action].label,
      enabled: true,
      notes: "",
      color: catalog[action].color,
      config: structuredClone(catalog[action].defaults),
      ...(action === "desktop.ocr_extract"
        ? { outputs: { extracted_text: "context.texto_extraido" } }
        : {}),
    },
  };
}
export function createWorkflow(
  name: string,
  kind: Workflow["kind"] = "workflow",
  folderId = "root",
): Workflow {
  const now = new Date().toISOString();
  return {
    id: uid(kind === "workflow" ? "wf" : "sub"),
    name,
    kind,
    folderId,
    description: "",
    metadata: { author: "Engenharia RPA", created_at: now, updated_at: now },
    variables: {},
    nodes: [],
    edges: [],
    tags: [],
  };
}
const nonempty = z.string().trim().min(1);
const reference = z.object({
  source: z.literal("action"),
  actionId: nonempty,
  path: nonempty,
  valueType: z.enum(["text", "number", "money"]),
});
const dynamic = z.union([z.string(), z.number().finite(), reference]);
const nonnegative = z.number().finite().min(0);
const positive = z.number().finite().positive();
export const configSchemas: Record<ActionType, z.ZodType> = {
  "desktop.focus_window": z.object({ title: nonempty }),
  "web.create_browser": z.object({ url: nonempty, headless: z.boolean() }),
  "web.select_element": z.object({ browser: nonempty, selector: nonempty }),
  "web.type_text": z.object({
    browser: nonempty,
    selector: nonempty,
    text: dynamic,
  }),
  "web.click": z.object({ browser: nonempty, selector: nonempty }),
  "http.request": z.object({
    method: z.enum([
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ]),
    endpoint: nonempty,
    body: z.unknown(),
    headers: z.record(z.string(), z.string()),
    timeout_sec: positive,
  }),
  "flow.loop": z.object({
    times: z.union([z.number().int().min(0), reference]),
    subroutine_id: nonempty,
  }),
  "flow.decision": z.object({
    left: dynamic,
    right: dynamic,
    operator: z.enum(["equals", "not_equals", "greater", "less", "contains"]),
    then_subroutine_id: nonempty,
    else_subroutine_id: z.string(),
  }),
  "flow.value": z.object({ value: dynamic }),
  "desktop.open_app": z.object({
    path: nonempty,
    args: z.array(z.string()),
    cwd: z.string(),
    wait_window: z.boolean(),
    timeout_sec: positive,
  }),
  "desktop.click_image": z.object({
    image_asset: nonempty,
    confidence: z.number().min(0.7).max(1),
    button: z.enum(["left", "right", "double"]),
    dx: z.number().finite(),
    dy: z.number().finite(),
    timeout_sec: positive,
  }),
  "desktop.click_coordinate": z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    button: z.enum(["left", "right", "middle"]),
    click_type: z.enum(["single", "double"]),
    delay_ms: nonnegative,
  }),
  "desktop.wait_delay": z.object({
    duration_ms: z.union([nonnegative, reference]),
  }),
  "desktop.wait_image": z.object({
    image_asset: nonempty,
    confidence: z.number().min(0.7).max(1),
    timeout_sec: positive,
    interval_sec: positive,
  }),
  "desktop.type_text": z.object({
    text: dynamic,
    interval_sec: nonnegative,
    write_method: z.enum(["paste", "typewrite"]),
  }),
  "desktop.press_key": z.object({
    keys: nonempty,
    modifiers: z.array(z.enum(["ctrl", "alt", "shift", "win"])),
    repeat_count: positive.int(),
  }),
  "desktop.ocr_extract": z.object({
    region: z.object({
      x: z.number().finite(),
      y: z.number().finite(),
      width: positive,
      height: positive,
    }),
    lang: z.enum(["por", "eng", "por+eng"]),
    grayscale: z.boolean(),
    binarize: z.boolean(),
    threshold: z.number().min(0).max(255),
    regex_filter: z.string(),
  }),
  "flow.subroutine": z.object({
    subroutine_id: nonempty,
    inputs: z.record(z.string(), z.unknown()),
  }),
};
export function nodeIssues(data: ActionData): string[] {
  const result = configSchemas[data.action].safeParse(data.config);
  const issues = result.success
    ? []
    : result.error.issues.map(
        (i) =>
          `${i.path.join(".") === "path" ? "Caminho do executável" : i.path.join(".")}: obrigatório ou inválido`,
      );
  if (!data.customLabel.trim()) issues.push("Nome obrigatório");
  if (data.action === "desktop.ocr_extract" && !data.outputs?.extracted_text)
    issues.push("Variável de destino obrigatória");
  return issues;
}
export const astSchema = z
  .object({
    $schema: z.literal("https://rpa-platform.local/schemas/workflow.v1.json"),
    workflow_id: nonempty,
    name: nonempty,
    version: z.literal("1.0.0"),
    description: z.string(),
    metadata: z.object({
      author: z.string(),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
    variables: z.record(z.string(), z.unknown()),
    nodes: z.array(
      z
        .object({
          id: nonempty,
          name: nonempty,
          type: z.enum(actionTypes),
          enabled: z.boolean(),
          config: z.record(z.string(), z.unknown()),
          retry_policy: z
            .object({
              max_attempts: positive.int(),
              delay_seconds: z.number().finite().min(0),
            })
            .optional(),
          outputs: z.record(z.string(), z.string()).optional(),
          next_node_id: z.string().nullable(),
        })
        .strict(),
    ),
    sections: z.array(
      z
        .object({
          id: nonempty,
          label: nonempty,
          node_ids: z.array(z.string()),
          collapsed: z.boolean(),
          parent_id: z.string().optional(),
        })
        .strict(),
    ),
  })
  .strict();
export function exportWorkflow(w: Workflow) {
  const actions = w.nodes.filter(
    (n): n is Node<ActionData, "action"> => n.type === "action",
  );
  if (!actions.length) throw new Error("Adicione pelo menos uma ação.");
  const ids = new Set(actions.map((n) => n.id));
  if (ids.size !== actions.length) throw new Error("IDs duplicados.");
  const next = new Map<string, string>(),
    incoming = new Set<string>();
  for (const e of w.edges) {
    if (!ids.has(e.source) || !ids.has(e.target))
      throw new Error("Conexão com ação inexistente.");
    if (next.has(e.source) || incoming.has(e.target))
      throw new Error("O contrato sequencial não permite ramificações.");
    next.set(e.source, e.target);
    incoming.add(e.target);
  }
  const roots = actions.filter((n) => !incoming.has(n.id));
  if (!roots.length) throw new Error("O fluxo contém um ciclo.");
  if (roots.length !== 1)
    throw new Error("Todas as ações devem estar conectadas em uma sequência.");
  const ordered: typeof actions = [];
  const visited = new Set<string>();
  let id: string | undefined = roots[0].id;
  while (id) {
    if (visited.has(id)) throw new Error("O fluxo contém um ciclo.");
    visited.add(id);
    ordered.push(actions.find((n) => n.id === id)!);
    id = next.get(id);
  }
  if (ordered.length !== actions.length)
    throw new Error("Há ações desconectadas ou um ciclo.");
  const available = new Set<string>();
  for (const n of ordered) {
    const checkReferences = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      const record = value as Record<string, unknown>;
      if (record.source === "action" && !available.has(String(record.actionId)))
        throw new Error(
          `${n.data.customLabel}: o resultado deve vir de uma ação anterior ativa.`,
        );
      Object.values(record).forEach(checkReferences);
    };
    if (n.data.enabled) {
      checkReferences(n.data.config);
      if (
        n.data.action.startsWith("web.") &&
        n.data.action !== "web.create_browser"
      ) {
        const browser = actions.find((a) => a.id === n.data.config.browser);
        if (
          !browser ||
          browser.data.action !== "web.create_browser" ||
          !available.has(browser.id)
        )
          throw new Error(
            `${n.data.customLabel}: selecione um navegador criado anteriormente.`,
          );
      }
      available.add(n.id);
    }
    const issues = nodeIssues(n.data);
    if (n.data.enabled && issues.length)
      throw new Error(`${n.data.customLabel}: ${issues.join("; ")}`);
  }
  return astSchema.parse({
    $schema: "https://rpa-platform.local/schemas/workflow.v1.json",
    workflow_id: w.id,
    name: w.name,
    version: "1.0.0",
    description: w.description,
    metadata: w.metadata,
    variables: w.variables,
    nodes: ordered.map((n) => ({
      id: n.id,
      name: n.data.customLabel,
      type: n.data.action,
      enabled: n.data.enabled,
      config: n.data.config,
      ...(n.data.outputs ? { outputs: n.data.outputs } : {}),
      ...(n.data.retry_policy ? { retry_policy: n.data.retry_policy } : {}),
      next_node_id: next.get(n.id) ?? null,
    })),
    sections: w.nodes
      .filter((n) => n.type === "scope")
      .map((n) => ({
        id: n.id,
        label: n.data.customLabel,
        node_ids: actions.filter((a) => a.parentId === n.id).map((a) => a.id),
        collapsed: (n.data as ScopeData).collapsed,
        ...(n.parentId ? { parent_id: n.parentId } : {}),
      })),
  });
}
export function importWorkflow(raw: unknown): Workflow {
  const ast = astSchema.parse(raw);
  const w = createWorkflow(
    ast.name,
    ast.workflow_id.startsWith("sub_") ? "subroutine" : "workflow",
  );
  w.id = ast.workflow_id;
  w.description = ast.description;
  w.metadata = ast.metadata;
  w.variables = ast.variables;
  w.nodes = ast.nodes.map((n, i) => ({
    ...createNode(n.type, { x: 100, y: i * 230 }),
    id: n.id,
    data: {
      ...createNode(n.type, { x: 0, y: 0 }).data,
      customLabel: n.name,
      enabled: n.enabled,
      config: { ...catalog[n.type].defaults, ...n.config },
      outputs: n.outputs,
      retry_policy: n.retry_policy,
    },
  }));
  w.edges = ast.nodes
    .filter((n) => n.next_node_id)
    .map((n) => ({
      id: uid("edge"),
      source: n.id,
      target: n.next_node_id!,
      type: "insert",
    }));
  for (const s of ast.sections) {
    const members = w.nodes.filter((n) => s.node_ids.includes(n.id));
    if (members.some((n) => n.parentId) || members.length !== s.node_ids.length)
      throw new Error("Seção inválida.");
    const y = Math.min(...members.map((n) => n.position.y), 0);
    w.nodes.unshift({
      id: s.id,
      type: "scope",
      position: { x: 60, y: y - 60 },
      style: {
        width: 380,
        height: Math.max(180, ...members.map((n) => n.position.y - y + 240)),
      },
      data: { customLabel: s.label, color: "#6366f1", collapsed: s.collapsed },
    });
    members.forEach((n) => {
      n.parentId = s.id;
      n.position = { x: 40, y: n.position.y - y + 60 };
    });
  }
  for (const section of ast.sections) {
    if (section.parent_id) {
      const node = w.nodes.find((n) => n.id === section.id)!;
      if (!ast.sections.some((p) => p.id === section.parent_id))
        throw new Error("Seção pai inexistente.");
      let parent: string | undefined = section.parent_id;
      const seen = new Set([section.id]);
      while (parent) {
        if (seen.has(parent)) throw new Error("Ciclo de seções.");
        seen.add(parent);
        parent = ast.sections.find((s) => s.id === parent)?.parent_id;
      }
      node.parentId = section.parent_id;
    }
  }
  const depth = (id: string): number => {
    const p = w.nodes.find((n) => n.id === id)?.parentId;
    return p ? 1 + depth(p) : 0;
  };
  w.nodes.sort((a, b) => depth(a.id) - depth(b.id));
  exportWorkflow(w);
  return w;
}
