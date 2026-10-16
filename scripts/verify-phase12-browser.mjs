import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const paths = [
  "test-results/phase12-ab-v3/report.json",
  "test-results/phase12-final-browser/report.json",
  "test-results/phase12-recovery-final/report.json",
];
const map = new Map(),
  runs = [];
for (const path of paths) {
  const r = JSON.parse(readFileSync(path, "utf8"));
  runs.push({ path, stats: r.stats });
  function visit(s) {
    for (const spec of s.specs ?? [])
      for (const t of spec.tests ?? []) {
        const key = [
          t.projectName,
          (spec.file ?? s.file ?? "").replaceAll("\\", "/"),
          spec.title,
        ].join(" / ");
        map.set(key, { key, status: t.results.at(-1)?.status, report: path });
      }
    for (const c of s.suites ?? []) visit(c);
  }
  for (const s of r.suites ?? []) visit(s);
}
const rows = [...map.values()],
  bad = rows.filter((r) => r.status !== "passed");
if (rows.length !== 38 || bad.length)
  throw Error(JSON.stringify({ unique: rows.length, bad }));
const unit = JSON.parse(
  readFileSync("test-results/phase12-full-unit.json", "utf8"),
);
if (unit.numFailedTests || unit.numPassedTests !== 261)
  throw Error("Full unit verification incomplete");
for (const device of ["desktop", "mobile-browser"]) {
  const root = `output/phase12/screens/${device}`,
    taps = JSON.parse(readFileSync(root + "/three-taps.json", "utf8")),
    r = JSON.parse(readFileSync(root + "/result.json", "utf8"));
  if (
    taps.totalTaps !== 3 ||
    r.lines !== 3000 ||
    !r.readjustPreserved ||
    !r.regenerationExact ||
    !r.signedPdf
  )
    throw Error("Customer evidence incomplete");
  for (const name of ["1-start", "2-adjust", "3-result"])
    if (!existsSync(root + "/" + name + ".png"))
      throw Error("Missing real screenshot");
}
mkdirSync("test-results/phase12-final", { recursive: true });
const summary = {
  latestUniqueBrowserCases: rows.length,
  unitPassed: unit.numPassedTests,
  unitFiles: unit.testResults.length,
  allLatestPassed: true,
  runs,
  rows,
  note: "6finalA/B cases (12UI renders),30customer/legacy cases plus14recovery/kit/customer reruns. Raw A/Bv1 float-byte assertion and UIv1 bubbling click-counter failures retained; actual current outcomes requiredpassed. Not full historical e2e suite or a single uninterrupted38-case claim.",
};
writeFileSync(
  "test-results/phase12-final/summary.json",
  JSON.stringify(summary, null, 2),
);
console.log(
  JSON.stringify({
    browser: rows.length,
    unit: unit.numPassedTests,
    allPassed: true,
  }),
);
