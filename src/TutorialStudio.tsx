import { useEffect, useMemo, useRef, useState } from "react";
import {
  TUTORIALS,
  tutorialIds,
  makeTutorial,
  validateTutorial,
  tutorialSvg,
  tutorialMesh,
  type TutorialId,
  type TutorialPlan,
} from "./core/tutorials";
import {
  tutorialMediaManifest,
  tutorialMediaBlob,
  type TutorialMedia,
} from "./core/tutorial-media";
import { localCraftStore, type CraftProject } from "./local-craft-store";
import { MeshPreview } from "./SolidPreview";
import { tutorialText, tutorialPhrase } from "./tutorial-i18n";
import { CraftSpeechButton } from "./CraftSpeechButton";
import type { Locale } from "./core/types";
import { download } from "./download";
const store = localCraftStore(
  "tutorial",
  validateTutorial,
  (g) => TUTORIALS[g.id].steps.length,
);
function Diagram({ svg, label }: { svg: string; label: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [svg]);
  return (
    <img
      src={url || undefined}
      alt={label}
      style={{ width: "100%", maxHeight: 340, objectFit: "contain" }}
    />
  );
}
function OptionalMedia({
  asset,
  locale,
}: {
  asset?: TutorialMedia;
  locale: Locale;
}) {
  const [url, setUrl] = useState(""),
    [failed, setFailed] = useState(false),
    video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    setUrl("");
    setFailed(false);
    if (!asset) return;
    const controller = new AbortController();
    let local = "";
    void tutorialMediaBlob(asset, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        local = URL.createObjectURL(blob);
        setUrl(local);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      video.current?.pause();
      if (local) URL.revokeObjectURL(local);
    };
  }, [asset]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) video.current?.pause();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  if (!asset) return null;
  return (
    <div data-testid="tutorial-owned-media">
      <p>
        {tutorialText(locale, "media")}: {asset.credit} · {asset.license}
      </p>
      {url &&
        (asset.type.startsWith("video/") ? (
          <video
            ref={video}
            src={url}
            controls
            playsInline
            preload="metadata"
            style={{ width: "100%" }}
            onError={() => setFailed(true)}
          />
        ) : (
          <img
            src={url}
            alt={tutorialText(locale, "media")}
            style={{ maxWidth: "100%" }}
            onError={() => setFailed(true)}
          />
        ))}
      {failed && <p role="status">{tutorialText(locale, "mediaError")}</p>}
    </div>
  );
}
export default function TutorialStudio({ locale }: { locale: Locale }) {
  const [library, setLibrary] = useState<CraftProject<TutorialPlan>[]>([]),
    [project, setProject] = useState<CraftProject<TutorialPlan>>(),
    [step, setStep] = useState(1),
    [playing, setPlaying] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [media, setMedia] = useState<TutorialMedia[]>([]),
    lock = useRef(false);
  const t = (k: Parameters<typeof tutorialText>[1]) => tutorialText(locale, k),
    phrase = (w: Parameters<typeof tutorialPhrase>[0]) =>
      tutorialPhrase(w, locale),
    g = project?.guide,
    lesson = g ? TUTORIALS[g.id] : undefined;
  const faces = useMemo(() => (g ? tutorialMesh(g.id) : []), [g?.id]);
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        t(
          e instanceof Error && e.message.includes("conflict")
            ? "conflict"
            : "error",
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    void run(async () => setLibrary(await store.read()));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/tutorials/manifest.json", { signal: controller.signal })
      .then((r) => r.json())
      .then((v) => setMedia(tutorialMediaManifest(v)))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!playing || !lesson) return;
    const timer = setInterval(
      () =>
        setStep((old) => {
          if (old >= lesson.steps.length) {
            setPlaying(false);
            return old;
          }
          return old + 1;
        }),
      8000,
    );
    return () => clearInterval(timer);
  }, [playing, g?.sequenceHash]);
  useEffect(() => {
    setPlaying(false);
  }, [locale, g?.sequenceHash]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  async function start(id: TutorialId) {
    setPlaying(false);
    const all = await store.read(),
      old = all.find((p) => p.guide.id === id);
    if (old) {
      setLibrary(all);
      setProject(old);
      setStep(Math.min(TUTORIALS[id].steps.length, old.confirmed + 1));
      return;
    }
    const guide = await makeTutorial(id),
      p = {
        id: crypto.randomUUID(),
        name: phrase(TUTORIALS[id].title),
        guide,
        confirmed: 0,
        revision: 0,
      };
    setLibrary(await store.save(p));
    setProject(p);
    setStep(1);
  }
  async function exportFile(kind: "json" | "pdf" | "svg") {
    if (!project) return;
    await store.check(project);
    const name = "workshop-" + project.guide.id;
    if (kind === "json")
      await download(
        name + ".json",
        JSON.stringify(
          { schema: "iprasm.workshop-project/1", project },
          null,
          2,
        ),
      );
    else if (kind === "svg")
      await download(
        name + ".svg",
        tutorialSvg(project.guide.id, step),
        "image/svg+xml",
      );
    else {
      const { tutorialPdf } = await import("./core/tutorial-pdf");
      await download(
        name + ".pdf",
        new Blob(
          [
            Uint8Array.from(
              await tutorialPdf(project.guide, locale, project.confirmed),
            ),
          ],
          { type: "application/pdf" },
        ),
      );
    }
  }
  return (
    <section className="card" data-testid="tutorial-studio">
      <h2>{t("title")}</h2>
      <p>{t("intro")}</p>
      <div className="grid-fields">
        {tutorialIds.map((id) => (
          <article
            key={id}
            className="card"
            data-testid={"tutorial-card-" + id}
          >
            <h3>{phrase(TUTORIALS[id].title)}</h3>
            <p>
              ~{TUTORIALS[id].minutes} min · {TUTORIALS[id].steps.length}{" "}
              {t("step")}
            </p>
            <p>
              {t("materials")}: {phrase(TUTORIALS[id].materials)}
            </p>
            <p>
              {t("saved")}:{" "}
              {library.find((p) => p.guide.id === id)?.confirmed ?? 0}/
              {TUTORIALS[id].steps.length}
            </p>
            <button disabled={busy} onClick={() => void run(() => start(id))}>
              {t("open")}
            </button>
          </article>
        ))}
      </div>
      <label>
        {t("import")}
        <input
          aria-label={t("import")}
          type="file"
          accept="application/json,.json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.currentTarget.value = "";
            if (file)
              void run(async () => {
                if (file.size > 5000) throw Error("tutorial/format");
                const value = JSON.parse(await file.text());
                if (value.schema !== "iprasm.workshop-project/1")
                  throw Error("tutorial/format");
                await store.check(value.project);
                const copy = {
                  ...value.project,
                  id: crypto.randomUUID(),
                  revision: 0,
                };
                setLibrary(await store.save(copy));
                setProject(copy);
                setStep(
                  Math.min(
                    TUTORIALS[copy.guide.id as TutorialId].steps.length,
                    copy.confirmed + 1,
                  ),
                );
                setPlaying(false);
              });
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {library.length > 0 && (
        <details>
          <summary>{t("library")}</summary>
          {library.map((p) => (
            <div
              key={p.id}
              className="grid-actions"
              data-testid="tutorial-saved-row"
            >
              <span>
                {phrase(TUTORIALS[p.guide.id].title)} · {p.confirmed}/
                {TUTORIALS[p.guide.id].steps.length}
              </span>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const fresh = await store.load(p.id);
                    setLibrary(fresh.all);
                    setProject(fresh.project);
                    setStep(
                      Math.min(
                        TUTORIALS[fresh.project.guide.id].steps.length,
                        fresh.project.confirmed + 1,
                      ),
                    );
                    setPlaying(false);
                  })
                }
              >
                {t("resume")}
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setLibrary(await store.remove(p.id, p.revision));
                    if (project?.id === p.id) {
                      setProject(undefined);
                      setPlaying(false);
                    }
                  })
                }
              >
                {t("remove")}
              </button>
            </div>
          ))}
        </details>
      )}
      {project && g && lesson && (
        <div
          data-testid="tutorial-player"
          data-confirmed={project.confirmed}
          data-step={step}
        >
          <h3>{phrase(lesson.title)}</h3>
          <p>
            {t("saved")}: {project.confirmed}/{lesson.steps.length} ·{" "}
            {Math.floor((100 * project.confirmed) / lesson.steps.length)}%
          </p>
          <progress
            value={project.confirmed}
            max={lesson.steps.length}
            aria-label={t("saved")}
          />
          {project.confirmed === lesson.steps.length && (
            <p role="status">{t("complete")}</p>
          )}
          <h4>
            {t("step")} {step}/{lesson.steps.length}
          </h4>
          <p data-testid="tutorial-step-text">
            {phrase(lesson.steps[step - 1])}
          </p>
          <Diagram
            svg={tutorialSvg(g.id, step)}
            label={phrase(lesson.title) + " " + step}
          />
          <p>{t("key")}</p>
          <p>{t("illustration")}</p>
          {faces.length > 0 && (
            <MeshPreview
              key={g.sequenceHash}
              faces={faces}
              step={1}
              locale={locale}
              identity={g.sequenceHash}
              title={phrase(lesson.title)}
              testId="tutorial-rotation"
              allowPartOnly={false}
            />
          )}
          <OptionalMedia
            asset={media.find((a) => a.tutorial === g.id && a.step === step)}
            locale={locale}
          />
          <CraftSpeechButton
            identity={g.sequenceHash + ":" + step}
            text={phrase(lesson.steps[step - 1])}
            locale={locale}
          />
          <div className="grid-actions">
            <button
              disabled={busy || step <= 1}
              onClick={() => {
                setPlaying(false);
                setStep(step - 1);
              }}
            >
              {t("previous")}
            </button>
            <button
              disabled={busy || step >= lesson.steps.length}
              onClick={() => {
                setPlaying(false);
                setStep(step + 1);
              }}
            >
              {t("next")}
            </button>
            <button
              disabled={busy || step !== project.confirmed + 1}
              onClick={() =>
                void run(async () => {
                  const p = {
                    ...project,
                    confirmed: step,
                    revision: project.revision + 1,
                  };
                  setLibrary(await store.save(p, project.revision));
                  setProject(p);
                  setPlaying(false);
                  setStep(Math.min(lesson.steps.length, step + 1));
                })
              }
            >
              {t("done")}
            </button>
            <button
              disabled={busy}
              aria-pressed={playing}
              onClick={() => setPlaying(!playing)}
            >
              {t(playing ? "pause" : "play")}
            </button>
          </div>
          <p>{t("playback")}</p>
          <div className="grid-actions">
            {(["pdf", "svg", "export"] as const).map((k) => (
              <button
                key={k}
                disabled={busy}
                onClick={() =>
                  void run(() => exportFile(k === "export" ? "json" : k))
                }
              >
                {t(k)}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
