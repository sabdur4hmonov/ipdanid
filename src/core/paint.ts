import { hash, deepFreeze } from "./engine";

export type PaintColor = { code: string; hex: string };
export type PaintRegion = {
  id: number;
  color: number;
  cells: number[];
  anchor: number;
  labelFits: boolean;
};
export type PaintGuide = {
  schema: "iprasm.paint/1";
  algorithm: "linear-rgb-connected-small-first/1";
  id: string;
  createdAt: string;
  columns: number;
  rows: number;
  pitchMm: number;
  minRegionCells: number;
  palette: PaintColor[];
  cells: number[];
  regions: PaintRegion[];
  sourceHash: string;
  sequenceHash: string;
};
export type PaintProject = {
  id: string;
  name: string;
  guide: PaintGuide;
  progress: { sequenceHash: string; completed: number[]; revision: number };
};
const DIGEST = /^[a-f0-9]{64}$/;
export const MAX_PAINT_REGIONS = 1500;
export function checkPaintSettings(
  columns: number,
  rows: number,
  pitch: number,
  minimum: number,
  palette: PaintColor[],
) {
  if (
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    columns < 8 ||
    rows < 8 ||
    columns > 96 ||
    rows > 96
  )
    throw Error("Invalid paint dimensions (8–96)");
  if (
    !Number.isFinite(pitch) ||
    pitch < 1 ||
    pitch > 10 ||
    !Number.isInteger(minimum) ||
    minimum < 1 ||
    minimum > Math.min(256, columns * rows)
  )
    throw Error("Invalid paint region or physical size");
  if (
    !Array.isArray(palette) ||
    palette.length < 2 ||
    palette.length > 16 ||
    palette.some(
      (c) =>
        !c ||
        typeof c.code !== "string" ||
        typeof c.hex !== "string" ||
        !/^[A-Za-z0-9_-]{1,12}$/.test(c.code) ||
        !/^#[a-fA-F0-9]{6}$/.test(c.hex),
    ) ||
    new Set(palette.map((c) => c.code)).size !== palette.length ||
    new Set(palette.map((c) => c.hex.toLowerCase())).size !== palette.length
  )
    throw Error("Invalid paint palette");
}
function neighbours(index: number, columns: number, rows: number) {
  const x = index % columns,
    y = Math.floor(index / columns);
  return [
    x > 0 ? index - 1 : -1,
    x + 1 < columns ? index + 1 : -1,
    y > 0 ? index - columns : -1,
    y + 1 < rows ? index + columns : -1,
  ].filter((i) => i >= 0);
}
// Four-connected components. Diagonal contact alone never joins paint regions.
function components(cells: number[], columns: number, rows: number) {
  const visited = new Uint8Array(cells.length),
    regions: { color: number; cells: number[] }[] = [];
  for (let start = 0; start < cells.length; start++) {
    if (visited[start]) continue;
    const group = [start];
    visited[start] = 1;
    for (let n = 0; n < group.length; n++)
      for (const j of neighbours(group[n], columns, rows))
        if (!visited[j] && cells[j] === cells[start]) {
          visited[j] = 1;
          group.push(j);
        }
    regions.push({ color: cells[start], cells: group.sort((a, b) => a - b) });
  }
  return regions;
}
const linear = (n: number) => {
  const v = n / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const colorRgb = (hex: string) =>
  [1, 3, 5].map((k) => linear(parseInt(hex.slice(k, k + 2), 16)));
const distance = (a: number[], b: number[]) =>
  a.reduce((s, v, k) => s + [0.2126, 0.7152, 0.0722][k] * (v - b[k]) ** 2, 0);

// Multi-source eight-neighbour distance from every boundary: a conservative
// inscribed square, avoiding labels placed across a hole or a concave edge.
export function paintRegions(
  cells: number[],
  columns: number,
  rows: number,
  pitchMm: number,
): PaintRegion[] {
  return components(cells, columns, rows).map((r, id) => {
    const inside = new Set(r.cells),
      distances = new Map<number, number>(),
      queue: number[] = [];
    for (const k of r.cells) {
      const x = k % columns,
        y = Math.floor(k / columns);
      if (
        x === 0 ||
        y === 0 ||
        x === columns - 1 ||
        y === rows - 1 ||
        [-1, 0, 1].some((dy) =>
          [-1, 0, 1].some((dx) => !inside.has((y + dy) * columns + x + dx)),
        )
      ) {
        distances.set(k, 1);
        queue.push(k);
      }
    }
    for (let q = 0; q < queue.length; q++) {
      const k = queue[q],
        x = k % columns,
        y = Math.floor(k / columns);
      for (const dy of [-1, 0, 1])
        for (const dx of [-1, 0, 1]) {
          const nx = x + dx,
            ny = y + dy,
            j = ny * columns + nx;
          if (
            nx >= 0 &&
            nx < columns &&
            ny >= 0 &&
            ny < rows &&
            inside.has(j) &&
            !distances.has(j)
          ) {
            distances.set(j, distances.get(k)! + 1);
            queue.push(j);
          }
        }
    }
    let anchor = r.cells[0];
    for (const k of r.cells)
      if (distances.get(k)! > distances.get(anchor)!) anchor = k;
    // 2.5mm text, conservative 1.8mm glyph width + .8mm margin.
    const requiredHalf =
      Math.max(2.5, String(r.color + 1).length * 1.8) / 2 + 0.4;
    return {
      id,
      color: r.color,
      cells: r.cells,
      anchor,
      labelFits: (distances.get(anchor)! - 0.5) * pitchMm >= requiredHalf,
    };
  });
}
export function paintPayload(g: PaintGuide) {
  return {
    schema: g.schema,
    algorithm: g.algorithm,
    columns: g.columns,
    rows: g.rows,
    pitchMm: g.pitchMm,
    minRegionCells: g.minRegionCells,
    palette: g.palette,
    cells: g.cells,
    regions: g.regions,
    sourceHash: g.sourceHash,
  };
}
// Maintain the component graph rather than flood-filling the entire photo after
// every merge. The ordering and colour/boundary tie-breaks remain identical.
export function mergePaintCells(
  cells: number[],
  columns: number,
  rows: number,
  minimum: number,
  colors: number[][],
) {
  const groups = components(cells, columns, rows),
    owners = new Int32Array(cells.length);
  const nodes = groups.map((g, id) => ({
    parent: id,
    size: g.cells.length,
    color: g.color,
    edges: new Map<number, number>(),
  }));
  groups.forEach((g, id) => g.cells.forEach((k) => (owners[k] = id)));
  for (let k = 0; k < cells.length; k++)
    for (const n of neighbours(k, columns, rows))
      if (owners[k] !== owners[n]) {
        const edge = nodes[owners[k]].edges;
        edge.set(owners[n], (edge.get(owners[n]) ?? 0) + 1);
      }
  const heap: { id: number; size: number }[] = [],
    less = (a: { id: number; size: number }, b: { id: number; size: number }) =>
      a.size < b.size || (a.size === b.size && a.id < b.id);
  function push(id: number) {
    if (nodes[id].size >= minimum) return;
    const item = { id, size: nodes[id].size };
    heap.push(item);
    let k = heap.length - 1;
    while (k > 0) {
      const parent = (k - 1) >> 1;
      if (!less(item, heap[parent])) break;
      heap[k] = heap[parent];
      k = parent;
    }
    heap[k] = item;
  }
  function pop() {
    const first = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let k = 0;
      while (k * 2 + 1 < heap.length) {
        let next = k * 2 + 1;
        if (next + 1 < heap.length && less(heap[next + 1], heap[next])) next++;
        if (!less(heap[next], last)) break;
        heap[k] = heap[next];
        k = next;
      }
      heap[k] = last;
    }
    return first;
  }
  function root(id: number): number {
    while (nodes[id].parent !== id) {
      nodes[id].parent = nodes[nodes[id].parent].parent;
      id = nodes[id].parent;
    }
    return id;
  }
  function join(a: number, b: number, color: number) {
    a = root(a);
    b = root(b);
    if (a === b) return a;
    const id = Math.min(a, b),
      other = Math.max(a, b),
      edges = new Map<number, number>();
    for (const node of [nodes[a], nodes[b]])
      for (const [n, count] of node.edges)
        if (n !== a && n !== b) edges.set(n, (edges.get(n) ?? 0) + count);
    for (const [n, count] of edges) {
      nodes[n].edges.delete(a);
      nodes[n].edges.delete(b);
      nodes[n].edges.set(id, count);
    }
    nodes[id].size += nodes[other].size;
    nodes[id].color = color;
    nodes[id].edges = edges;
    nodes[other].parent = id;
    nodes[other].edges.clear();
    return id;
  }
  nodes.forEach((_, id) => push(id));
  while (heap.length) {
    const entry = pop(),
      node = nodes[entry.id];
    if (
      node.parent !== entry.id ||
      node.size !== entry.size ||
      node.size >= minimum
    )
      continue;
    const boundary = new Map<number, number>();
    for (const [id, count] of node.edges)
      boundary.set(
        nodes[id].color,
        (boundary.get(nodes[id].color) ?? 0) + count,
      );
    if (!boundary.size) break;
    const chosen = [...boundary].sort(
      (a, b) =>
        distance(colors[node.color], colors[a[0]]) -
          distance(colors[node.color], colors[b[0]]) ||
        b[1] - a[1] ||
        a[0] - b[0],
    )[0][0];
    const adjacent = [...node.edges.keys()]
      .filter((id) => nodes[id].color === chosen)
      .sort((a, b) => a - b);
    let id = entry.id;
    for (const neighbour of adjacent) id = join(id, neighbour, chosen);
    push(id);
  }
  return cells.map((_, k) => nodes[root(owners[k])].color);
}
export async function generatePaint(
  pixels: Uint8Array,
  columns: number,
  rows: number,
  pitchMm: number,
  minimum: number,
  palette: PaintColor[],
): Promise<PaintGuide> {
  checkPaintSettings(columns, rows, pitchMm, minimum, palette);
  if (pixels.length !== columns * rows * 3) throw Error("Invalid paint target");
  const colors = palette.map((c) => colorRgb(c.hex));
  let cells = Array.from({ length: columns * rows }, (_, i) => {
    const target = [0, 1, 2].map((k) => linear(pixels[3 * i + k]));
    let best = 0;
    for (let c = 1; c < colors.length; c++)
      if (distance(target, colors[c]) < distance(target, colors[best]))
        best = c;
    return best;
  });
  cells = mergePaintCells(cells, columns, rows, minimum, colors);
  const g: PaintGuide = {
    schema: "iprasm.paint/1",
    algorithm: "linear-rgb-connected-small-first/1",
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    columns,
    rows,
    pitchMm,
    minRegionCells: minimum,
    palette: structuredClone(palette),
    cells,
    regions: paintRegions(cells, columns, rows, pitchMm),
    sourceHash: await hash(Array.from(pixels).join(",")),
    sequenceHash: "",
  };
  g.sequenceHash = await hash(paintPayload(g));
  return validatePaint(g);
}
export async function validatePaint(g: PaintGuide) {
  if (
    !g ||
    g.schema !== "iprasm.paint/1" ||
    g.algorithm !== "linear-rgb-connected-small-first/1" ||
    typeof g.id !== "string" ||
    !g.id ||
    g.id.length > 100 ||
    typeof g.createdAt !== "string" ||
    !Number.isFinite(Date.parse(g.createdAt)) ||
    !DIGEST.test(g.sourceHash) ||
    !DIGEST.test(g.sequenceHash)
  )
    throw Error("Invalid paint guide");
  checkPaintSettings(g.columns, g.rows, g.pitchMm, g.minRegionCells, g.palette);
  if (
    !Array.isArray(g.cells) ||
    g.cells.length !== g.columns * g.rows ||
    g.cells.some((c) => !Number.isInteger(c) || c < 0 || c >= g.palette.length)
  )
    throw Error("Invalid paint cells");
  const canonical = paintRegions(g.cells, g.columns, g.rows, g.pitchMm);
  if (canonical.length > MAX_PAINT_REGIONS)
    throw Error("Invalid paint regions: increase the minimum region size");
  if (
    JSON.stringify(canonical) !== JSON.stringify(g.regions) ||
    canonical.some((r) => r.cells.length < g.minRegionCells) ||
    (await hash(paintPayload(g))) !== g.sequenceHash
  )
    throw Error("Invalid paint regions or hash");
  return deepFreeze(g);
}
export function newPaintProject(g: PaintGuide, name: string): PaintProject {
  return {
    id: crypto.randomUUID(),
    name:
      name
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .trim()
        .slice(0, 80) || "Paint",
    guide: g,
    progress: { sequenceHash: g.sequenceHash, completed: [], revision: 0 },
  };
}
export async function validatePaintProject(p: PaintProject) {
  if (
    !p ||
    typeof p.id !== "string" ||
    !p.id ||
    p.id.length > 100 ||
    typeof p.name !== "string" ||
    /[\u0000-\u001f\u007f]/.test(p.name) ||
    !p.name.trim() ||
    p.name.length > 80
  )
    throw Error("Invalid paint project");
  await validatePaint(p.guide);
  const x = p.progress;
  if (
    !x ||
    x.sequenceHash !== p.guide.sequenceHash ||
    !Number.isSafeInteger(x.revision) ||
    x.revision < 0 ||
    !Array.isArray(x.completed) ||
    x.completed.length > p.guide.regions.length ||
    x.completed.some(
      (v, j) =>
        !Number.isInteger(v) ||
        v < 0 ||
        v >= p.guide.regions.length ||
        (j > 0 && v <= x.completed[j - 1]),
    )
  )
    throw Error("Invalid paint progress");
  return p;
}
export function paintFile(p: PaintProject) {
  return JSON.stringify(
    { schema: "iprasm.paint-project/1", project: p },
    null,
    2,
  );
}
export async function parsePaintProject(raw: string) {
  if (raw.length > 2_000_000) throw Error("Paint file exceeds limit");
  const data = JSON.parse(raw);
  if (data.schema !== "iprasm.paint-project/1")
    throw Error("Unsupported paint file");
  const p = await validatePaintProject(data.project);
  return { ...p, id: crypto.randomUUID() };
}
export function paintCoverage(g: PaintGuide) {
  return g.palette.map((c, color) => {
    const count = g.cells.filter((v) => v === color).length;
    return {
      ...c,
      number: color + 1,
      cells: count,
      areaCm2: (count * g.pitchMm ** 2) / 100,
      regions: g.regions.filter((r) => r.color === color).length,
    };
  });
}
// Contours between unequal colours only: no decorative per-pixel grid.
export function paintEdges(g: PaintGuide): [number, number, number, number][] {
  const edges: [number, number, number, number][] = [];
  for (let y = 0; y < g.rows; y++)
    for (let x = 0; x < g.columns; x++) {
      const c = g.cells[y * g.columns + x];
      if (y === 0 || g.cells[(y - 1) * g.columns + x] !== c)
        edges.push([x, y, x + 1, y]);
      if (x === 0 || g.cells[y * g.columns + x - 1] !== c)
        edges.push([x, y, x, y + 1]);
      if (y === g.rows - 1) edges.push([x, y + 1, x + 1, y + 1]);
      if (x === g.columns - 1) edges.push([x + 1, y, x + 1, y + 1]);
    }
  return edges;
}
export function paintSvg(
  g: PaintGuide,
  options: { colored?: boolean; active?: number; completed?: number[] } = {},
) {
  const fill = options.colored
    ? g.cells
        .map(
          (v, k) =>
            `<rect x="${k % g.columns}" y="${Math.floor(k / g.columns)}" width="1" height="1" fill="${g.palette[v].hex}"/>`,
        )
        .join("")
    : "";
  const highlight = g.regions
    .filter((r) => r.id === options.active || options.completed?.includes(r.id))
    .map((r) =>
      r.cells
        .map(
          (k) =>
            `<rect x="${k % g.columns}" y="${Math.floor(k / g.columns)}" width="1" height="1" fill="${r.id === options.active ? "#f4a340" : "#92b397"}" fill-opacity=".6"/>`,
        )
        .join(""),
    )
    .join("");
  const edges = paintEdges(g)
    .map((e) => `M${e[0]},${e[1]}L${e[2]},${e[3]}`)
    .join("");
  const labels = g.regions
    .filter((r) => r.labelFits)
    .map(
      (r) =>
        `<text x="${(r.anchor % g.columns) + 0.5}" y="${Math.floor(r.anchor / g.columns) + 0.5}" font-size="${2.5 / g.pitchMm}" fill="black" text-anchor="middle" dominant-baseline="central">${r.color + 1}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${g.columns * g.pitchMm}mm" height="${g.rows * g.pitchMm}mm" viewBox="0 0 ${g.columns} ${g.rows}" data-paint-hash="${g.sequenceHash}"><title>Paint contours; palette numbers; physical scale</title><rect width="100%" height="100%" fill="white"/>${fill}${highlight}<path d="${edges}" fill="none" stroke="black" stroke-width="${0.18 / g.pitchMm}"/>${options.colored ? "" : labels}</svg>`;
}
export function paintCsv(g: PaintGuide, completed: number[] = []) {
  return [
    "region,palette_number,code,hex,area_cm2,anchor_x_mm,anchor_y_mm,printed_label,completed",
    ...g.regions.map((r) =>
      [
        r.id + 1,
        r.color + 1,
        g.palette[r.color].code,
        g.palette[r.color].hex,
        (r.cells.length * g.pitchMm ** 2) / 100,
        ((r.anchor % g.columns) + 0.5) * g.pitchMm,
        (Math.floor(r.anchor / g.columns) + 0.5) * g.pitchMm,
        r.labelFits,
        completed.includes(r.id),
      ].join(","),
    ),
  ].join("\n");
}
