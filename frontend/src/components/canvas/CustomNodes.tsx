/* eslint-disable @next/next/no-img-element -- Templates locais em data URLs precisam de pixels originais para o recorte. */
import { memo, type CSSProperties } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import * as Switch from "@radix-ui/react-switch";
import {
  AppWindow,
  Image as ImageIcon,
  MousePointer2,
  Timer,
  ScanSearch,
  TextCursorInput,
  Keyboard,
  ScanText,
  Workflow,
  Plus,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  StickyNote,
} from "lucide-react";
import {
  catalog,
  nodeIssues,
  type ActionData,
  type ScopeData,
  type ActionType,
} from "../../types/workflow";
import { useWorkflowStore } from "../../stores/useWorkflowStore";
export const icons = {
  "desktop.open_app": AppWindow,
  "desktop.click_image": ImageIcon,
  "desktop.click_coordinate": MousePointer2,
  "desktop.wait_delay": Timer,
  "desktop.wait_image": ScanSearch,
  "desktop.type_text": TextCursorInput,
  "desktop.press_key": Keyboard,
  "desktop.ocr_extract": ScanText,
  "flow.subroutine": Workflow,
};
export function ActionIcon({ action }: { action: ActionType }) {
  const Icon = icons[action];
  return <Icon size={19} />;
}
export const ActionNode = memo(function ActionNode({
  id,
  data,
  selected,
}: NodeProps<Node<ActionData, "action">>) {
  const patch = useWorkflowStore((s) => s.patch);
  const asset = useWorkflowStore(
    (s) => s.assets[String(data.config.image_asset)],
  );
  const issues = nodeIssues(data);
  const summary =
    data.action === "desktop.wait_delay"
      ? `${Number(data.config.duration_ms) / 1000} s`
      : data.action === "desktop.press_key"
        ? [...(data.config.modifiers as string[]), data.config.keys].join(" + ")
        : String(
            data.config.path ||
              data.config.text ||
              data.config.image_asset ||
              catalog[data.action].description,
          );
  return (
    <div
      className={`action-node ${selected ? "selected" : ""} ${!data.enabled ? "inactive" : ""}`}
      style={{ "--accent": data.color } as CSSProperties}
    >
      <Handle type="target" position={Position.Top} />
      <button
        className="node-add before nodrag"
        title="Adicionar antes"
        onClick={() =>
          useWorkflowStore.setState({ palette: { nodeId: id, side: "before" } })
        }
      >
        <Plus size={13} />
      </button>
      <div className="node-heading">
        <span className="action-icon">
          <ActionIcon action={data.action} />
        </span>
        <div>
          <small>{catalog[data.action].label}</small>
          <strong>{data.customLabel}</strong>
        </div>
        <Switch.Root
          className="switch nodrag"
          checked={data.enabled}
          onCheckedChange={(enabled) => patch(id, { enabled })}
          aria-label={`Ativar ${data.customLabel}`}
        >
          <Switch.Thumb />
        </Switch.Root>
      </div>
      {asset ? (
        <img className="node-preview" src={asset} alt="Template capturado" />
      ) : (
        <div className="node-summary">{summary}</div>
      )}
      {data.action === "flow.subroutine" && (
        <div className="ports">
          <span>
            ↳{" "}
            {Object.keys(data.config.inputs as object).join(", ") || "Entradas"}
          </span>
          <span>
            ↗ {Object.keys(data.outputs ?? {}).join(", ") || "Retornos"}
          </span>
        </div>
      )}
      <footer>
        <code>{id}</code>
        <span>
          {!data.enabled ? (
            "Inativo"
          ) : issues.length ? (
            <span className="warning" title={issues.join("\n")}>
              <AlertCircle size={13} /> Pendente
            </span>
          ) : (
            <span className="ready-dot" />
          )}
          {data.notes && <StickyNote size={12} />}
        </span>
      </footer>
      <Handle type="source" position={Position.Bottom} />
      <button
        className="node-add after nodrag"
        title="Adicionar depois"
        onClick={() =>
          useWorkflowStore.setState({ palette: { nodeId: id, side: "after" } })
        }
      >
        <Plus size={13} />
      </button>
    </div>
  );
});
export function GroupNode({ id, data }: NodeProps<Node<ScopeData, "scope">>) {
  const edit = useWorkflowStore((s) => s.edit);
  return (
    <div
      className="scope-node"
      style={{ "--accent": data.color } as CSSProperties}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <div className="scope-header">
        <span className="scope-dot" />
        <input
          aria-label="Nome da seção"
          className="nodrag"
          value={data.customLabel}
          onChange={(e) =>
            edit((w) => {
              const n = w.nodes.find((n) => n.id === id);
              if (n) n.data.customLabel = e.target.value;
            })
          }
        />
        <input
          aria-label="Cor da seção"
          className="nodrag color-input"
          type="color"
          value={data.color}
          onChange={(e) =>
            edit((w) => {
              const n = w.nodes.find((n) => n.id === id);
              if (n) n.data.color = e.target.value;
            })
          }
        />
        <button
          className="nodrag"
          title={data.collapsed ? "Expandir seção" : "Minimizar seção"}
          onClick={() =>
            edit((w) => {
              const n = w.nodes.find((n) => n.id === id);
              if (n?.type === "scope") n.data.collapsed = !n.data.collapsed;
            })
          }
        >
          {data.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>
      {data.collapsed && <p>Seção minimizada</p>}
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}
export function InsertEdge(props: EdgeProps) {
  const [path, x, y] = getBezierPath(props);
  return (
    <>
      <BaseEdge path={path} markerEnd={props.markerEnd} style={props.style} />
      <EdgeLabelRenderer>
        <button
          className="edge-add nodrag nopan"
          title="Inserir etapa nesta conexão"
          style={{
            transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
          }}
          onClick={() =>
            useWorkflowStore.setState({ palette: { edgeId: props.id } })
          }
        >
          <Plus size={14} />
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
