import bidiFactory from "bidi-js";
export const BIDI_VERSION = "unicode-bidi13/1" as const;
export interface TextRun {
  start: number;
  end: number;
  level: number;
  font: "sans" | "arabic";
  direction: "ltr" | "rtl";
  text: string;
  displayText: string;
}
export interface ShapedTextRun extends TextRun {
  fontHash: string;
  glyphs: number[];
}
let processor: ReturnType<typeof bidiFactory> | undefined;
export function textInput(input: string) {
  if (typeof input !== "string") throw Error("lettering/text");
  const text = input.trim().normalize("NFC");
  if (
    !text ||
    [...text].length > 64 ||
    /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(text)
  )
    throw Error("lettering/text");
  return {
    text,
    font: /\p{Script=Arabic}/u.test(text)
      ? ("arabic" as const)
      : ("sans" as const),
  };
}
// Resolve UAX9 levels and mirroring first. Reorder RUNS, never logical Arabic
// input passed to OpenType: the shaper owns joining/ligatures and glyph order.
export function bidiTextRuns(input: string) {
  const { text } = textInput(input),
    bidi = (processor ??= bidiFactory()),
    embedding = bidi.getEmbeddingLevels(text),
    mirrors = bidi.getMirroredCharactersMap(text, embedding),
    logical: TextRun[] = [],
    ids = new Int16Array(text.length),
    order = Array.from({ length: text.length }, (_, j) => j);
  let last: TextRun | undefined;
  for (let j = 0; j < text.length;) {
    const char = String.fromCodePoint(text.codePointAt(j)!),
      level = embedding.levels[j],
      font =
        /\p{Script=Arabic}/u.test(char) ||
        (level % 2 && /[\p{Mark}\u200c\u200d\u0640]/u.test(char))
          ? "arabic"
          : "sans";
    if (!last || last.level !== level || last.font !== font) {
      last = {
        start: j,
        end: j,
        level,
        font,
        direction: level % 2 ? "rtl" : "ltr",
        text: "",
        displayText: "",
      };
      logical.push(last);
    }
    last.end = j + char.length;
    last.text += char;
    last.displayText += mirrors.get(j) ?? char;
    for (let k = j; k < last.end; k++) ids[k] = logical.length - 1;
    j += char.length;
  }
  for (const [start, end] of bidi.getReorderSegments(text, embedding))
    for (let a = start, b = end; a < b; a++, b--)
      [order[a], order[b]] = [order[b], order[a]];
  const seen = new Set<number>(),
    runs: TextRun[] = [];
  for (const j of order)
    if (!seen.has(ids[j])) {
      seen.add(ids[j]);
      runs.push(logical[ids[j]]);
    }
  return {
    version: BIDI_VERSION,
    text,
    direction:
      embedding.paragraphs[0].level % 2 ? ("rtl" as const) : ("ltr" as const),
    runs,
  };
}
