import poly2tri from "poly2tri";
export type Point2 = [number, number];
export type Point3 = [number, number, number];
export type SolidPolygon = Point2[][];
export type Triangle = [Point3, Point3, Point3];
export const solidRound = (n: number) => Math.round(n * 1e6) / 1e6;
export const ringArea = (r: Point2[]) =>
  r.reduce((sum, a, i) => {
    const b = r[(i + 1) % r.length];
    return sum + a[0] * b[1] - b[0] * a[1];
  }, 0) / 2;
export function solidRing(input: Point2[], ccw: boolean): Point2[] {
  let r: Point2[] = [];
  for (const p of input) {
    if (
      !Array.isArray(p) ||
      p.length !== 2 ||
      p.some((v) => !Number.isFinite(v) || Math.abs(v) > 2000)
    )
      throw Error("solid/contour");
    const point: Point2 = [solidRound(p[0]), solidRound(p[1])];
    if (!r.length || r.at(-1)!.join() !== point.join()) r.push(point);
  }
  if (r.length && r[0].join() === r.at(-1)!.join()) r.pop();
  let changed = true;
  while (changed && r.length >= 3) {
    changed = false;
    r = r.filter((b, i) => {
      const a = r[(i + r.length - 1) % r.length],
        c = r[(i + 1) % r.length],
        cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cross) < 1e-9) {
        changed = true;
        return false;
      }
      return true;
    });
  }
  if (
    r.length < 3 ||
    r.length > 5000 ||
    new Set(r.map((p) => p.join())).size !== r.length ||
    Math.abs(ringArea(r)) < 1e-6
  )
    throw Error("solid/contour");
  if (ringArea(r) > 0 !== ccw) r.reverse();
  return r;
}
export function pointInRing(point: Point2, ring: Point2[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
const subtract = (a: Point3, b: Point3): Point3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export const cross3 = (a: Point3, b: Point3): Point3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export function meshFacts(triangles: Triangle[]) {
  if (!triangles.length || triangles.length > 40000)
    throw Error("solid/mesh-bounds");
  const edges = new Map<string, { count: number; direction: number }>();
  let volume = 0;
  const min: Point3 = [Infinity, Infinity, Infinity],
    max: Point3 = [-Infinity, -Infinity, -Infinity];
  for (const face of triangles) {
    if (
      face.length !== 3 ||
      face.some(
        (p) =>
          p.length !== 3 ||
          p.some((v) => !Number.isFinite(v) || Math.abs(v) > 2000),
      )
    )
      throw Error("solid/mesh");
    const normal = cross3(
      subtract(face[1], face[0]),
      subtract(face[2], face[0]),
    );
    if (Math.hypot(...normal) < 1e-10) throw Error("solid/degenerate");
    const bc = cross3(face[1], face[2]);
    volume += face[0].reduce((s, v, c) => s + v * bc[c], 0) / 6;
    for (let i = 0; i < 3; i++) {
      const a = face[i].map(solidRound).join(),
        b = face[(i + 1) % 3].map(solidRound).join(),
        key = [a, b].sort().join("|"),
        old = edges.get(key) ?? { count: 0, direction: 0 };
      old.count++;
      old.direction += a < b ? 1 : -1;
      edges.set(key, old);
      for (let c = 0; c < 3; c++) {
        min[c] = Math.min(min[c], face[i][c]);
        max[c] = Math.max(max[c], face[i][c]);
      }
    }
  }
  if (
    [...edges.values()].some((e) => e.count !== 2 || e.direction !== 0) ||
    volume <= 1e-6
  )
    throw Error("solid/non-manifold");
  return {
    volumeMm3: solidRound(volume),
    min,
    max,
    triangles: triangles.length,
  };
}
export function extrudeSolid(
  polygons: SolidPolygon[],
  heightMm: number,
  zMm = 0,
): Triangle[] {
  if (
    !Number.isFinite(heightMm) ||
    heightMm < 0.5 ||
    heightMm > 50 ||
    !Number.isFinite(zMm) ||
    zMm < 0 ||
    zMm + heightMm > 500 ||
    !polygons.length ||
    polygons.length > 64
  )
    throw Error("solid/extrusion");
  const result: Triangle[] = [];
  for (const polygon of polygons) {
    const rings = polygon.map((r, i) => solidRing(r, i === 0));
    if (
      !rings.length ||
      new Set(rings.flat().map((p) => p.join())).size !== rings.flat().length
    )
      throw Error("solid/touching");
    const points = rings.map((r) => r.map((p) => new poly2tri.Point(...p)));
    const sweep = new poly2tri.SweepContext(points[0], { cloneArrays: true });
    for (const hole of points.slice(1)) sweep.addHole(hole);
    sweep.triangulate();
    let area = 0;
    for (const triangle of sweep.getTriangles()) {
      const p = triangle.getPoints().map((p) => [p.x, p.y] as Point2);
      if (ringArea(p) < 0) p.reverse();
      area += ringArea(p);
      result.push(
        p.map((v) => [v[0], v[1], solidRound(zMm + heightMm)]) as Triangle,
        [...p].reverse().map((v) => [v[0], v[1], zMm]) as Triangle,
      );
    }
    const expected = rings.reduce((sum, r) => sum + ringArea(r), 0);
    if (
      expected <= 0 ||
      Math.abs(area - expected) > Math.max(1e-5, expected * 1e-8)
    )
      throw Error("solid/triangulation-area");
    for (const ring of rings)
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i],
          b = ring[(i + 1) % ring.length],
          a0: Point3 = [...a, zMm],
          b0: Point3 = [...b, zMm],
          a1: Point3 = [...a, solidRound(zMm + heightMm)],
          b1: Point3 = [...b, solidRound(zMm + heightMm)];
        result.push([a0, b0, b1], [a0, b1, a1]);
      }
  }
  meshFacts(result);
  return result;
}
export function solidStl(triangles: Triangle[], hash: string) {
  meshFacts(triangles);
  if (!/^[a-f0-9]{64}$/.test(hash)) throw Error("solid/hash");
  const bytes = new Uint8Array(84 + triangles.length * 50),
    view = new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode("iprasm mm " + hash));
  view.setUint32(80, triangles.length, true);
  triangles.forEach((face, i) => {
    let at = 84 + i * 50;
    const cross = cross3(
        subtract(face[1], face[0]),
        subtract(face[2], face[0]),
      ),
      length = Math.hypot(...cross);
    for (const value of [...cross.map((v) => v / length), ...face.flat()]) {
      view.setFloat32(at, value, true);
      at += 4;
    }
  });
  return bytes;
}
