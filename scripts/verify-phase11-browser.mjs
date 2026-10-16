import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const paths = [
  "test-results/phase11-acceptance-v1/report.json",
  "test-results/phase11-final-regression/report.json",
  "test-results/phase11-single-heart/report.json",
  "test-results/phase11-circle-final/report.json",
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
  fullUnitFiles: unit.testResults.length,
  runs,
  rows,
  note: "Four isolated runs:12 actual comparisons,24 focused regressions,6 cache-parity/single-Heart3000 cases,2 final Circle reruns. The first supplemental desktop Circle timed29.588s while full units ran concurrently; pixel/path parity passed, but timing failed. Final Circle reruns run alone and must pass<15s.38unique latest outcomes; no uninterrupted/full historical200-case suite claim.",
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
