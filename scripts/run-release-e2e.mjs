// Full CURRENT product matrix, sequential fresh backends. Archived optimizer
// experiments and frozen historical A/B reports are enumerated, never rerun.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { freemem } from "node:os";
import { resolve, join, sep, basename } from "node:path";
import net from "node:net";
const excluded = new Set(
  [
    "anatomy",
    "convergence",
    "convergence-export",
    "continuation",
    "feature-export",
    "feature-worker",
    "fine-thread",
    "global-fit",
    "guarded",
    "head-outline",
    "head-priority",
    "physical-contrast",
    "pin-basis",
    "pin-layout",
    "portrait",
    "portrait-candidate-export",
    "portrait-detail",
    "portrait-dispatch",
    "portrait-sampling",
    "recovery-ready",
    "resolution",
    "resolved-sampling",
    "simple-flow",
    "texture-path",
    "phase10-acceptance",
    "phase10-reference",
    "phase11-framing",
    "phase13-acceptance",
    "phase13-mobile",
    "phase14-quality",
  ].map((v) => v + ".spec.ts"),
);
const files = readdirSync("tests/e2e")
    .filter((v) => v.endsWith(".spec.ts"))
    .sort(),
  selected = files.filter((v) => !excluded.has(v)),
  digest = (v) => createHash("sha256").update(v).digest("hex"),
  build = digest(readFileSync("output/phase15-dist/asset-manifest.json")),
  server = digest(
    [
      "package.json",
      "package-lock.json",
      ...readdirSync("server", { recursive: true })
        .filter((p) => /\.(?:ts|mts|mjs|js)$/.test(p))
        .map((p) => join("server", p)),
    ]
      .sort()
      .map((p) => p + "\n" + readFileSync(p, "utf8"))
      .join("\n"),
  ),
  harness = digest(
    [
      "scripts/run-release-e2e.mjs",
      "playwright.config.ts",
      "tests/helpers/evidence-paths.ts",
      ...readdirSync("tests/e2e")
        .filter((n) => n.endsWith(".ts") && !n.endsWith(".spec.ts"))
        .map((n) => "tests/e2e/" + n),
    ]
      .map((p) => p + "\n" + readFileSync(p, "utf8"))
      .join("\n"),
  ),
  resume = process.argv.find((v) => v.startsWith("--resume="))?.slice(9);
mkdirSync("test-results", { recursive: true });
const root = resume
  ? resolve(resume)
  : mkdtempSync(resolve("test-results/c26-release-"));
assert(
  root.startsWith(resolve("test-results") + sep) &&
    /^c26-release-[A-Za-z0-9]+$/.test(basename(root)),
  "Invalid isolated release root",
);
assert(
  realpathSync(root).startsWith(realpathSync("test-results") + sep),
  "Release root redirected",
);
const reportFile = join(root, "matrix.json"),
  report = resume
    ? JSON.parse(readFileSync(reportFile, "utf8"))
    : {
        schema: "iprasm.release-e2e/1",
        root,
        build,
        server,
        harness,
        startedAt: new Date().toISOString(),
        jobs: [],
        excluded: [...excluded].map((file) => ({
          file,
          reason: file.startsWith("phase")
            ? "Frozen historical A/B report; current customer behavior covered by current product tests."
            : "Archived optimizer/material/portrait experiment and its frozen local evidence; no rejected fit/parameter sweep. Legacy mechanics remain in full units and current import/export/offline tests.",
        })),
      };
assert.equal(report.schema, "iprasm.release-e2e/1");
assert.equal(report.root, root);
assert.equal(
  report.server,
  server,
  "API source or dependencies changed: start a new full product matrix",
);
assert.equal(
  report.build,
  build,
  "Rebuild changed: start a new full product matrix",
);
assert.equal(
  report.harness,
  harness,
  "Shared harness changed: start a new full product matrix",
);
const fileFilter = process.argv.find((v) => v.startsWith("--file="))?.slice(7),
  projectFilter = process.argv
    .find((v) => v.startsWith("--project="))
    ?.slice(10);
if (fileFilter) assert(selected.includes(fileFilter));
if (projectFilter)
  assert(["desktop", "mobile-browser"].includes(projectFilter));
const save = () => writeFileSync(reportFile, JSON.stringify(report, null, 2));
save();
console.log("Release matrix root: " + root);
if (process.argv.includes("--plan")) {
  report.plannedJobs = selected.flatMap((file) =>
    (file === "phone-performance.spec.ts"
      ? ["mobile-browser"]
      : ["desktop", "mobile-browser"]
    ).map((project) => ({ file, project })),
  );
  save();
  console.log(
    JSON.stringify({
      plannedFiles: selected.length,
      plannedJobs: report.plannedJobs.length,
      archivedFilesExcluded: excluded.size,
      root,
    }),
  );
  process.exit(0);
}
async function port(start) {
  for (let p = start; p < start + 200; p++)
    if (
      await new Promise((r) => {
        const s = net.createServer();
        s.on("error", () => r(false));
        s.listen(p, "127.0.0.1", () => s.close(() => r(true)));
      })
    )
      return p;
  throw Error("No free isolated port");
}
async function memory() {
  for (let n = 0; n < 36; n++) {
    if (freemem() >= 1.5 * 1024 ** 3) return;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw Error("RAM below 1.5 GiB; no heavy job started");
}
let serial = 0;
try {
  for (const file of selected) {
    if (fileFilter && file !== fileFilter) continue;
    for (const project of ["desktop", "mobile-browser"]) {
      if (projectFilter && project !== projectFilter) continue;
      if (file === "phone-performance.spec.ts" && project === "desktop")
        continue;
      const testHash = digest(readFileSync("tests/e2e/" + file)),
        previous = report.jobs.findLast(
          (v) =>
            v.file === file &&
            v.project === project &&
            v.success &&
            v.testHash === testHash,
        );
      if (previous) {
        serial++;
        continue;
      }
      await memory();
      const directory = mkdtempSync(join(root, "job-")),
        webPort = await port(4800 + serial),
        apiPort = await port(5200 + serial),
        log = createWriteStream(join(directory, "private.log"));
      const env = {
        ...process.env,
        NODE_OPTIONS: "--max-old-space-size=768",
        IP_RASM_TEST_BROWSER_CHANNEL: "chrome",
        IP_RASM_TEST_PORT: String(webPort),
        IP_RASM_TEST_API_PORT: String(apiPort),
        IP_RASM_TEST_WEB_DIR: "output/phase15-dist",
        IP_RASM_TEST_ARTIFACTS: directory,
        IP_RASM_TEST_REPORT: join(directory, "report.json"),
        IP_RASM_RELEASE_EVIDENCE_ROOT: join(directory, "evidence"),
      };
      if (
        existsSync("output/subject-repair/inputs/owner-cat-screenshot-crop.png")
      )
        env.IP_RASM_LOCAL_CAT = resolve(
          "output/subject-repair/inputs/owner-cat-screenshot-crop.png",
        );
      const job = {
        file,
        project,
        testHash,
        directory,
        webPort,
        apiPort,
        startedAt: new Date().toISOString(),
        head: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
          windowsHide: true,
        }).trim(),
      };
      report.jobs.push(job);
      save();
      console.log("Running " + ++serial + ": " + file + " / " + project);
      const code = await new Promise((resolve, reject) => {
        const c = spawn(
          process.execPath,
          [
            "node_modules/@playwright/test/cli.js",
            "test",
            "tests/e2e/" + file,
            "--project=" + project,
            "--max-failures=1",
          ],
          { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
        );
        c.stdout.pipe(log, { end: false });
        c.stderr.pipe(log, { end: false });
        c.once("error", reject);
        c.once("exit", resolve);
      });
      await new Promise((r) => log.end(r));
      job.exitCode = code;
      job.finishedAt = new Date().toISOString();
      if (existsSync(join(directory, "report.json"))) {
        const r = JSON.parse(
          readFileSync(join(directory, "report.json"), "utf8"),
        );
        job.stats = r.stats;
        job.success =
          code === 0 &&
          r.stats.unexpected === 0 &&
          r.stats.skipped === 0 &&
          r.stats.flaky === 0;
      } else job.success = false;
      save();
      console.log(
        (job.success ? "Passed: " : "Needs repair: ") + file + " / " + project,
      );
      if (!job.success)
        throw Error("Product case needs repair; private diagnostics retained");
    }
  }
  report.complete = !fileFilter && !projectFilter;
  report.finishedAt = new Date().toISOString();
  save();
  console.log(
    JSON.stringify({
      complete: report.complete,
      acceptedJobs: report.jobs.filter((v) => v.success).length,
      root,
    }),
  );
} catch {
  report.complete = false;
  save();
  process.exitCode = 1;
  console.error(
    "Release matrix stopped safely; inspect the last private job report, then resume this exact build. Root: " +
      root,
  );
}
