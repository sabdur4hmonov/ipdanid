export const LETTERING_FONTS = {
  sans: {
    path: "/fonts/NotoSans-Regular.ttf",
    family: "Noto Sans",
    sha256: "b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5",
  },
  arabic: {
    path: "/fonts/NotoNaskhArabic-Regular.ttf",
    family: "Noto Naskh Arabic",
    sha256: "a87da9e7687b097af15f9dc217fe3e2dd80bcb3d50eccb394a4aece74b1ca4d9",
  },
} as const;
export type LetteringFont = keyof typeof LETTERING_FONTS;
export function letteringInput(input: string) {
  if (typeof input !== "string") throw Error("lettering/text");
  const text = input.trim().normalize("NFC"),
    arabic = /\p{Script=Arabic}/u.test(text);
  if (
    !text ||
    [...text].length > 64 ||
    /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(text)
  )
    throw Error("lettering/text");
  if (arabic && /[\p{Script=Latin}\p{Script=Cyrillic}]/u.test(text))
    throw Error("lettering/mixed-script");
  return { text, font: (arabic ? "arabic" : "sans") as LetteringFont };
}
export interface LetteringProduct {
  version: "thread-lettering/1";
  style: "target" | "outline";
  text: string;
  font: LetteringFont;
  fontHash: string;
  direction: "ltr" | "rtl";
  glyphs: number[];
  geometryVersion: "shaped-glyph-paths/1";
  toleranceMm: number;
}
export function validLetteringProduct(p: LetteringProduct) {
  if (
    !p ||
    p.version !== "thread-lettering/1" ||
    !["target", "outline"].includes(p.style) ||
    p.geometryVersion !== "shaped-glyph-paths/1" ||
    p.toleranceMm !== 0.2 ||
    !Array.isArray(p.glyphs) ||
    p.glyphs.length < 1 ||
    p.glyphs.length > 256 ||
    p.glyphs.some((v) => !Number.isInteger(v) || v <= 0 || v > 65535)
  )
    throw Error("Invalid lettering provenance");
  const input = letteringInput(p.text);
  if (
    input.text !== p.text ||
    input.font !== p.font ||
    p.fontHash !== LETTERING_FONTS[p.font]?.sha256 ||
    p.direction !== (p.font === "arabic" ? "rtl" : "ltr")
  )
    throw Error("Invalid lettering provenance");
}
export interface GlyphLayout {
  version: "glyph-outline/1";
  templateVersion: "glyph-coordinates/1";
  product: LetteringProduct;
  contours: { start: number; count: number }[];
  bridges: "between-closed-loops/1";
  coordinateHash: string;
}
