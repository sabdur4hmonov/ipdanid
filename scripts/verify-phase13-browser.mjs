import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const paths = [
  "test-results/phase13-ui-desktop-v2/report.json",
  "test-results/phase13-ui-mobile-v1/report.json",
  "test-results/phase13-regression-v1/report.json",
];
const rows = [];
for (const path of paths) {
  const r = JSON.parse(readFileSync(path, "utf8"));
  function visit(s) {
    for (const spec of s.specs ?? [])
      for (const t of spec.tests ?? [])
        rows.push({
          key: [t.projectName, spec.file ?? s.file, spec.title].join(" / "),
          status: t.results.at(-1)?.status,
          path,
        });
    for (const c of s.suites ?? []) visit(c);
  }
  for (const s of r.suites ?? []) visit(s);
}
if (
  rows.length !== 41 ||
  new Set(rows.map((x) => x.key)).size !== 41 ||
  rows.some((x) => x.status !== "passed")
)
  throw Error("Phase13 final41 browser checks incomplete");
const unit = JSON.parse(
  readFileSync("test-results/phase13-full-unit.json", "utf8"),
);
if (unit.numPassedTests !== 268 || unit.numFailedTests || unit.numPendingTests)
  throw Error("Full268 units incomplete");
const report = JSON.parse(readFileSync("output/phase13/results.json", "utf8"));
if (report.cases.length !== 9 || report.defaultLines !== 3000)
  throw Error("Nine actual report cases missing");
for (const r of report.cases) {
  const main = r.results.find((x) => x.budget === 3000);
  if (
    r.results.length !== 3 ||
    r.results.some(
      (x) =>
        !x.physicalRasterExact || x.uiMs >= 15000 || x.axisCentreChords.length,
    ) ||
    main.score.face.ssim < r.baseline.score.face.ssim ||
    main.score.faces.some((x, j) => x.ssim < r.baseline.score.faces[j].ssim)
  )
    throw Error("LS3 quality/physics/budget/axis gate failed");
}
for (const device of ["desktop", "mobile-browser"]) {
  const root = `output/phase13/screens/${device}`,
    r = JSON.parse(readFileSync(root + "/result.json", "utf8")),
    t = JSON.parse(readFileSync(root + "/three-taps.json", "utf8"));
  if (
    r.lines !== 3000 ||
    !r.readjustPreserved ||
    !r.regenerationExact ||
    !r.signedPdf ||
    t.totalTaps !== 3
  )
    throw Error("Customer regression incomplete");
  for (const name of ["1-start", "2-adjust", "3-result"])
    if (!existsSync(root + "/" + name + ".png"))
      throw Error("Missing screenshot");
}
mkdirSync("test-results/phase13-final", { recursive: true });
writeFileSync(
  "test-results/phase13-final/summary.json",
  JSON.stringify(
    {
      browser: 41,
      unit: 268,
      unitFiles: unit.testResults.length,
      allPassed: true,
      reportCases: 9,
      uiBudgetGenerations: 27,
      rows,
      note: "7desktop+2mobile actual A/B/budget cases and32customer/legacy regressions; earlier Node-vs-Chrome trig control assertion diagnostics retained. Not entire historical e2e suite.",
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ browser: 41, unit: 268, allPassed: true }));
