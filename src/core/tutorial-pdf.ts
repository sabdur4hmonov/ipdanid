import {
  PDFDocument,
  rgb,
  moveTo,
  lineTo,
  closePath,
  stroke,
  fill,
  pushGraphicsState,
  popGraphicsState,
  setFillingColor,
  setStrokingColor,
  setLineWidth,
  setDashPattern,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  TUTORIALS,
  tutorialDiagram,
  validateTutorial,
  type TutorialPlan,
  type Draw,
} from "./tutorials";
import { tutorialPhrase, tutorialText } from "../tutorial-i18n";
import type { Locale } from "./types";
const mm = 72 / 25.4;
export async function tutorialPdf(
  value: TutorialPlan,
  locale: Locale,
  confirmed: number,
  fontBytes?: Uint8Array,
) {
  const g = await validateTutorial(value),
    lesson = TUTORIALS[g.id];
  if (
    !Number.isSafeInteger(confirmed) ||
    confirmed < 0 ||
    confirmed > lesson.steps.length
  )
    throw Error("tutorial/progress");
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    fontBytes ??
      new Uint8Array(
        await (await fetch("/fonts/NotoSans-Regular.ttf")).arrayBuffer(),
      ),
    { subset: true },
  );
  doc.setTitle(tutorialPhrase(lesson.title, locale));
  doc.setSubject(g.sequenceHash);
  const t = (k: Parameters<typeof tutorialText>[1]) => tutorialText(locale, k),
    phrase = (w: Parameters<typeof tutorialPhrase>[0]) =>
      tutorialPhrase(w, locale);
  const text = (
    p: ReturnType<typeof doc.addPage>,
    s: string,
    x: number,
    y: number,
    size = 10,
  ) => p.drawText(s, { x, y, font, size });
  const wrap = (p: ReturnType<typeof doc.addPage>, s: string, y: number) => {
    let line = "";
    for (const word of s.split(" ")) {
      if (font.widthOfTextAtSize(line + " " + word, 10) > 490) {
        text(p, line, 45, y);
        y -= 16;
        line = word;
      } else line += (line ? " " : "") + word;
    }
    text(p, line, 45, y);
    return y - 26;
  };
  const draw = (
    p: ReturnType<typeof doc.addPage>,
    commands: Draw[],
    left: number,
    top: number,
    scale: number,
  ) => {
    const color = (hex: string) =>
      rgb(
        ...([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
          number,
          number,
          number,
        ]),
      );
    for (const c of commands) {
      if (c.type === "ellipse")
        p.drawEllipse({
          x: left + c.x * scale,
          y: top - c.y * scale,
          xScale: c.rx * scale,
          yScale: c.ry * scale,
          color: color(c.color),
        });
      else if (c.type === "text")
        text(p, c.text, left + c.x * scale, top - c.y * scale, 3 * scale);
      else {
        p.pushOperators(
          pushGraphicsState(),
          setLineWidth(0.3 * scale),
          setStrokingColor(color(c.color)),
          setDashPattern(c.dash ? [2 * scale, scale] : [], 0),
        );
        const path = () =>
          c.points.map(([x, y], i) =>
            (i ? lineTo : moveTo)(left + x * scale, top - y * scale),
          );
        if (c.fill)
          p.pushOperators(
            setFillingColor(color(c.fill)),
            ...path(),
            closePath(),
            fill(),
          );
        p.pushOperators(
          ...path(),
          ...(c.closed ? [closePath()] : []),
          stroke(),
          popGraphicsState(),
        );
      }
    }
  };
  const footer = (p: ReturnType<typeof doc.addPage>) =>
    text(p, g.sequenceHash, 45, 25, 7);
  const cover = doc.addPage([210 * mm, 297 * mm]);
  text(cover, phrase(lesson.title), 45, 790, 18);
  let y = wrap(cover, t("intro"), 756);
  y = wrap(
    cover,
    `${t("saved")}: ${confirmed}/${lesson.steps.length} · ~${lesson.minutes} min`,
    y,
  );
  y = wrap(cover, t("materials"), y);
  y = wrap(cover, phrase(lesson.materials), y);
  y = wrap(cover, t("illustration"), y);
  const overview = tutorialDiagram(g.id, Math.min(lesson.steps.length, 4));
  draw(
    cover,
    overview.commands,
    65,
    y - 15,
    Math.min(450 / overview.width, (y - 100) / overview.height),
  );
  footer(cover);
  for (const [i, words] of lesson.steps.entries()) {
    const p = doc.addPage([210 * mm, 297 * mm]);
    text(
      p,
      `${t("step")} ${i + 1}/${lesson.steps.length}${i < confirmed ? " +" : ""}`,
      45,
      790,
      18,
    );
    const bottom = wrap(p, phrase(words), 755),
      d = tutorialDiagram(g.id, i + 1);
    draw(
      p,
      d.commands,
      65,
      bottom - 20,
      Math.min(440 / d.width, 300 / d.height),
    );
    wrap(p, t("key"), 150);
    wrap(p, t("illustration"), 112);
    footer(p);
  }
  if (g.id !== "ebru") {
    const p = doc.addPage([297 * mm, 210 * mm]),
      d = tutorialDiagram(g.id, 1),
      left = ((297 - d.width) / 2) * mm,
      top = 180 * mm;
    text(p, t("scale"), 15 * mm, 197 * mm, 9);
    draw(p, d.commands, left, top, mm);
    p.drawLine({
      start: { x: 15 * mm, y: 15 * mm },
      end: { x: 65 * mm, y: 15 * mm },
      thickness: 0.3 * mm,
    });
    for (const x of [15, 65])
      p.drawLine({
        start: { x: x * mm, y: 13 * mm },
        end: { x: x * mm, y: 17 * mm },
        thickness: 0.3 * mm,
      });
    text(p, "50 mm - 100%", 15 * mm, 8 * mm, 8);
    text(p, g.sequenceHash, 100 * mm, 8 * mm, 6);
  }
  return doc.save();
}
