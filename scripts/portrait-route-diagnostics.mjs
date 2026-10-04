import { readFileSync, writeFileSync } from "node:fs";
const variant = process.argv[2] ?? "distributed-contours",
  before = JSON.parse(readFileSync("output/fidelity/baseline.json", "utf8")),
  after = JSON.parse(
    readFileSync(`output/fidelity/${variant}.json`, "utf8"),
  ).instruction;
function geometry(i) {
  const p = i.profile,
    lengths = [],
    visits = new Array(p.pins.length).fill(0),
    unique = new Map();
  for (const s of i.segments) {
    visits[s.path[0]]++;
    for (let j = 1; j < s.path.length; j++) {
      const a = p.pins[s.path[j - 1]],
        b = p.pins[s.path[j]],
        mm = Math.hypot((a.x - b.x) * p.widthMm, (a.y - b.y) * p.heightMm);
      lengths.push(mm);
      visits[b.id]++;
      const key = [a.id, b.id].sort((a, b) => a - b).join(":");
      unique.set(key, (unique.get(key) ?? 0) + 1);
    }
  }
  const sorted = [...lengths].sort((a, b) => a - b);
  return {
    connections: lengths.length,
    meanChordMm: lengths.reduce((a, b) => a + b, 0) / lengths.length,
    medianChordMm: sorted[Math.floor(sorted.length / 2)],
    chordsAbove300Mm: lengths.filter((x) => x > 300).length,
    uniqueChordCount: unique.size,
    maxSameChordTraversals: Math.max(...unique.values()),
    maxPinArrivals: Math.max(...visits),
    physicalNailLoadingValidated: false,
  };
}
const data = {
  variant,
  baseline: geometry(before),
  selected: geometry(after),
  meaning:
    "Geometric counts from immutable routed sequences, not a likeness score or winding-capacity validation.",
};
writeFileSync(
  "output/fidelity/route-diagnostics.json",
  JSON.stringify(data, null, 2),
);
console.log(JSON.stringify(data));
