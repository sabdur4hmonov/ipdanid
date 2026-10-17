import fontkit from "@pdf-lib/fontkit";
import { hash } from "./engine";
import { inside } from "./geometry";
import type { Pin, RegionBox, Shape } from "./types";
import {
  LETTERING_FONTS,
  letteringInput,
  type LetteringFont,
} from "./lettering-contract";
export {
  LETTERING_FONTS,
  letteringInput,
  type LetteringFont,
} from "./lettering-contract";
export type GlyphCommand = {
  command:
    "moveTo" | "lineTo" | "quadraticCurveTo" | "bezierCurveTo" | "closePath";
  args: number[];
};
export interface LetteringGeometry {
  version: "shaped-glyph-paths/1";
  text: string;
  font: LetteringFont;
  fontHash: string;
  direction: "ltr" | "rtl";
  glyphs: number[];
  widthMm: number;
  heightMm: number;
  shape: Shape;
  toleranceMm: number;
  bounds: RegionBox;
  commands: GlyphCommand[];
  contours: { x: number; y: number }[][];
}
const fontData = new Map<LetteringFont, Promise<Uint8Array>>();
export async function loadLetteringFont(font: LetteringFont) {
  if (!LETTERING_FONTS[font]) throw Error("lettering/font");
  if (!fontData.has(font))
    fontData.set(
      font,
      (async () => {
        const response = await fetch(LETTERING_FONTS[font].path);
        if (!response.ok) throw Error("lettering/font");
        const bytes = new Uint8Array(await response.arrayBuffer());
        if ((await hash(bytes)) !== LETTERING_FONTS[font].sha256)
          throw Error("lettering/font");
        return bytes;
      })().catch((e) => {
        fontData.delete(font);
        throw e;
      }),
    );
  return new Uint8Array(await fontData.get(font)!);
}
type Point = { x: number; y: number };
const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
function flattenCommands(
  commands: GlyphCommand[],
  widthMm: number,
  heightMm: number,
  tolerance: number,
) {
  const contours: Point[][] = [];
  let path: Point[] = [],
    current: Point = { x: 0, y: 0 };
  const distance = (p: Point, a: Point, b: Point) => {
    const x = (b.x - a.x) * widthMm,
      y = (b.y - a.y) * heightMm,
      px = (p.x - a.x) * widthMm,
      py = (p.y - a.y) * heightMm;
    const t = Math.max(
      0,
      Math.min(1, (px * x + py * y) / (x * x + y * y || 1)),
    );
    return Math.hypot(px - t * x, py - t * y);
  };
  function finish() {
    if (path.length >= 3) {
      const a = path[0],
        b = path.at(-1)!;
      if (Math.hypot((a.x - b.x) * widthMm, (a.y - b.y) * heightMm) > 1e-8)
        path.push({ ...a });
      contours.push(path);
    }
    path = [];
  }
  function quad(a: Point, b: Point, c: Point, depth = 0) {
    if (distance(b, a, c) <= tolerance) {
      path.push(c);
      return;
    }
    if (depth >= 16) throw Error("lettering/geometry");
    const ab = midpoint(a, b),
      bc = midpoint(b, c),
      m = midpoint(ab, bc);
    quad(a, ab, m, depth + 1);
    quad(m, bc, c, depth + 1);
  }
  function cubic(a: Point, b: Point, c: Point, d: Point, depth = 0) {
    if (Math.max(distance(b, a, d), distance(c, a, d)) <= tolerance) {
      path.push(d);
      return;
    }
    if (depth >= 16) throw Error("lettering/geometry");
    const ab = midpoint(a, b),
      bc = midpoint(b, c),
      cd = midpoint(c, d),
      abc = midpoint(ab, bc),
      bcd = midpoint(bc, cd),
      m = midpoint(abc, bcd);
    cubic(a, ab, abc, m, depth + 1);
    cubic(m, bcd, cd, d, depth + 1);
  }
  for (const c of commands) {
    const p = (j: number) => ({ x: c.args[j], y: c.args[j + 1] });
    if (c.command === "moveTo") {
      finish();
      current = p(0);
      path = [current];
    } else if (c.command === "lineTo") {
      current = p(0);
      path.push(current);
    } else if (c.command === "quadraticCurveTo") {
      quad(current, p(0), p(2));
      current = p(2);
    } else if (c.command === "bezierCurveTo") {
      cubic(current, p(0), p(2), p(4));
      current = p(4);
    } else if (c.command === "closePath") finish();
  }
  finish();
  return contours;
}
export async function shapeLettering(
  input: string,
  bytes: Uint8Array,
  board: { widthMm: number; heightMm: number; shape: Shape },
): Promise<LetteringGeometry> {
  const { text, font: fontId } = letteringInput(input),
    fontHash = await hash(bytes);
  if (fontHash !== LETTERING_FONTS[fontId].sha256)
    throw Error("lettering/font");
  const { widthMm, heightMm, shape } = board;
  if (
    ![widthMm, heightMm].every(
      (v) => Number.isFinite(v) && v >= 50 && v <= 2000,
    ) ||
    !["circle", "rectangle", "heart"].includes(shape) ||
    (shape === "circle" && widthMm !== heightMm)
  )
    throw Error("lettering/board");
  const font = fontkit.create(bytes);
  for (const char of text)
    if (
      !/[\u200c\u200d]/u.test(char) &&
      !font.hasGlyphForCodePoint(char.codePointAt(0)!)
    )
      throw Error("lettering/glyph");
  // The installed OpenType shaper selects Arabic contextual forms/positions and
  // returns visual glyph order. Logical Unicode input itself is never reversed.
  const run = font.layout(text),
    direction = run.direction;
  if (
    (direction !== "ltr" && direction !== "rtl") ||
    (fontId === "arabic" && direction !== "rtl")
  )
    throw Error("lettering/shaping");
  const raw: GlyphCommand[] = [];
  let penX = 0,
    penY = 0,
    minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  run.glyphs.forEach((glyph, j) => {
    const position = run.positions[j],
      x = penX + position.xOffset,
      y = penY + position.yOffset,
      commands = (glyph.path as unknown as { commands: GlyphCommand[] })
        .commands;
    if (commands.length) {
      const b = glyph.path.bbox;
      minX = Math.min(minX, x + b.minX);
      maxX = Math.max(maxX, x + b.maxX);
      minY = Math.min(minY, y + b.minY);
      maxY = Math.max(maxY, y + b.maxY);
      for (const command of commands) {
        if (
          ![
            "moveTo",
            "lineTo",
            "quadraticCurveTo",
            "bezierCurveTo",
            "closePath",
          ].includes(command.command)
        )
          throw Error("lettering/geometry");
        raw.push({
          command: command.command,
          args: command.args.map((v, k) => v + (k % 2 ? y : x)),
        });
      }
    }
    penX += position.xAdvance;
    penY += position.yAdvance;
  });
  if (!(maxX > minX && maxY > minY) || raw.length > 40000)
    throw Error("lettering/geometry");
  const fit =
      shape === "circle"
        ? { left: 0.18, top: 0.18, width: 0.64, height: 0.64 }
        : shape === "heart"
          ? { left: 0.28, top: 0.4, width: 0.44, height: 0.32 }
          : { left: 0.1, top: 0.1, width: 0.8, height: 0.8 },
    scale = Math.min(
      (fit.width * widthMm) / (maxX - minX),
      (fit.height * heightMm) / (maxY - minY),
    ),
    actualWidth = (maxX - minX) * scale,
    actualHeight = (maxY - minY) * scale,
    originX = (fit.left + fit.width / 2) * widthMm - actualWidth / 2,
    originY = (fit.top + fit.height / 2) * heightMm - actualHeight / 2,
    commands = raw.map((c) => ({
      command: c.command,
      args: c.args.map((v, k) =>
        k % 2
          ? (originY + (maxY - v) * scale) / heightMm
          : (originX + (v - minX) * scale) / widthMm,
      ),
    })),
    toleranceMm = 0.2,
    contours = flattenCommands(commands, widthMm, heightMm, toleranceMm);
  if (
    !contours.length ||
    contours.length > 512 ||
    contours.some((c) => c.some((p) => !inside(shape, p.x, p.y)))
  )
    throw Error("lettering/clipped");
  return {
    version: "shaped-glyph-paths/1",
    text,
    font: fontId,
    fontHash,
    direction,
    glyphs: run.glyphs.map((g) => g.id),
    widthMm,
    heightMm,
    shape,
    toleranceMm,
    bounds: {
      left: originX / widthMm,
      top: originY / heightMm,
      width: actualWidth / widthMm,
      height: actualHeight / heightMm,
    },
    commands,
    contours,
  };
}
// Deterministic 4×4 subpixel scanline fill with nonzero winding. No browser/system
// font fallback and no source overlay: these bytes are the actual solver target.
export function rasterLettering(
  g: LetteringGeometry,
  n: number,
  background = [255, 255, 255],
  ink = [0, 0, 0],
) {
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 500 ||
    [...background, ...ink].some(
      (v) => !Number.isInteger(v) || v < 0 || v > 255,
    ) ||
    background.length !== 3 ||
    ink.length !== 3
  )
    throw Error("lettering/raster");
  const aa = 4,
    side = n * aa,
    coverage = new Uint8Array(n * n),
    edges: { a: Point; b: Point }[] = [];
  for (const contour of g.contours)
    for (let j = 1; j < contour.length; j++)
      edges.push({
        a: {
          x: (0.5 + contour[j - 1].x * (n - 1)) * aa,
          y: (0.5 + contour[j - 1].y * (n - 1)) * aa,
        },
        b: {
          x: (0.5 + contour[j].x * (n - 1)) * aa,
          y: (0.5 + contour[j].y * (n - 1)) * aa,
        },
      });
  for (let y = 0; y < side; y++) {
    const sample = y + 0.5,
      crossings: { x: number; w: number }[] = [];
    for (const { a, b } of edges)
      if (
        a.y !== b.y &&
        sample >= Math.min(a.y, b.y) &&
        sample < Math.max(a.y, b.y)
      )
        crossings.push({
          x: a.x + ((sample - a.y) * (b.x - a.x)) / (b.y - a.y),
          w: b.y > a.y ? 1 : -1,
        });
    crossings.sort((a, b) => a.x - b.x);
    let winding = 0,
      previous = 0;
    for (const crossing of crossings) {
      if (winding)
        for (
          let x = Math.max(0, Math.ceil(previous - 0.5));
          x < Math.min(side, Math.ceil(crossing.x - 0.5));
          x++
        )
          coverage[Math.floor(y / aa) * n + Math.floor(x / aa)]++;
      winding += crossing.w;
      previous = crossing.x;
    }
  }
  return Uint8Array.from({ length: n * n * 3 }, (_, j) => {
    const k = Math.floor(j / 3),
      c = j % 3,
      alpha = inside(g.shape, (k % n) / (n - 1), Math.floor(k / n) / (n - 1))
        ? coverage[k] / (aa * aa)
        : 0;
    return Math.round(background[c] * (1 - alpha) + ink[c] * alpha);
  });
}
export function letteringPins(
  g: LetteringGeometry,
  count: number,
  minimumDistanceMm: number,
) {
  if (
    !Number.isInteger(count) ||
    count < 24 ||
    count > 240 ||
    !Number.isFinite(minimumDistanceMm) ||
    minimumDistanceMm <= 0
  )
    throw Error("lettering/pin-count");
  const lengths = g.contours.map((points) =>
    points
      .slice(1)
      .reduce(
        (sum, p, j) =>
          sum +
          Math.hypot(
            (p.x - points[j].x) * g.widthMm,
            (p.y - points[j].y) * g.heightMm,
          ),
        0,
      ),
  );
  if (lengths.some((v) => v <= 0) || g.contours.length * 3 > count)
    throw Error("lettering/pin-count");
  const remaining = count - g.contours.length * 3,
    total = lengths.reduce((a, b) => a + b),
    allocations = lengths.map((v) => 3 + Math.floor((remaining * v) / total));
  const ranking = lengths
    .map((v, j) => ({
      j,
      f: (remaining * v) / total - Math.floor((remaining * v) / total),
    }))
    .sort((a, b) => b.f - a.f || a.j - b.j);
  for (
    let j = 0, missing = count - allocations.reduce((a, b) => a + b);
    j < missing;
    j++
  )
    allocations[ranking[j].j]++;
  const pins: Pin[] = [],
    contours: { start: number; count: number }[] = [];
  g.contours.forEach((points, j) => {
    contours.push({ start: pins.length, count: allocations[j] });
    let at = 1,
      passed = 0;
    for (let k = 0; k < allocations[j]; k++) {
      const position = (k * lengths[j]) / allocations[j];
      let distance = Math.hypot(
        (points[at].x - points[at - 1].x) * g.widthMm,
        (points[at].y - points[at - 1].y) * g.heightMm,
      );
      while (passed + distance < position && at < points.length - 1) {
        passed += distance;
        at++;
        distance = Math.hypot(
          (points[at].x - points[at - 1].x) * g.widthMm,
          (points[at].y - points[at - 1].y) * g.heightMm,
        );
      }
      const t = distance ? (position - passed) / distance : 0;
      pins.push({
        id: pins.length,
        x: points[at - 1].x + (points[at].x - points[at - 1].x) * t,
        y: points[at - 1].y + (points[at].y - points[at - 1].y) * t,
      });
    }
  });
  for (let a = 0; a < pins.length; a++)
    for (let b = a + 1; b < pins.length; b++)
      if (
        Math.hypot(
          (pins[a].x - pins[b].x) * g.widthMm,
          (pins[a].y - pins[b].y) * g.heightMm,
        ) < minimumDistanceMm
      )
        throw Error("lettering/spacing");
  return { pins, contours };
}
