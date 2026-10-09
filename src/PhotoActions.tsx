import { useEffect, useRef, useState, type RefObject } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, Upload } from "lucide-react";
import type { Locale } from "./core/types";
import { photoSourceText } from "./photo-source-i18n";
import "./photo-actions.css";

export function PhotoActions({
  locale,
  onPhoto,
  uploadRef,
  uploadLabel,
  disabled = false,
  hint = true,
}: {
  locale: Locale;
  onPhoto: (file: File) => Promise<void>;
  uploadRef?: RefObject<HTMLInputElement | null>;
  uploadLabel?: string;
  disabled?: boolean;
  hint?: boolean;
}) {
  const ownUpload = useRef<HTMLInputElement>(null),
    gallery = uploadRef ?? ownUpload,
    nativeCapture = useRef<HTMLInputElement>(null),
    video = useRef<HTMLVideoElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    live = useRef<MediaStream | null>(null),
    request = useRef(0),
    mounted = useRef(true);
  const [open, setOpen] = useState(false),
    [ready, setReady] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [facing, setFacing] = useState<"user" | "environment">("user"),
    [stream, setStream] = useState<MediaStream | null>(null);
  const t = (key: Parameters<typeof photoSourceText>[1]) =>
    photoSourceText(locale, key);
  function release() {
    request.current++;
    live.current?.getTracks().forEach((track) => track.stop());
    live.current = null;
  }
  function close() {
    release();
    setStream(null);
    setReady(false);
    setOpen(false);
  }
  useEffect(() => {
    mounted.current = true;
    const hidden = () => {
      if (document.hidden) close();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted.current = false;
      release();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  useEffect(() => {
    if (stream && video.current) {
      video.current.srcObject = stream;
      void video.current.play().catch(() => {
        if (live.current === stream) {
          close();
          setError(t("unavailable"));
        }
      });
    }
  }, [stream]);
  async function accept(file: File) {
    if (loading || disabled) return;
    setError("");
    setLoading(true);
    try {
      await onPhoto(file);
    } catch {
      if (mounted.current) setError(t("failed"));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }
  async function start(direction = facing) {
    release();
    const token = request.current;
    setError("");
    setReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t("unavailable"));
      setOpen(false);
      return;
    }
    setOpen(true);
    setStream(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: direction },
          width: { ideal: 1920 },
          height: { ideal: 1920 },
        },
      });
      if (!mounted.current || token !== request.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      live.current = media;
      setStream(media);
    } catch (e) {
      if (!mounted.current || token !== request.current) return;
      close();
      const name = e instanceof DOMException ? e.name : "";
      setError(
        t(
          name === "NotAllowedError"
            ? "denied"
            : name === "NotFoundError"
              ? "missing"
              : "unavailable",
        ),
      );
    }
  }
  async function capture() {
    const v = video.current,
      token = request.current;
    if (!ready || !v || !v.videoWidth || !v.videoHeight || loading) return;
    setLoading(true);
    let accepted = false;
    try {
      const canvas = document.createElement("canvas"),
        scale = Math.min(1, 2048 / Math.max(v.videoWidth, v.videoHeight));
      canvas.width = Math.max(1, Math.round(v.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(v.videoHeight * scale));
      canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(Error("Capture failed"))),
          "image/jpeg",
          0.95,
        ),
      );
      if (!mounted.current || token !== request.current) return;
      close();
      accepted = true;
      await onPhoto(
        new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }),
      );
    } catch {
      if (mounted.current && (token === request.current || accepted)) {
        close();
        setError(t("failed"));
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }
  return (
    <div className="photo-actions" data-testid="photo-actions">
      <input
        ref={gallery}
        hidden
        type="file"
        aria-label={uploadLabel ?? t("upload")}
        accept="image/jpeg,image/png"
        disabled={disabled || loading || open}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void accept(file);
        }}
      />
      <input
        ref={nativeCapture}
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        data-testid="native-photo-capture"
        disabled={disabled || loading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void accept(file);
        }}
      />
      <div className="photo-source-buttons">
        <button
          type="button"
          className="primary"
          disabled={disabled || loading || open}
          onClick={() => gallery.current?.click()}
        >
          <Upload size={18} />
          {t("upload")}
        </button>
        <button
          type="button"
          className="outline"
          disabled={disabled || loading || open}
          onClick={() => {
            setError("");
            if (Capacitor.isNativePlatform()) nativeCapture.current?.click();
            else void start();
          }}
        >
          <Camera size={18} />
          {t("camera")}
        </button>
      </div>
      {hint && <p className="fineprint">{t("hint")}</p>}
      {loading && <p role="status">{t("loading")}</p>}
      {error && <p role="alert">{error}</p>}
      {open && (
        <dialog
          ref={dialog}
          className="camera-dialog"
          aria-label={t("title")}
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
        >
          <h2>{t("title")}</h2>
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label={t("title")}
            onLoadedMetadata={() =>
              setReady(
                !!video.current?.videoWidth &&
                  video.current.srcObject === live.current,
              )
            }
          />
          {!ready && <p role="status">{t("waiting")}</p>}
          <label>
            {t("facing")}
            <select
              aria-label={t("facing")}
              value={facing}
              disabled={loading}
              onChange={(e) => {
                const direction = e.target.value as typeof facing;
                setFacing(direction);
                void start(direction);
              }}
            >
              <option value="user">{t("front")}</option>
              <option value="environment">{t("back")}</option>
            </select>
          </label>
          <div className="photo-source-buttons">
            <button
              type="button"
              className="primary"
              disabled={!ready || loading}
              onClick={() => void capture()}
            >
              {t("capture")}
            </button>
            <button type="button" className="outline" onClick={close}>
              {t("cancel")}
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
