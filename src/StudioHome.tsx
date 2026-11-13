import type { ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ImagePlus,
  MoveUpRight,
  Route,
  ScanLine,
  Sparkles,
} from "lucide-react";
import type { Locale, Shape } from "./core/types";
import { customerFlowText } from "./customer-flow-i18n";
import { studioHomeText } from "./studio-home-i18n";
import craftSmall from "./assets/craft-concept-v1-576.webp";
import craftLarge from "./assets/craft-concept-v1-1152.webp";

export function StudioMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M9 28L20 8L31 28L9 16H31L9 28Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <circle cx="20" cy="8" r="2" fill="currentColor" />
      <circle cx="9" cy="28" r="2" fill="currentColor" />
      <circle cx="31" cy="28" r="2" fill="currentColor" />
    </svg>
  );
}

function ShapeDrawing({ shape }: { shape: Shape }) {
  // Schematic artwork only: no simulated portrait or physical quality claim.
  const path =
    shape === "circle"
      ? "M80 12a68 68 0 1 0 0 136a68 68 0 1 0 0-136"
      : shape === "rectangle"
        ? "M16 16H144V144H16Z"
        : "M80 140C60 120 15 83 15 51C15 14 59 8 80 40C101 8 145 14 145 51C145 83 100 120 80 140Z";
  return (
    <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.6" />
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="4.5"
        strokeDasharray=".1 7"
        strokeLinecap="round"
        opacity=".65"
      />
      <path
        d={path}
        transform="translate(24 24) scale(.7)"
        stroke="currentColor"
        strokeWidth=".7"
        opacity=".22"
      />
    </svg>
  );
}

export function StudioHome({
  brandName,
  locale,
  shape,
  onShape,
  onKit,
  onShop,
  onProjects,
  photoControls,
  children,
}: {
  brandName: string;
  locale: Locale;
  shape: Shape;
  onShape: (shape: Shape) => void;
  onKit: () => void;
  onShop: () => void;
  onProjects: () => void;
  photoControls: ReactNode;
  children: ReactNode;
}) {
  const t = (key: Parameters<typeof studioHomeText>[1]) =>
    studioHomeText(locale, key);
  const toPhoto = () => {
    const el = document.getElementById("studio-upload");
    el?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
    el?.querySelector<HTMLButtonElement | HTMLInputElement>(
      ".photo-source-buttons button, input:not([hidden])",
    )?.focus({ preventScroll: true });
  };
  return (
    <div className="studio-home" data-testid="studio-home">
      <section className="studio-hero" aria-labelledby="studio-title">
        <div className="studio-hero-copy">
          <p className="studio-eyebrow">
            <span />
            {t("eyebrow")}
          </p>
          <h1 id="studio-title">
            <span>{t("titleOne")}</span>
            <span>{t("titleTwo")}</span>
            <em>{t("titleThree")}</em>
          </h1>
          <p className="studio-intro">{t("intro")}</p>
          <div id="studio-upload" className="studio-upload">
            <p className="studio-upload-label">
              <Sparkles size={15} />
              {t("free")}
            </p>
            {children}
            <p className="studio-upload-note">
              <Check size={14} />
              {t("noAccount")}
            </p>
            <div className="studio-photo-options">{photoControls}</div>
          </div>
        </div>
        <figure className="studio-hero-art">
          <img
            src={craftLarge}
            srcSet={`${craftSmall} 576w, ${craftLarge} 1152w`}
            sizes="(max-width: 760px) 100vw, 50vw"
            width="1152"
            height="768"
            alt={t("artAlt")}
            fetchPriority="high"
          />
          <div className="studio-art-stamp" aria-hidden="true">
            <StudioMark />
          </div>
          <div className="studio-art-caption">
            <span className="studio-caption-line" />
            <strong>{t("craftLabel")}</strong>
            <span>{t("craftSub")}</span>
          </div>
          <figcaption>{t("artNote")}</figcaption>
        </figure>
      </section>

      <section className="studio-benefits" aria-label={t("how")}>
        {(
          [
            [ScanLine, "preview", "previewHint"],
            [Route, "guided", "guidedHint"],
            [ImagePlus, "personal", "personalHint"],
          ] as const
        ).map(([Icon, title, hint]) => (
          <div key={title}>
            <Icon size={23} strokeWidth={1.3} />
            <div>
              <h2>{t(title)}</h2>
              <p>{t(hint)}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="studio-section studio-process" id="studio-how">
        <div className="studio-section-heading">
          <p className="studio-eyebrow">{t("processTag")}</p>
          <h2>{t("processTitle")}</h2>
          <p>{t("processIntro")}</p>
        </div>
        <div className="studio-process-grid">
          {(
            [
              [ImagePlus, "photoTitle", "photoBody"],
              [ScanLine, "adjustTitle", "adjustBody"],
              [Route, "makeTitle", "makeBody"],
            ] as const
          ).map(([Icon, title, body], index) => (
            <article key={title}>
              <div className="studio-process-top">
                <span>0{index + 1}</span>
                <Icon size={28} strokeWidth={1.2} />
              </div>
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="studio-section studio-shapes" id="studio-shapes">
        <div className="studio-section-heading">
          <p className="studio-eyebrow">{t("shapeTag")}</p>
          <h2>{t("shapeTitle")}</h2>
          <p>{t("shapeIntro")}</p>
        </div>
        <div className="studio-shape-grid">
          {(["circle", "rectangle", "heart"] as const).map((s, index) => (
            <button
              type="button"
              className={`studio-shape studio-shape-${s}`}
              key={s}
              aria-pressed={shape === s}
              data-testid={`home-shape-${s}`}
              onClick={() => onShape(s)}
            >
              <span className="studio-shape-number">0{index + 1}</span>
              <ShapeDrawing shape={s} />
              <span className="studio-shape-name">
                {customerFlowText(locale, s)}
                <MoveUpRight size={20} />
              </span>
              <span className="studio-shape-body">
                {t(
                  s === "circle"
                    ? "circleBody"
                    : s === "heart"
                      ? "heartBody"
                      : "squareBody",
                )}
              </span>
              <span className="studio-shape-selected">
                {shape === s ? (
                  <>
                    <Check size={14} />
                    {t("selected")}
                  </>
                ) : (
                  t("choose")
                )}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="studio-materials">
        <div>
          <p className="studio-eyebrow">{t("materialsTag")}</p>
          <h2>{t("materialsTitle")}</h2>
          <p>{t("materialsBody")}</p>
          <button className="studio-light-button" onClick={onShop}>
            {t("kitAction")}
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="studio-material-list">
          {(["board", "nails", "thread", "guide"] as const).map((k, i) => (
            <div key={k}>
              <span>0{i + 1}</span>
              <strong>{t(k)}</strong>
              <Check size={16} />
            </div>
          ))}
        </div>
      </section>

      <section className="studio-section studio-faq" id="studio-faq">
        <div className="studio-section-heading">
          <p className="studio-eyebrow">{t("questions")}</p>
          <h2>{t("faqTitle")}</h2>
        </div>
        <div>
          {(
            [
              ["faqPhoto", "faqPhotoBody"],
              ["faqFree", "faqFreeBody"],
              ["faqTime", "faqTimeBody"],
              ["faqPeople", "faqPeopleBody"],
              ["faqResume", "faqResumeBody"],
            ] as const
          ).map(([q, a]) => (
            <details key={q}>
              <summary>
                {t(q)}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{t(a)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="studio-closing">
        <StudioMark />
        <h2>{t("closing")}</h2>
        <p>{t("closingHint")}</p>
        <button onClick={toPhoto}>
          {t("backUpload")}
          <ArrowRight size={18} />
        </button>
        <button className="studio-kit-link" onClick={onKit}>
          {t("haveKit")}
        </button>
      </section>
      <div className="studio-footer">
        <span>
          {brandName} <small>{t("footer")}</small>
        </span>
        <button onClick={onProjects}>
          {t("projects")}
          <MoveUpRight size={14} />
        </button>
      </div>
    </div>
  );
}
