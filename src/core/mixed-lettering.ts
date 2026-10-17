import fontkit from "@pdf-lib/fontkit";
import { hash } from "./engine";
import { LETTERING_FONTS, type LetteringFont } from "./lettering-contract";
import { bidiTextRuns, textInput, type ShapedTextRun } from "./bidi-runs";
import {
  finishLettering,
  shapeLettering,
  loadLetteringFont,
  type GlyphCommand,
} from "./lettering";
import type { Shape } from "./types";
export { textInput } from "./bidi-runs";
export async function shapeText(
  input: string,
  board: { widthMm: number; heightMm: number; shape: Shape },
  supplied?: Partial<Record<LetteringFont, Uint8Array>>,
) {
  const normalized = textInput(input);
  if (normalized.font === "sans")
    return shapeLettering(
      normalized.text,
      supplied?.sans ?? (await loadLetteringFont("sans")),
      board,
    );
  if (
    ![board.widthMm, board.heightMm].every(
      (v) => Number.isFinite(v) && v >= 50 && v <= 2000,
    ) ||
    !["circle", "rectangle", "heart"].includes(board.shape) ||
    (board.shape === "circle" && board.widthMm !== board.heightMm)
  )
    throw Error("lettering/board");
  const resolved = bidiTextRuns(normalized.text),
    fonts = new Map<LetteringFont, ReturnType<typeof fontkit.create>>();
  for (const id of new Set(resolved.runs.map((r) => r.font))) {
    const bytes = supplied?.[id] ?? (await loadLetteringFont(id));
    if ((await hash(bytes)) !== LETTERING_FONTS[id].sha256)
      throw Error("lettering/font");
    fonts.set(id, fontkit.create(bytes));
  }
  let pen = 0,
    minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const raw: GlyphCommand[] = [],
    runs: ShapedTextRun[] = [];
  for (const r of resolved.runs) {
    const font = fonts.get(r.font)!;
    for (const char of r.displayText)
      if (
        !/[\u200c\u200d]/u.test(char) &&
        !font.hasGlyphForCodePoint(char.codePointAt(0)!)
      )
        throw Error("lettering/glyph");
    // Runtime supports these script/language/direction arguments; the bundled
    // fork's declarations only expose the first two (verified in local source).
    const layout = font.layout as unknown as (
      text: string,
      features: undefined,
      script: string,
      language: undefined,
      direction: "ltr" | "rtl",
    ) => ReturnType<typeof font.layout>;
    const shaped = layout.call(
        font,
        r.displayText,
        undefined,
        r.font === "arabic"
          ? "arab"
          : /\p{Script=Cyrillic}/u.test(r.text)
            ? "cyrl"
            : "latn",
        undefined,
        r.direction,
      ),
      scale = 1000 / font.unitsPerEm;
    runs.push({
      ...r,
      fontHash: LETTERING_FONTS[r.font].sha256,
      glyphs: shaped.glyphs.map((g) => g.id),
    });
    let advanceY = 0;
    shaped.glyphs.forEach((g, j) => {
      const pos = shaped.positions[j],
        x = pen + pos.xOffset * scale,
        y = advanceY + pos.yOffset * scale,
        commands = (g.path as unknown as { commands: GlyphCommand[] }).commands;
      if (commands.length) {
        const b = g.path.bbox;
        minX = Math.min(minX, x + b.minX * scale);
        maxX = Math.max(maxX, x + b.maxX * scale);
        minY = Math.min(minY, y + b.minY * scale);
        maxY = Math.max(maxY, y + b.maxY * scale);
        for (const c of commands)
          raw.push({
            command: c.command,
            args: c.args.map((v, k) => v * scale + (k % 2 ? y : x)),
          });
      }
      pen += pos.xAdvance * scale;
      advanceY += pos.yAdvance * scale;
    });
  }
  return finishLettering(
    resolved.text,
    "arabic",
    LETTERING_FONTS.arabic.sha256,
    resolved.direction,
    runs.flatMap((r) => r.glyphs),
    raw,
    [minX, minY, maxX, maxY],
    board,
    runs,
  );
}
