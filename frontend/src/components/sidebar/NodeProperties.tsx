/* eslint-disable @next/next/no-img-element -- Templates locais em data URLs precisam de pixels originais para o recorte. */
import { useState } from "react";
import {
  Settings2,
  Camera,
  AlertCircle,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import * as Switch from "@radix-ui/react-switch";
import {
  activeWorkflow,
  useWorkflowStore,
} from "../../stores/useWorkflowStore";
import { catalog, nodeIssues, type Config } from "../../types/workflow";
import { ActionIcon } from "../canvas/CustomNodes";
export function JsonField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState("");
  return (
    <label className="field">
      {label}
      <textarea
        value={text}
        rows={3}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const parsed: unknown = JSON.parse(e.target.value);
            if (
              typeof parsed !== "object" ||
              parsed === null ||
              Array.isArray(parsed)
            )
              throw new Error();
            onChange(parsed);
            setError("");
          } catch {
            setError("Informe um objeto JSON válido.");
          }
        }}
      />
      {error && <small className="warning">{error}</small>}
    </label>
  );
}
const labels: Record<string, string> = {
  path: "Caminho do executável",
  args: "Argumentos (um por linha)",
  cwd: "Diretório de trabalho",
  wait_window: "Aguardar janela carregar",
  timeout_sec: "Timeout (segundos)",
  confidence: "Confiança",
  button: "Botão do mouse",
  dx: "Offset X",
  dy: "Offset Y",
  x: "Coordenada X",
  y: "Coordenada Y",
  click_type: "Tipo de clique",
  delay_ms: "Delay antes do clique (ms)",
  duration_ms: "Duração (milissegundos)",
  interval_sec: "Intervalo (segundos)",
  text: "Texto",
  write_method: "Método de escrita",
  keys: "Tecla",
  modifiers: "Modificadores",
  repeat_count: "Repetições",
  region: "Região da tela",
  lang: "Idioma do OCR",
  grayscale: "Escala de cinza",
  binarize: "Binarizar imagem",
  threshold: "Limiar",
  regex_filter: "Filtro regex",
  inputs: "Parâmetros de entrada (JSON)",
};
const options: Record<string, string[]> = {
  button: ["left", "right", "middle"],
  click_type: ["single", "double"],
  write_method: ["paste", "typewrite"],
  lang: ["por", "eng", "por+eng"],
};
export function NodeProperties() {
  const w = useWorkflowStore(activeWorkflow);
  const patch = useWorkflowStore((s) => s.patch);
  const workflows = useWorkflowStore((s) => s.workflows);
  const assets = useWorkflowStore((s) => s.assets);
  const node = w.nodes.find((n) => n.selected && n.type === "action");
  const [tab, setTab] = useState("config");
  if (!node || node.type !== "action")
    return (
      <aside className="inspector">
        <div className="inspector-title">
          <Settings2 size={16} />
          <strong>Propriedades</strong>
        </div>
        <div className="inspector-empty">
          <span>
            <Settings2 size={28} />
          </span>
          <h3>Cada detalhe sob controle</h3>
          <p>Selecione uma etapa no canvas para configurar sua automação.</p>
        </div>
        <div className="workflow-details">
          <h4>Sobre a automação</h4>
          <label className="field">
            Nome
            <input
              value={w.name}
              onChange={(e) =>
                useWorkflowStore.getState().edit((w) => {
                  w.name = e.target.value;
                })
              }
            />
          </label>
          <label className="field">
            Descrição
            <textarea
              placeholder="O que este fluxo automatiza?"
              value={w.description}
              onChange={(e) =>
                useWorkflowStore.getState().edit((w) => {
                  w.description = e.target.value;
                })
              }
            />
          </label>
          <label className="field">
            Tags (separadas por vírgula)
            <input
              value={w.tags.join(", ")}
              onChange={(e) =>
                useWorkflowStore.getState().edit((w) => {
                  w.tags = e.target.value.split(",").map((t) => t.trim());
                })
              }
            />
          </label>
          <div className="tag-row">
            {w.tags.filter(Boolean).map((t, i) => (
              <span key={i}>#{t}</span>
            ))}
          </div>
        </div>
      </aside>
    );
  const data = node.data;
  const config = data.config;
  const update = (key: string, value: unknown) =>
    patch(node.id, { config: { ...config, [key]: value } });
  const issues = nodeIssues(data);
  const field = (key: string, value: unknown) => {
    if (key === "image_asset")
      return (
        <div className="field" key={key}>
          Template visual
          {assets[String(value)] && (
            <img
              src={assets[String(value)]}
              className="inspector-preview"
              alt="Template"
            />
          )}
          <button
            className="capture-button"
            onClick={() => useWorkflowStore.setState({ snipNodeId: node.id })}
          >
            <Camera size={17} />{" "}
            {value ? "Substituir captura" : "Capturar ou enviar imagem"}
          </button>
          <small>
            {String(value) || "PNG, JPG ou WebP • recorte integrado"}
          </small>
        </div>
      );
    if (key === "subroutine_id")
      return (
        <label className="field" key={key}>
          Fluxo da sub-rotina
          <select
            value={String(value)}
            onChange={(e) => update(key, e.target.value)}
          >
            <option value="">Selecione uma sub-rotina</option>
            {workflows
              .filter((f) => f.kind === "subroutine" && f.id !== w.id)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
          </select>
          {!!value && (
            <button
              onClick={() => useWorkflowStore.getState().open(String(value))}
            >
              Abrir sub-rotina <ArrowUpRight size={13} />
            </button>
          )}
        </label>
      );
    if (key === "region")
      return (
        <fieldset key={key}>
          <legend>Região da tela (pixels)</legend>
          <div className="field-grid">
            {Object.entries(value as Config).map(([k, v]) => (
              <label className="field" key={k}>
                {
                  (
                    {
                      x: "X",
                      y: "Y",
                      width: "Largura",
                      height: "Altura",
                    } as Record<string, string>
                  )[k]
                }
                <input
                  type="number"
                  value={Number(v)}
                  onChange={(e) =>
                    update(key, {
                      ...(value as Config),
                      [k]: e.target.valueAsNumber,
                    })
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
      );
    if (key === "inputs")
      return (
        <JsonField
          key={`${node.id}-${key}`}
          label={labels[key]}
          value={value}
          onChange={(v) => update(key, v)}
        />
      );
    if (typeof value === "boolean")
      return (
        <label key={key} className="toggle-field">
          {labels[key]}
          <Switch.Root
            className="switch"
            checked={value}
            onCheckedChange={(v) => update(key, v)}
          >
            <Switch.Thumb />
          </Switch.Root>
        </label>
      );
    if (key === "modifiers")
      return (
        <div key={key} className="field">
          Modificadores
          <div className="key-badges">
            {["ctrl", "alt", "shift", "win"].map((k) => (
              <button
                className={(value as string[]).includes(k) ? "active" : ""}
                key={k}
                onClick={() =>
                  update(
                    key,
                    (value as string[]).includes(k)
                      ? (value as string[]).filter((v) => v !== k)
                      : [...(value as string[]), k],
                  )
                }
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      );
    if (key === "keys")
      return (
        <label key={key} className="field">
          Tecla
          <input
            list="special-keys"
            value={String(value)}
            onChange={(e) => update(key, e.target.value)}
          />
          <datalist id="special-keys">
            {["tab", "enter", "backspace", "esc", "delete", "f5", "c", "v"].map(
              (k) => (
                <option key={k} value={k} />
              ),
            )}
          </datalist>
          <div className="key-badges">
            {["tab", "enter", "backspace", "esc"].map((k) => (
              <button
                key={k}
                className={value === k ? "active" : ""}
                onClick={() => update(key, k)}
              >
                {k}
              </button>
            ))}
          </div>
        </label>
      );
    if (key === "confidence")
      return (
        <label key={key} className="field">
          Confiança{" "}
          <span className="value-badge">
            {Math.round(Number(value) * 100)}%
          </span>
          <input
            type="range"
            min="0.7"
            max="1"
            step="0.01"
            value={Number(value)}
            onChange={(e) => update(key, e.target.valueAsNumber)}
          />
          <small>
            70% · Flexível <span className="float-right">100% · Exato</span>
          </small>
        </label>
      );
    if (options[key]) {
      const opts =
        key === "button" && data.action === "desktop.click_image"
          ? ["left", "right", "double"]
          : options[key];
      return (
        <label className="field" key={key}>
          {labels[key]}
          <select
            value={String(value)}
            onChange={(e) => update(key, e.target.value)}
          >
            {opts.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      );
    }
    return (
      <label className="field" key={key}>
        {labels[key] ?? key}
        {key === "text" || key === "args" ? (
          <textarea
            rows={3}
            placeholder={key === "text" ? "Olá, {{usuario}}" : ""}
            value={Array.isArray(value) ? value.join("\n") : String(value)}
            onChange={(e) =>
              update(
                key,
                key === "args"
                  ? e.target.value.split("\n").filter(Boolean)
                  : e.target.value,
              )
            }
          />
        ) : (
          <input
            type={typeof value === "number" ? "number" : "text"}
            step="any"
            value={
              typeof value === "number"
                ? Number.isFinite(value)
                  ? value
                  : ""
                : String(value)
            }
            onChange={(e) =>
              update(
                key,
                typeof value === "number"
                  ? e.target.valueAsNumber
                  : e.target.value,
              )
            }
          />
        )}
      </label>
    );
  };
  return (
    <aside className="inspector">
      <div className="inspector-title">
        <Settings2 size={16} />
        <strong>Propriedades da etapa</strong>
        <button
          title="Excluir etapa"
          onClick={() => useWorkflowStore.getState().remove()}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="property-heading">
        <span className="catalog-icon" style={{ color: data.color }}>
          <ActionIcon action={data.action} />
        </span>
        <div>
          <strong>{catalog[data.action].label}</strong>
          <code>{node.id}</code>
        </div>
      </div>
      <div className="sidebar-tabs">
        <button
          className={tab === "config" ? "active" : ""}
          onClick={() => setTab("config")}
        >
          Configuração
        </button>
        <button
          className={tab === "notes" ? "active" : ""}
          onClick={() => setTab("notes")}
        >
          Notas & opções
        </button>
      </div>
      <div className="property-fields">
        <label className="field">
          Nome da etapa
          <input
            value={data.customLabel}
            onChange={(e) => patch(node.id, { customLabel: e.target.value })}
          />
        </label>
        <label className="toggle-field">
          Etapa ativa
          <Switch.Root
            className="switch"
            checked={data.enabled}
            onCheckedChange={(enabled) => patch(node.id, { enabled })}
          >
            <Switch.Thumb />
          </Switch.Root>
        </label>
        {tab === "config" ? (
          <>
            {Object.entries(config).map(([k, v]) => field(k, v))}
            {data.action === "desktop.ocr_extract" && (
              <label className="field">
                Variável de destino
                <input
                  value={data.outputs?.extracted_text ?? ""}
                  onChange={(e) =>
                    patch(node.id, {
                      outputs: { extracted_text: e.target.value },
                    })
                  }
                />
              </label>
            )}
            {data.action === "flow.subroutine" && (
              <JsonField
                key={node.id}
                label="Mapeamento de retornos (JSON)"
                value={data.outputs ?? {}}
                onChange={(v) => {
                  if (
                    Object.values(v as object).every(
                      (x) => typeof x === "string",
                    )
                  )
                    patch(node.id, { outputs: v as Record<string, string> });
                }}
              />
            )}
          </>
        ) : (
          <>
            <label className="field">
              Notas
              <textarea
                rows={7}
                placeholder="Documente decisões e orientações…"
                value={data.notes}
                onChange={(e) => patch(node.id, { notes: e.target.value })}
              />
            </label>
            <label className="field">
              Cor da etapa
              <input
                type="color"
                value={data.color}
                onChange={(e) => patch(node.id, { color: e.target.value })}
              />
            </label>
            <label className="field">
              Tentativas em caso de erro
              <input
                type="number"
                min="1"
                value={data.retry_policy?.max_attempts ?? 1}
                onChange={(e) =>
                  patch(node.id, {
                    retry_policy: {
                      max_attempts: e.target.valueAsNumber,
                      delay_seconds: data.retry_policy?.delay_seconds ?? 2,
                    },
                  })
                }
              />
            </label>
            <label className="field">
              Intervalo entre tentativas (s)
              <input
                type="number"
                min="0"
                value={data.retry_policy?.delay_seconds ?? 2}
                onChange={(e) =>
                  patch(node.id, {
                    retry_policy: {
                      max_attempts: data.retry_policy?.max_attempts ?? 1,
                      delay_seconds: e.target.valueAsNumber,
                    },
                  })
                }
              />
            </label>
          </>
        )}
        {issues.length > 0 && (
          <div className="validation">
            <AlertCircle size={15} />
            <div>
              <strong>Complete a configuração</strong>
              {issues.map((i) => (
                <p key={i}>{i}</p>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="inspector-bottom">
        Use <code>{"{{variavel}}"}</code> para valores dinâmicos.
      </div>
    </aside>
  );
}
