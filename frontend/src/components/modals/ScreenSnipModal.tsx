/* eslint-disable @next/next/no-img-element -- Templates locais em data URLs precisam de pixels originais para o recorte. */
import { useRef, useState } from "react";
import { Camera, Upload, Crop } from "lucide-react";
import { Modal } from "./Dialog";
import { useWorkflowStore } from "../../stores/useWorkflowStore";
export function ScreenSnipModal() {
  const nodeId = useWorkflowStore((s) => s.snipNodeId);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [box, setBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const img = useRef<HTMLImageElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const generation = useRef(0);
  const close = () => {
    generation.current++;
    setSource("");
    setError("");
    setBox({ x: 0, y: 0, width: 0, height: 0 });
    useWorkflowStore.setState({ snipNodeId: null });
  };
  const capture = async () => {
    const current = ++generation.current;
    let stream: MediaStream | undefined;
    setBusy(true);
    setError("");
    try {
      if (!navigator.mediaDevices?.getDisplayMedia)
        throw new Error(
          "Captura indisponível. Use upload ou abra em HTTPS/localhost.",
        );
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      await new Promise<void>((resolve) =>
        video.requestVideoFrameCallback(() => resolve()),
      );
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      if (current === generation.current)
        setSource(canvas.toDataURL("image/png"));
      video.srcObject = null;
    } catch (e) {
      if (current === generation.current)
        setError(
          e instanceof Error ? e.message : "Não foi possível capturar a tela.",
        );
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      setBusy(false);
    }
  };
  const save = async () => {
    if (!img.current || !nodeId) return;
    setBusy(true);
    try {
      const c = document.createElement("canvas");
      c.width = Math.round(box.width);
      c.height = Math.round(box.height);
      if (
        box.x < 0 ||
        box.y < 0 ||
        box.x + box.width > img.current.naturalWidth ||
        box.y + box.height > img.current.naturalHeight
      )
        throw new Error("O recorte deve estar dentro da imagem.");
      if (c.width < 1 || c.height < 1)
        throw new Error("Selecione uma região da imagem.");
      c.getContext("2d")!.drawImage(
        img.current,
        box.x,
        box.y,
        box.width,
        box.height,
        0,
        0,
        c.width,
        c.height,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        c.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Falha no recorte"))),
          "image/png",
        ),
      );
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
        ),
      )
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      const path = `assets/${hash}.png`;
      const url = c.toDataURL("image/png");
      useWorkflowStore.setState((s) => ({
        assets: { ...s.assets, [path]: url },
        workflows: s.workflows.map((w) =>
          w.id !== s.activeId
            ? w
            : {
                ...w,
                metadata: {
                  ...w.metadata,
                  updated_at: new Date().toISOString(),
                },
                nodes: w.nodes.map((n) =>
                  n.id !== nodeId || n.type !== "action"
                    ? n
                    : {
                        ...n,
                        data: {
                          ...n.data,
                          config: { ...n.data.config, image_asset: path },
                        },
                      },
                ),
              },
        ),
      }));
      close();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={!!nodeId}
      onClose={close}
      title="Capturar template visual"
      description="Compartilhe uma tela ou envie uma imagem. Arraste sobre a prévia para recortar."
    >
      <div className="snip-actions">
        <button className="secondary" disabled={busy} onClick={capture}>
          <Camera size={17} /> Capturar tela
        </button>
        <label className="secondary">
          <Upload size={17} /> Enviar imagem
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 15 * 1024 * 1024) {
                setError("Use uma imagem de até 15 MB.");
                return;
              }
              const r = new FileReader();
              r.onload = () => {
                setSource(String(r.result));
                setError("");
              };
              r.readAsDataURL(f);
            }}
          />
        </label>
      </div>
      {source ? (
        <>
          <div
            className="crop-stage"
            onPointerDown={(e) => {
              if (!img.current) return;
              const r = img.current.getBoundingClientRect();
              const x = Math.max(
                  0,
                  Math.min(
                    img.current.naturalWidth,
                    ((e.clientX - r.left) / r.width) * img.current.naturalWidth,
                  ),
                ),
                y = Math.max(
                  0,
                  Math.min(
                    img.current.naturalHeight,
                    ((e.clientY - r.top) / r.height) *
                      img.current.naturalHeight,
                  ),
                );
              start.current = { x, y };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!start.current || !img.current) return;
              const r = img.current.getBoundingClientRect();
              const x = Math.max(
                  0,
                  Math.min(
                    img.current.naturalWidth,
                    ((e.clientX - r.left) / r.width) * img.current.naturalWidth,
                  ),
                ),
                y = Math.max(
                  0,
                  Math.min(
                    img.current.naturalHeight,
                    ((e.clientY - r.top) / r.height) *
                      img.current.naturalHeight,
                  ),
                );
              setBox({
                x: Math.min(x, start.current.x),
                y: Math.min(y, start.current.y),
                width: Math.abs(x - start.current.x),
                height: Math.abs(y - start.current.y),
              });
            }}
            onPointerUp={() => {
              start.current = null;
            }}
            onPointerCancel={() => {
              start.current = null;
            }}
          >
            <img
              ref={img}
              src={source}
              alt="Imagem para recortar"
              draggable={false}
              onLoad={() => {
                if (img.current) {
                  setDimensions({
                    width: img.current.naturalWidth,
                    height: img.current.naturalHeight,
                  });
                  setBox({
                    x: 0,
                    y: 0,
                    width: img.current.naturalWidth,
                    height: img.current.naturalHeight,
                  });
                }
              }}
              onError={() => setError("Imagem inválida.")}
            />
            {source && (
              <div
                className="crop-box"
                style={{
                  left: `${(box.x / dimensions.width) * 100}%`,
                  top: `${(box.y / dimensions.height) * 100}%`,
                  width: `${(box.width / dimensions.width) * 100}%`,
                  height: `${(box.height / dimensions.height) * 100}%`,
                }}
              />
            )}
          </div>
          <div className="field-grid">
            {(["x", "y", "width", "height"] as const).map((k) => (
              <label className="field" key={k}>
                {k}
                <input
                  type="number"
                  min="0"
                  value={Math.round(box[k])}
                  onChange={(e) =>
                    setBox({
                      ...box,
                      [k]: Math.max(0, e.target.valueAsNumber || 0),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <button
            disabled={busy || box.width < 1 || box.height < 1}
            className="primary"
            onClick={save}
          >
            <Crop size={17} /> Usar recorte
          </button>
        </>
      ) : (
        <div className="snip-empty">
          <Crop size={36} />
          <p>Seu template aparece aqui</p>
          <small>
            Selecione apenas o elemento que a automação deve encontrar.
          </small>
        </div>
      )}
      {error && (
        <p role="alert" className="warning">
          {error}
        </p>
      )}
    </Modal>
  );
}
