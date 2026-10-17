import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const reports = process.argv.slice(2);
assert(
  reports.length >= 2,
  "Supply the complete run followed by targeted repair reports",
);
const latest = new Map(),
  runs = [];
for (const file of reports) {
  const report = JSON.parse(readFileSync(file, "utf8"));
  assert(!report.errors?.length, `Global test error in ${file}`);
  const rows = [];
  function visit(suite, ancestry = []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const result = test.results.at(-1),
          key = JSON.stringify([
            test.projectName,
            spec.file.replaceAll("\\", "/"),
            ...ancestry,
            spec.title,
          ]),
          row = {
            key,
            project: test.projectName,
            title: spec.title,
            file: spec.file,
            status: result?.status,
            expectedStatus: test.expectedStatus,
            report: file,
          };
        assert(
          !rows.some((r) => r.key === key),
          "Duplicate case inside one run",
        );
        rows.push(row);
        latest.set(key, row);
      }
    }
    for (const child of suite.suites ?? [])
      visit(child, [...ancestry, child.title]);
  }
  // Top-level suites are file containers, already represented in spec.file.
  for (const suite of report.suites) visit(suite);
  runs.push({ file, cases: rows.length, stats: report.stats });
}
const rows = [...latest.values()];
assert.equal(
  rows.length,
  300,
  "Every complete-suite case must have a latest outcome",
);
assert(
  rows.every((r) => r.status === "passed" && r.expectedStatus === "passed"),
  "Unresolved failure, skip or expected failure",
);
for (const project of ["desktop", "mobile-browser"])
  assert.equal(rows.filter((r) => r.project === project).length, 150);
const summary = {
  uniqueLatestPassed: rows.length,
  rawFullRunWasClean: false,
  explanation:
    "Complete 300-case run had 284 passes and 16 failures; affected files were repaired and rerun on fresh isolated servers. Latest outcomes replace only identical project/file/title keys. This is aggregate acceptance, not a claim that the raw full run passed cleanly.",
  runs,
  cases: rows,
};
writeFileSync(
  "test-results/phase14-browser-summary.json",
  JSON.stringify(summary, null, 2),
);
console.log(
  JSON.stringify({
    uniqueLatestPassed: rows.length,
    projects: 2,
    rawFullRunWasClean: false,
  }),
);
