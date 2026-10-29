import { randomInt } from "node:crypto";
export function framingEligible(
  hardValid: boolean,
  ms: number,
  baselineMs: number,
) {
  if (!hardValid) return { eligible: false, reason: "hard-constraint" };
  if (![ms, baselineMs].every(Number.isFinite) || ms < 0 || baselineMs <= 0)
    return { eligible: false, reason: "invalid-timing" };
  return ms > baselineMs * 1.5
    ? { eligible: false, reason: "runtime-over-1.5x" }
    : { eligible: true, reason: "within-hard-constraints-and-runtime" };
}
export function smallView(rgba: Uint8Array) {
  if (rgba.length !== 1000 * 1000 * 4) throw Error("p16-1c/render-size");
  const out = new Uint8Array(250 * 250 * 4);
  for (let y = 0; y < 250; y++)
    for (let x = 0; x < 250; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy = 0; dy < 4; dy++)
          for (let dx = 0; dx < 4; dx++)
            sum += rgba[((y * 4 + dy) * 1000 + x * 4 + dx) * 4 + c];
        out[(y * 250 + x) * 4 + c] = Math.round(sum / 16);
      }
      out[(y * 250 + x) * 4 + 3] = 255;
    }
  return out;
}
export function blindOrder(
  levels: string[],
  previous?: Record<string, string>,
) {
  if (previous)
    return Object.entries(previous)
      .filter(([, level]) => levels.includes(level))
      .map(([letter, level]) => ({ letter, level }));
  const shuffle = <T>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const letters = shuffle("JKMNPRSTVXYZLFGH".split(""));
  return shuffle(levels.map((level, k) => ({ letter: letters[k], level })));
}
