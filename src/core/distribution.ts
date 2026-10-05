import type { Segment } from "./types";

// Counts traversals, not unique chords or visits. Both endpoints count once.
// Reversed edges and all colors share the same undirected chord counter.
export const PAIR_LIMIT = 32;
export const INCIDENT_LIMIT = 160;
export type Edge = readonly [number, number];
export class Distribution {
  readonly degree: Int32Array;
  readonly pairs = new Map<string, number>();
  constructor(pins: number, segments: Segment[] = []) {
    this.degree = new Int32Array(pins);
    for (const s of segments)
      for (let j = 1; j < s.path.length; j++)
        this.apply([[s.path[j - 1], s.path[j]]]);
    if (!this.canChange([]))
      throw new Error("Exceeded provisional winding guards");
  }
  private key(a: number, b: number) {
    return `${Math.min(a, b)}:${Math.max(a, b)}`;
  }
  canChange(add: Edge[], remove: Edge[] = []): boolean {
    if (add.length === 1 && !remove.length) {
      const [a, b] = add[0];
      return (
        a !== b &&
        Number.isInteger(a) &&
        Number.isInteger(b) &&
        a >= 0 &&
        b >= 0 &&
        a < this.degree.length &&
        b < this.degree.length &&
        this.degree[a] < INCIDENT_LIMIT &&
        this.degree[b] < INCIDENT_LIMIT &&
        (this.pairs.get(this.key(a, b)) ?? 0) < PAIR_LIMIT
      );
    }
    const pairs = new Map<string, number>(),
      degrees = new Map<number, number>();
    for (const [edges, sign] of [
      [remove, -1],
      [add, 1],
    ] as const)
      for (const [a, b] of edges) {
        if (
          a === b ||
          !Number.isInteger(a) ||
          !Number.isInteger(b) ||
          a < 0 ||
          b < 0 ||
          a >= this.degree.length ||
          b >= this.degree.length
        )
          return false;
        const key = this.key(a, b);
        pairs.set(key, (pairs.get(key) ?? 0) + sign);
        for (const pin of [a, b])
          degrees.set(pin, (degrees.get(pin) ?? 0) + sign);
      }
    if (!add.length && !remove.length)
      return (
        [...this.degree].every((d) => d <= INCIDENT_LIMIT && d >= 0) &&
        [...this.pairs.values()].every((c) => c <= PAIR_LIMIT && c >= 0)
      );
    return (
      [...pairs].every(([key, delta]) => {
        const c = (this.pairs.get(key) ?? 0) + delta;
        return c >= 0 && c <= PAIR_LIMIT;
      }) &&
      [...degrees].every(([pin, delta]) => {
        const d = this.degree[pin] + delta;
        return d >= 0 && d <= INCIDENT_LIMIT;
      })
    );
  }
  apply(add: Edge[], remove: Edge[] = []) {
    // Construction can inspect a rejected legacy route; callers validate changes before applying.
    for (const [edges, sign] of [
      [remove, -1],
      [add, 1],
    ] as const)
      for (const [a, b] of edges) {
        const key = this.key(a, b);
        this.pairs.set(key, (this.pairs.get(key) ?? 0) + sign);
        this.degree[a] += sign;
        this.degree[b] += sign;
      }
  }
}
