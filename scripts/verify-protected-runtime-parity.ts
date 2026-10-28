// Same accepted inputs, not a quality/parameter search. Owner pixels stay private.
import assert from "node:assert/strict";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { freemem } from "node:os";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import UPNGModule from "@pdf-lib/upng";
import { privateKitDirectory } from "./private-kit-paths";
import { freshTestDatabase } from "./test-artifacts.mjs";
import { assertTestPorts } from "../server/test-safety.mjs";
import { KitStore } from "../server/kit-store";
import { decodeGenerationRecipe } from "../server/generation-recipe";
import { validateInstruction } from "../src/core/validation";
import { hash, sequencePayload } from "../src/core/engine";
import { portraitDetailScore } from "../src/core/portrait-enhancement";
const UPNG =
  (UPNGModule as unknown as { default?: typeof UPNGModule }).default ??
  UPNGModule;
const fixtures: Record<string, string> = Object.fromEntries([
  ...["circle", "square", "heart"].map((s) => [
    "original-" + s,
    "combined-original-20261027-desktop-" + s,
  ]),
  ...[
    "caption",
    "mixed-lettering",
    "object",
    "owner-cat",
    "synthetic-1",
    "synthetic-2",
    "synthetic-3",
    "synthetic-pair-heart",
    "vehicle",
  ].map((s) => [s, "combined-regression-20261027-desktop-" + s]),
]);
// The original combined Square attempt retained its timing failure before PNG
// capture. Its accepted unchanged repeat has the same target/options/hash.
fixtures["original-square"] = "recheck-original-20261027-desktop-square";
const args = Object.fromEntries(
    process.argv.slice(2).map((s) => {
      const at = s.indexOf("=");
      return [s.slice(0, at), s.slice(at + 1)];
    }),
  ),
  cases = (args["--cases"] ?? Object.keys(fixtures).join(",")).split(","),
  port = Number(args["--port"] ?? 4840),
  out = privateKitDirectory(
    args["--out"] ?? "output/phase16-private/runtime-parity",
    "new",
  );
assert(
  Object.keys(args).every((k) => ["--out", "--cases", "--port"].includes(k)) &&
    cases.length > 0 &&
    new Set(cases).size === cases.length &&
    cases.every((k) => fixtures[k]),
  "Invalid fixed parity selection",
);
assertTestPorts(port, port + 1);
for (const name of cases) for (const file of ["options.json", "guide.json", "target.bin", "app.png", "target.png"])
  readFileSync(resolve("output/quality-original-20261026", fixtures[name], file));
await new Promise<void>((resolve, reject) => {
  const probe = createServer();
  probe.once("error", reject);
  probe.listen(port, "127.0.0.1", () => probe.close(() => resolve()));
});
mkdirSync(out, { recursive: true });
process.env.IP_RASM_TEST_ARTIFACTS = join(out, "databases");
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex"),
  rows: any[] = [];
let child: ChildProcess | undefined,
  logs = "",
  stage = "preflight",
  current = "",
  checks = 0;
async function stop() {
  if (!child || child.exitCode !== null) return;
  const done = new Promise<void>((r) => child!.once("exit", () => r()));
  child.kill();
  await done;
  child = undefined;
}
async function api(
  path: string,
  status: number,
  body?: unknown,
  token?: string,
) {
  const r = await fetch(`http://127.0.0.1:${port}/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(r.status, status, "Parity API status " + path);
  checks++;
  return r.json();
}
function availableRam() {
  return process.platform === "win32"
    ? Number(
        execFileSync(
          "powershell.exe",
          [
            "-NoProfile",
            "-Command",
            "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory",
          ],
          { encoding: "utf8", windowsHide: true },
        ).trim(),
      ) /
        1024 ** 2
    : freemem() / 1024 ** 3;
}
function rgba(bytes: Uint8Array) {
  const d = UPNG.decode(Uint8Array.from(bytes).buffer);
  assert(d.width === 1000 && d.height === 1000, "Frozen physical dimensions");
  return new Uint8Array(UPNG.toRGBA8(d)[0]);
}
function report() {
  writeFileSync(
    join(out, "results.json"),
    JSON.stringify(
      {
        version: "protected-runtime-parity/1",
        stage,
        current,
        checks,
        completed: rows.length,
        requested: cases.length,
        rows,
        rawSourceRead: false,
        qualitySearch: false,
      },
      null,
      2,
    ),
  );
  const panels = rows
    .map(
      (r) =>
        `<section><h2>${r.case} — ${r.milliseconds.toFixed(0)}ms, exact hash and pixels</h2><p>${r.score ? "Same-target face/nose scores, frozen = protected: " + r.score.faces.map((f: any) => f.face.toFixed(6) + " / " + f.nose.toFixed(6)).join("; ") : "No face metric for this object/lettering case."}</p><div class="row">${["target.png", "frozen.png", "protected.png"].map((name, j) => `<figure><img src="${r.case}/${name}"><figcaption>${["Reviewed target", "Frozen browser result", "Protected server result"][j]}</figcaption></figure>`).join("")}</div></section>`,
    )
    .join("");
  writeFileSync(
    join(out, "report.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Protected runtime parity</title><style>body{font:16px system-ui;margin:24px;background:#f8f9f6;color:#20392f}.row{display:flex;gap:12px}figure{width:33%;margin:0}img{width:100%;height:auto}section{margin-bottom:32px}</style><h1>Existing accepted controls → protected server</h1><p>${rows.length}/${cases.length} completed. Verification of unchanged fixed inputs, not a nose improvement or new solver. Source JPEGs were not read or uploaded; only reviewed500px targets reached isolated loopback API. Images/routes stay private; no credentials in this report. Timings exclude later parity/scoring checks.</p>${panels}</html>`,
  );
}
try {
  for (const name of cases) {
    current = name;
    stage = "fixture-validation";
    const root = resolve("output/quality-original-20261026", fixtures[name]),
      files = [
        "options.json",
        "guide.json",
        "target.bin",
        "app.png",
        "target.png",
      ],
      fingerprints = Object.fromEntries(
        files.map((f) => [f, sha(readFileSync(join(root, f)))]),
      ),
      options = JSON.parse(readFileSync(join(root, "options.json"), "utf8")),
      frozen = await validateInstruction(
        JSON.parse(readFileSync(join(root, "guide.json"), "utf8")),
      ),
      pixels = new Uint8Array(readFileSync(join(root, "target.bin")));
    assert(
      options.strategy === "classic3" &&
        options.resolution === 500 &&
        options.lines === 3000 &&
        options.kitPreparation.version === "standard-preparation/9" &&
        options.profile.standardKit.config.revision === 1,
      "Incompatible frozen fixture",
    );
    assert.equal(pixels.length, 750000);
    const mono = Buffer.alloc(250000);
    for (let k = 0; k < mono.length; k++) {
      assert(
        pixels[k * 3] === pixels[k * 3 + 1] &&
          pixels[k * 3] === pixels[k * 3 + 2],
        "Non-monochrome fixture",
      );
      mono[k] = pixels[k * 3];
    }
    const targetHash = await hash(pixels);
    assert.equal(
      frozen.params.kitPreparation?.tone?.parentImageHash ?? frozen.imageHash,
      targetHash,
      "Frozen target binding",
    );
    const secret = randomBytes(32).toString("base64url"),
      body = {
        version: "protected-generation/1",
        consent: "prepared-target-transfer/1",
        shape: options.profile.shape,
        revision: 1,
        lines: 3000,
        target: mono.toString("base64url"),
        preparation: options.kitPreparation,
        pins: {
          version: "kit-pin-snapshot/1",
          coordinates: options.profile.pins.map(
            (p: { x: number; y: number }) => [p.x, p.y],
          ),
        },
        secret,
        requestKey: randomBytes(18).toString("base64url"),
      },
      decoded = decodeGenerationRecipe(
        body,
        options.profile.standardKit.config,
      );
    assert(
      JSON.stringify(decoded.options.profile) ===
        JSON.stringify(options.profile),
      "Exact server-selected profile",
    );
    assert.equal(
      decoded.enhanced,
      options.portraitEnhancement,
      "Same existing enhancement policy",
    );
    const ram = availableRam();
    assert(ram >= 1.5, "Available RAM below1.5GiB; no worker started");
    const { directory, databasePath } = freshTestDatabase("runtime-case"),
      pepper = randomBytes(32).toString("base64url"),
      payment = randomBytes(32).toString("base64url"),
      admin = randomBytes(32).toString("base64url"),
      store = new KitStore(databasePath, pepper, payment),
      code = store.issueKitBatch(
        "parity",
        "standard-kit-r1",
        1,
        "fixed-parity-test-kit",
      ).codes[0].code;
    store.close();
    logs = "";
    stage = "api-start";
    child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
      env: {
        ...process.env,
        IP_RASM_TEST_SERVER: "1",
        SERVER_GENERATION: "1",
        PORT: String(port),
        DATABASE_PATH: databasePath,
        CODE_PEPPER: pepper,
        SANDBOX_PAYMENT_KEY: payment,
        LOCAL_ADMIN_TOKEN: admin,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout!.on("data", (b) => {
      logs += b.toString();
    });
    child.stderr!.on("data", (b) => {
      logs += b.toString();
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Parity API startup timeout")),
        25000,
      );
      child!.once("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child!.once("exit", () => {
        clearTimeout(timer);
        reject(Error("Parity API exited"));
      });
      child!.stdout!.once("data", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    stage = "generation";
    const began = performance.now(),
      job = await api("/generation/start", 202, body),
      capability = { id: job.id, secret };
    let view: any;
    for (;;) {
      view = await api("/generation/status", 200, capability);
      assert(
        !["instruction", "segments", "steps", "target", "checkpoint"].some(
          (k) => k in view,
        ),
        "Unpaid route disclosure",
      );
      if (view.status === "ready") break;
      assert(
        !["failed", "cancelled"].includes(view.status) &&
          performance.now() - began < 60000,
        "Parity generation failed/deadline",
      );
      await new Promise((r) => setTimeout(r, 300));
    }
    const milliseconds = performance.now() - began;
    stage = "unlock-and-parity";
    const account = await api("/account/kit", 200, { code }),
      released = await api(
        "/generation/unlock",
        200,
        {
          ...capability,
          deviceId: "fixed-parity-device-012345",
          requestKey: "fixed-parity-unlock",
        },
        account.token,
      ),
      guide = await validateInstruction(released.instruction);
    assert.equal(released.credits, 2);
    assert.equal(
      guide.sequenceHash,
      frozen.sequenceHash,
      "Frozen sequence hash",
    );
    assert(
      JSON.stringify(sequencePayload(guide)) ===
        JSON.stringify(sequencePayload(frozen)),
      "Full immutable guide parity",
    );
    const actualPng = Buffer.from(view.preview, "base64"),
      expectedRgba = rgba(readFileSync(join(root, "app.png"))),
      actualRgba = rgba(actualPng);
    assert(
      Buffer.from(actualRgba).equals(Buffer.from(expectedRgba)),
      "Every physical RGBA byte must match frozen browser output",
    );
    const score = guide.params.kitPreparation?.transform.targetFaces?.length
      ? portraitDetailScore(pixels, guide)
      : null;
    if (score)
      assert.deepEqual(
        score,
        portraitDetailScore(pixels, frozen),
        "Same-target regional score parity",
      );
    for (const f of files)
      assert.equal(
        sha(readFileSync(join(root, f))),
        fingerprints[f],
        "Read-only fixture changed",
      );
    for (const value of [
      secret,
      code,
      pepper,
      payment,
      admin,
      account.token,
      body.target,
    ])
      assert(!logs.includes(value), "Private data in API logs");
    const dir = join(out, name);
    mkdirSync(dir);
    copyFileSync(join(root, "target.png"), join(dir, "target.png"));
    copyFileSync(join(root, "app.png"), join(dir, "frozen.png"));
    writeFileSync(join(dir, "protected.png"), actualPng);
    writeFileSync(
      join(dir, "fixture-index.json"),
      JSON.stringify(
        {
          files: fingerprints,
          expectedSequenceHash: frozen.sequenceHash,
          pixelsSha256: sha(actualRgba),
          noFixtureModified: true,
        },
        null,
        2,
      ),
    );
    rows.push({
      case: name,
      milliseconds,
      availableRamGiB: ram,
      sequenceExact: true,
      rgbaExact: true,
      lines: guide.metrics.lines,
      shape: guide.profile.shape,
      kind: guide.params.kitPreparation?.transform.product?.kind,
      score,
      sourceRead: false,
    });
    await stop();
    report();
    console.log(
      JSON.stringify({
        case: name,
        milliseconds,
        sequenceExact: true,
        rgbaExact: true,
        completed: rows.length,
      }),
    );
  }
  stage = "complete";
  current = "";
  report();
  console.log(
    JSON.stringify({
      passed: true,
      cases: rows.length,
      checks,
      maxMilliseconds: Math.max(...rows.map((r) => r.milliseconds)),
      ownerRawSourceRead: false,
      qualityImprovementClaimed: false,
      report: join(out, "report.html"),
    }),
  );
} catch (error) {
  stage = "failed-" + stage;
  report();
  console.error(
    JSON.stringify({
      passed: false,
      case: current,
      stage,
      name: error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message : "Parity failure",
      privateValuesPrinted: false,
    }),
  );
  process.exitCode = 1;
} finally {
  await stop();
}
