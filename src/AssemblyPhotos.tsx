import { useEffect, useRef, useState } from "react";
import type { Instruction, Locale } from "./core/types";
import { loadPhoto } from "./core/image";
import { PhotoActions } from "./PhotoActions";
import { Preview } from "./screens/GuidePreview";
import {
  boardPhotoDigest,
  boardPhotoScopeKey,
  validateBoardPhoto,
  type BoardPhoto,
  type BoardPhotoScope,
} from "./assembly-photo";
import {
  readBoardPhotos,
  saveBoardPhoto,
  deleteBoardPhoto,
} from "./assembly-photo-storage";
import { assemblyPhotoText } from "./assembly-photo-i18n";
export default function AssemblyPhotos(props: {
  locale: Locale;
  instruction: Instruction;
  scope: BoardPhotoScope;
  pause: () => void;
  jump: (step: number) => void;
}) {
  const [enabled, setEnabled] = useState(false),
    [photos, setPhotos] = useState<BoardPhoto[]>([]),
    [candidate, setCandidate] = useState<BoardPhoto>(),
    [selected, setSelected] = useState<BoardPhoto>(),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  let scopeKey = "";
  try {
    scopeKey = boardPhotoScopeKey(props.scope);
  } catch {}
  const ticket = useRef(0),
    latest = useRef({ scopeKey, enabled });
  latest.current = { scopeKey, enabled };
  const t = (k: Parameters<typeof assemblyPhotoText>[1]) =>
    assemblyPhotoText(props.locale, k);
  useEffect(() => {
    ticket.current++;
    setCandidate(undefined);
    setSelected(undefined);
    setError("");
    setSaving(false);
  }, [scopeKey, enabled]);
  useEffect(() => {
    let live = true;
    if (enabled && scopeKey)
      void readBoardPhotos(props.scope)
        .then((rows) => {
          if (live) setPhotos(rows);
        })
        .catch(() => {
          if (live) setError(t("failed"));
        });
    return () => {
      live = false;
    };
  }, [enabled, props.scope.projectId, props.scope.sequenceHash]);
  useEffect(() => {
    let live = true,
      current = "";
    setUrl("");
    const photo = candidate ?? selected;
    if (enabled && photo)
      void validateBoardPhoto(photo)
        .then(() => {
          if (live) {
            current = URL.createObjectURL(photo.blob);
            setUrl(current);
          }
        })
        .catch(() => {
          if (live) setError(t("failed"));
        });
    return () => {
      live = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [enabled, candidate, selected]);
  useEffect(
    () => () => {
      ticket.current++;
    },
    [],
  );
  async function accept(file: File) {
    const id = ++ticket.current,
      key = scopeKey,
      scope = { ...props.scope };
    props.pause();
    const image = await loadPhoto(file);
    try {
      const canvas = document.createElement("canvas"),
        scale = Math.min(1, 960 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas
        .getContext("2d")!
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(Error("board-photo/capture"))),
          "image/jpeg",
          0.85,
        ),
      );
      const photo: BoardPhoto = {
        ...scope,
        version: 1,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        width: canvas.width,
        height: canvas.height,
        digest: await boardPhotoDigest(blob),
        blob,
      };
      await validateBoardPhoto(photo);
      if (
        id === ticket.current &&
        latest.current.scopeKey === key &&
        latest.current.enabled
      ) {
        setCandidate(photo);
        setSelected(undefined);
        setError("");
      }
    } finally {
      image.close();
    }
  }
  async function save() {
    if (!candidate || saving) return;
    const photo = candidate,
      key = scopeKey;
    setSaving(true);
    setError("");
    try {
      await saveBoardPhoto(photo);
      if (latest.current.scopeKey === key && latest.current.enabled) {
        setCandidate(undefined);
        setSelected(photo);
        setPhotos(await readBoardPhotos(props.scope));
      }
    } catch (e) {
      if (latest.current.scopeKey === key)
        setError(t(String(e).includes("capacity") ? "capacity" : "failed"));
    } finally {
      if (latest.current.scopeKey === key) setSaving(false);
    }
  }
  async function remove(photo: BoardPhoto) {
    const key = scopeKey;
    try {
      await deleteBoardPhoto(photo.id, props.scope);
      if (latest.current.scopeKey === key) {
        if (selected?.id === photo.id) setSelected(undefined);
        setPhotos(await readBoardPhotos(props.scope));
      }
    } catch {
      if (latest.current.scopeKey === key) setError(t("failed"));
    }
  }
  const shown = candidate ?? selected;
  return (
    <section className="card" data-testid="assembly-photos">
      <h2>{t("title")}</h2>
      <label className="check-label">
        <input
          type="checkbox"
          disabled={!scopeKey}
          checked={enabled}
          onChange={(e) => {
            ticket.current++;
            setEnabled(e.target.checked);
          }}
        />
        {t("consent")}
      </label>
      {!scopeKey && <p role="status">{t("failed")}</p>}
      {enabled && scopeKey && (
        <>
          <p>{t("help")}</p>
          <div
            onClickCapture={(event) => {
              if (
                (event.target as HTMLElement).closest(
                  ".photo-source-buttons",
                ) &&
                !(event.target as HTMLElement).closest("dialog")
              )
                props.pause();
            }}
          >
            <PhotoActions
              key={scopeKey}
              locale={props.locale}
              disabled={saving}
              hint={false}
              onPhoto={accept}
            />
          </div>
          {error && <p role="alert">{error}</p>}
          {saving && <p role="status">{t("saving")}</p>}
          {shown && url && (
            <div
              className="board-photo-compare"
              data-testid="board-photo-compare"
              data-step={shown.step}
              data-sequence-hash={shown.sequenceHash}
            >
              <p>
                {t("step")} {shown.step}/{shown.total}
              </p>
              <figure>
                <img
                  src={url}
                  alt={t("yourBoard")}
                  style={{
                    width: "100%",
                    maxHeight: 360,
                    objectFit: "contain",
                  }}
                />
                <figcaption>{t("yourBoard")}</figcaption>
              </figure>
              <figure>
                <Preview
                  instruction={props.instruction}
                  completed={shown.step}
                />
                <figcaption>{t("expected")}</figcaption>
              </figure>
              {candidate ? (
                <>
                  <button
                    className="outline"
                    disabled={saving}
                    onClick={() => void save()}
                  >
                    {t("save")}
                  </button>
                  <button
                    className="text-button"
                    disabled={saving}
                    onClick={() => setCandidate(undefined)}
                  >
                    {t("discard")}
                  </button>
                </>
              ) : (
                <button
                  className="outline"
                  onClick={() => props.jump(shown.step)}
                >
                  {t("jump")}
                </button>
              )}
            </div>
          )}
          <h3>{t("saved")}</h3>
          <ul data-testid="board-photo-list">
            {photos.map((photo) => (
              <li key={photo.id} data-step={photo.step}>
                <span>
                  {t("step")} {photo.step}/{photo.total}
                </span>
                <button
                  className="text-button"
                  onClick={() => {
                    ticket.current++;
                    setCandidate(undefined);
                    setSelected(photo);
                  }}
                >
                  {t("open")}
                </button>
                <button
                  className="text-button"
                  onClick={() => void remove(photo)}
                >
                  {t("delete")}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
