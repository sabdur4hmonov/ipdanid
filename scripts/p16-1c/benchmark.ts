import { benchmark as prior, fixtureRoot } from "../p16-1b/benchmark";
export { fixtureRoot };
export const root = "output/p16-1c-review";
// Owner explicitly confirmed these four source files on2026-10-29; no composites,
// captions, analytical fixtures, new uploads or substitutes are authorized.
export const cases = prior
  .slice(0, 6)
  .map((c, k) => ({
    ...c,
    id: "photo-" + String(k + 1).padStart(2, "0"),
    priorId: c.id,
  }));
export const sources = [cases[0], cases[3], cases[4], cases[5]];
