import { paintCoverage, type PaintGuide } from "./paint";
type Point = [number, number];
type Edge = { a: Point; b: Point; direction: number; used: boolean };
export function paintBoundaries(g: PaintGuide) {
  return g.regions.map((region) => {
    const cells = new Set(region.cells),
      edges: Edge[] = [],
      starts = new Map<string, number[]>(),
      key = (p: Point) => p.join(",");
    const add = (a: Point, b: Point, direction: number) => {
      const i = edges.length;
      edges.push({ a, b, direction, used: false });
      const k = key(a);
      starts.set(k, [...(starts.get(k) ?? []), i]);
    };
    for (const cell of region.cells) {
      const x = cell % g.columns,
        y = Math.floor(cell / g.columns);
      if (y === 0 || !cells.has(cell - g.columns)) add([x, y], [x + 1, y], 0);
      if (x === g.columns - 1 || !cells.has(cell + 1))
        add([x + 1, y], [x + 1, y + 1], 1);
      if (y === g.rows - 1 || !cells.has(cell + g.columns))
        add([x + 1, y + 1], [x, y + 1], 2);
      if (x === 0 || !cells.has(cell - 1)) add([x, y + 1], [x, y], 3);
    }
    const loops: {
      points: Point[];
      signedAreaCells: number;
      perimeterMm: number;
    }[] = [];
    for (let i = 0; i < edges.length; i++) {
      if (edges[i].used) continue;
      const first = key(edges[i].a),
        points: Point[] = [edges[i].a];
      let current = i,
        closed = false;
      // Interior stays on the right. Right-turn preference separates touching
      // corners without jumping to another boundary or filling an inner hole.
      for (let n = 0; n <= edges.length; n++) {
        const edge = edges[current];
        if (edge.used) throw Error("Paint boundary repeats an edge");
        edge.used = true;
        points.push(edge.b);
        if (key(edge.b) === first) {
          closed = true;
          break;
        }
        const next = (starts.get(key(edge.b)) ?? [])
          .filter((j) => !edges[j].used)
          .sort(
            (a, b) =>
              [1, 0, 3, 2].indexOf(
                (edges[a].direction - edge.direction + 4) % 4,
              ) -
              [1, 0, 3, 2].indexOf(
                (edges[b].direction - edge.direction + 4) % 4,
              ),
          );
        if (!next.length) throw Error("Paint boundary is not closed");
        current = next[0];
      }
      if (!closed) throw Error("Paint boundary exceeds its edge budget");
      const ring = points.slice(0, -1),
        corners = ring.filter((p, j) => {
          const a = ring[(j + ring.length - 1) % ring.length],
            b = ring[(j + 1) % ring.length];
          return (
            (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0])
          );
        });
      let area = 0,
        perimeter = 0;
      for (let j = 0; j < corners.length; j++) {
        const a = corners[j],
          b = corners[(j + 1) % corners.length];
        area += a[0] * b[1] - b[0] * a[1];
        perimeter += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
      }
      loops.push({
        points: [...corners, corners[0]],
        signedAreaCells: area / 2,
        perimeterMm: perimeter * g.pitchMm,
      });
    }
    if (
      loops.reduce((n, loop) => n + loop.signedAreaCells, 0) !==
        region.cells.length ||
      edges.some((e) => !e.used)
    )
      throw Error("Paint boundary area mismatch");
    return {
      region: region.id,
      paletteNumber: region.color + 1,
      cells: region.cells.length,
      areaCm2: (region.cells.length * g.pitchMm ** 2) / 100,
      anchorMm: [
        ((region.anchor % g.columns) + 0.5) * g.pitchMm,
        (Math.floor(region.anchor / g.columns) + 0.5) * g.pitchMm,
      ] as Point,
      labelFits: region.labelFits,
      loops,
    };
  });
}
export function paintBoundaryPlan(g: PaintGuide, completed: number[] = []) {
  const regions = paintBoundaries(g),
    done = new Set(completed),
    paintedCells = g.regions
      .filter((r) => done.has(r.id))
      .reduce((n, r) => n + r.cells.length, 0);
  return {
    schema: "iprasm.paint-boundaries/1",
    sequenceHash: g.sequenceHash,
    widthMm: g.columns * g.pitchMm,
    heightMm: g.rows * g.pitchMm,
    paintedPercent: (paintedCells / g.cells.length) * 100,
    paintedAreaCm2: (paintedCells * g.pitchMm ** 2) / 100,
    coverage: paintCoverage(g).map((c) => ({
      ...c,
      percent: (c.cells / g.cells.length) * 100,
    })),
    regions,
  };
}
export function paintBoundarySvg(g: PaintGuide) {
  const regions = paintBoundaries(g),
    pitch = g.pitchMm,
    width = Math.max(g.columns, 65 / pitch),
    height = g.rows + 22 / pitch;
  const paths = regions
    .map(
      (r) =>
        `<path data-region="${r.region}" d="${r.loops.map((loop) => loop.points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("") + "Z").join("")}" fill="none" stroke="#000" stroke-width="${0.18 / pitch}"/>`,
    )
    .join("");
  const labels = regions
    .filter((r) => r.labelFits)
    .map(
      (r) =>
        `<text x="${r.anchorMm[0] / pitch}" y="${r.anchorMm[1] / pitch}" text-anchor="middle" dominant-baseline="central" font-size="${2.5 / pitch}">${r.paletteNumber}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * pitch}mm" height="${height * pitch}mm" viewBox="0 0 ${width} ${height}" data-paint-hash="${g.sequenceHash}"><title>Closed paint boundaries; small labels omitted; print100%</title><rect width="100%" height="100%" fill="#fff"/>${paths}${labels}<path d="M${5 / pitch},${g.rows + 10 / pitch}h${50 / pitch}" stroke="#000" stroke-width="${0.3 / pitch}"/><text x="${5 / pitch}" y="${g.rows + 18 / pitch}" font-size="${4 / pitch}">50 mm</text></svg>`;
}
