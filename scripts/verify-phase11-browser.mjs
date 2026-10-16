import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const paths = [
  "test-results/phase11-acceptance-v1/report.json",
  "test-results/phase11-final-regression/report.json",
  "test-results/phase11-single-heart/report.json",
];
const latest = new Map(),
  runs = [];
for (const path of paths) {
  const report = JSON.parse(readFileSync(path, "utf8"));
  runs.push({ path, stats: report.stats });
  function visit(suite) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? []) {
        const key = [
          test.projectName,
          (spec.file ?? suite.file ?? "").replaceAll("\\", "/"),
          spec.title,
        ].join(" / ");
        latest.set(key, {
          key,
          status: test.results.at(-1)?.status,
          report: path,
        });
      }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);
}
const rows = [...latest.values()],
  failed = rows.filter((r) => r.status !== "passed");
if (rows.length !== 38 || failed.length)
  throw Error(JSON.stringify({ unique: rows.length, failed }));
const unit = JSON.parse(
  readFileSync("test-results/phase11-full-unit.json", "utf8"),
);
if (unit.numFailedTests !== 0 || unit.numPassedTests !== 253)
  throw Error("Incomplete full unit regression");
mkdirSync("test-results/phase11-final", { recursive: true });
const summary = {
  latestUniqueBrowserCases: rows.length,
  allLatestPassed: true,
  fullUnitPassed: unit.numPassedTests,
  runs,
  rows,
  note: "Three isolated runs:12 actual portrait comparisons,24 focused regressions,6 final supplemental cases (Circle/pair exact before-after cache parity plus single-Heart3000 on both devices).38unique latest outcomes because4 repeat. No full historical200-case suite claim.",
};
writeFileSync(
  "test-results/phase11-final/summary.json",
  JSON.stringify(summary, null, 2),
);
console.log(
  JSON.stringify({
    browser: rows.length,
    unit: unit.numPassedTests,
    allPassed: true,
  }),
);
