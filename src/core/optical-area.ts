// Evaluation only: composite real strands on a finer grid, then average physical
// cell areas. Averaging coverage BEFORE compositing is a different optical model.
// Fine centers coincide with coarse centers at even coordinates (2*n-1 grid).
export function areaAverageRgb(fine: Float32Array, n: number, base: number[]) {
  const high = 2 * n - 1;
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 192 ||
    fine.length !== high * high * 3 ||
    base.length !== 3 ||
    !base.every((v) => Number.isFinite(v) && v >= 0 && v <= 1)
  )
    throw Error("Invalid area evaluation grid");
  const out = Float32Array.from({ length: n * n * 3 }, (_, i) => base[i % 3]);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      for (let c = 0; c < 3; c++) {
        let value = base[c];
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = 2 * x + dx,
              yy = 2 * y + dy;
            if (xx < 0 || yy < 0 || xx >= high || yy >= high) continue;
            value +=
              (fine[(yy * high + xx) * 3 + c] - base[c]) *
              (dx === 0 ? 0.5 : 0.25) *
              (dy === 0 ? 0.5 : 0.25);
          }
        out[(y * n + x) * 3 + c] = value;
      }
  return out;
}
