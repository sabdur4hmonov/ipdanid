// Research only. This objective never paints a preview or alters a saved guide.
// Analytic derivative of weighted local SSIM; reflect101's adjoint is explicit.
export function ssimObjective(
  n: number,
  target: Float64Array,
  weights: Float64Array,
) {
  if (n < 8 || target.length !== n * n || weights.length !== n * n)
    throw Error("ssim-gradient/size");
  const kernel = Float64Array.from({ length: 7 }, (_, k) =>
    Math.exp(-((k - 3) ** 2) / 4.5),
  );
  const total = kernel.reduce((a, b) => a + b, 0);
  for (let k = 0; k < 7; k++) kernel[k] /= total;
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (
    !(weightSum > 0) ||
    !weights.every((v) => Number.isFinite(v) && v >= 0) ||
    !target.every(Number.isFinite)
  )
    throw Error("ssim-gradient/values");
  const reflect = (x: number) => {
    while (x < 0 || x >= n) x = x < 0 ? -x : 2 * n - x - 2;
    return x;
  };
  const convolve = (a: Float64Array, adjoint = false) => {
    const row = new Float64Array(a.length),
      out = new Float64Array(a.length);
    if (!adjoint) {
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
          for (let k = 0; k < 7; k++)
            row[y * n + x] += a[y * n + reflect(x + k - 3)] * kernel[k];
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
          for (let k = 0; k < 7; k++)
            out[y * n + x] += row[reflect(y + k - 3) * n + x] * kernel[k];
    } else {
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
          for (let k = 0; k < 7; k++)
            row[reflect(y + k - 3) * n + x] += a[y * n + x] * kernel[k];
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
          for (let k = 0; k < 7; k++)
            out[y * n + reflect(x + k - 3)] += row[y * n + x] * kernel[k];
    }
    return out;
  };
  const my = convolve(target),
    yy = convolve(Float64Array.from(target, (v) => v * v));
  return (image: Float64Array) => {
    if (image.length !== target.length || !image.every(Number.isFinite))
      throw Error("ssim-gradient/image");
    const mx = convolve(image),
      xx = convolve(Float64Array.from(image, (v) => v * v)),
      xy = convolve(Float64Array.from(image, (v, k) => v * target[k])),
      a = new Float64Array(image.length),
      b = new Float64Array(image.length),
      c = new Float64Array(image.length);
    let score = 0;
    for (let k = 0; k < image.length; k++) {
      const A = 2 * mx[k] * my[k] + 0.0001,
        B = 2 * (xy[k] - mx[k] * my[k]) + 0.0009,
        C = mx[k] ** 2 + my[k] ** 2 + 0.0001,
        D = xx[k] - mx[k] ** 2 + yy[k] - my[k] ** 2 + 0.0009,
        w = weights[k] / weightSum,
        s = (A * B) / (C * D),
        dm = (2 * my[k] * B) / (C * D) - (2 * mx[k] * A * B) / (C * C * D),
        dcov = (2 * A) / (C * D),
        dv = (-A * B) / (C * D * D);
      score += w * s;
      a[k] = w * (dm - dcov * my[k] - 2 * dv * mx[k]);
      b[k] = w * dcov;
      c[k] = w * 2 * dv;
    }
    const ga = convolve(a, true),
      gb = convolve(b, true),
      gc = convolve(c, true);
    return {
      score,
      gradient: Float64Array.from(
        image,
        (v, k) => ga[k] + target[k] * gb[k] + v * gc[k],
      ),
    };
  };
}
