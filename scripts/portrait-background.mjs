// Personal photograph stays on loopback. Each target starts a new v4 path, continues once,
// then uses the unchanged guarded v5 eight-sweep solver. No old path is appended to a new target.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
const folder = "output/background";
mkdirSync(folder, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route("**/@vite/client", (r) => r.abort());
  await page.goto("http://127.0.0.1:5173");
  await page.exposeFunction("saveBackgroundEvidence", (name, data) => {
    writeFileSync(`${folder}/${name}.json`, JSON.stringify(data, null, 2));
    console.log(
      `${name}: ${data.instruction?.sequenceHash ?? "prepared"} ${Math.round((data.durationMs ?? 0) / 1000)}s`,
    );
  });
  for (const variant of process.argv
    .find((a) => a.startsWith("--variants="))
    ?.slice(11)
    .split(",") ?? ["control", "light-protected"]) {
    if (existsSync(`${folder}/${variant}.json`))
      throw new Error(
        `Preserve existing evidence: ${variant}.json already exists`,
      );
    const data = await page.evaluate(async (variant) => {
      const { loadPhoto, prepare } = await import("/src/core/image.ts"),
        { processPortrait, putRgb, MASK_SIZE, encodeBackgroundMask } =
          await import("/src/core/portrait.ts"),
        { generate, hash } = await import("/src/core/engine.ts"),
        { generateDensity } = await import("/src/core/density.ts"),
        { previewPng } = await import("/src/core/preview-png.ts"),
        { validateInstruction } = await import("/src/core/validation.ts");
      const project = (
          await (await fetch("/output/portrait/browser-guide.json")).json()
        ).project,
        old = await validateInstruction(
          (await (await fetch("/output/portrait/continued.json")).json())
            .instruction,
        ),
        selected = (
          await (
            await fetch("/output/fidelity/distributed-contours.json")
          ).json()
        ).instruction,
        blob = await (await fetch("/output/portrait/source.jpg")).blob(),
        image = await loadPhoto(
          new File([blob], "source.jpg", { type: "image/jpeg" }),
        ),
        n = old.params.resolution,
        canvas = document.createElement("canvas");
      canvas.width = canvas.height = n;
      const raw = prepare(
          canvas.getContext("2d"),
          image,
          project.edits,
          old.profile.widthMm / old.profile.heightMm,
        ),
        crop = canvas.toDataURL();
      const originalPortrait = structuredClone(old.params.portrait),
        original = processPortrait(raw, n, originalPortrait);
      if ((await hash(original)) !== old.imageHash)
        throw new Error("Exact baseline target changed");
      // Manually traced OUTER silhouette on the exact 160px crop. Protect the whole hair, ears,
      // jaw, neck and shirt with an explicit protective margin. Not automatic foreground detection.
      const polygon = [
        [24, 0],
        [150, 0],
        [149, 33],
        [141, 43],
        [143, 76],
        [132, 96],
        [126, 113],
        [112, 127],
        [117, 136],
        [151, 150],
        [160, 151],
        [160, 160],
        [0, 160],
        [0, 156],
        [24, 145],
        [65, 134],
        [66, 121],
        [52, 111],
        [42, 89],
        [30, 83],
        [28, 50],
        [23, 32],
      ];
      function inPolygon(x, y) {
        let hit = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const [xi, yi] = polygon[i],
            [xj, yj] = polygon[j];
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
            hit = !hit;
        }
        return hit;
      }
      function distance(x, y) {
        return Math.min(
          ...polygon.map(([ax, ay], i) => {
            const [bx, by] = polygon[(i + 1) % polygon.length],
              dx = bx - ax,
              dy = by - ay;
            const q = Math.max(
              0,
              Math.min(
                1,
                ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy),
              ),
            );
            return Math.hypot(x - ax - q * dx, y - ay - q * dy);
          }),
        );
      }
      const guarded = variant === "light-protected";
      const margin = guarded ? 8 : 5;
      const boxes = [
        [51, 55, 83, 76],
        [87, 55, 119, 76],
        [70, 76, 103, 103],
        [65, 105, 110, 121],
        [53, 116, 126, 143],
        [100, 78, 116, 103],
      ];
      const nearRegion = (x, y) =>
        guarded &&
        boxes.some(
          ([l, t, r, b]) =>
            x >= l - margin &&
            x <= r + margin &&
            y >= t - margin &&
            y <= b + margin,
        );
      const mask = new Float32Array(MASK_SIZE ** 2);
      for (let y = 0; y < MASK_SIZE; y++)
        for (let x = 0; x < MASK_SIZE; x++) {
          const px = (x / (MASK_SIZE - 1)) * (n - 1),
            py = (y / (MASK_SIZE - 1)) * (n - 1);
          mask[y * MASK_SIZE + x] =
            !inPolygon(px, py) &&
            distance(px, py) > margin &&
            !nearRegion(px, py)
              ? 1
              : 0;
        }
      const portrait =
        variant === "control"
          ? originalPortrait
          : {
              ...originalPortrait,
              backgroundMode: "manual-light",
              backgroundMask: encodeBackgroundMask(mask),
            };
      const pixels = processPortrait(raw, n, portrait);
      putRgb(canvas.getContext("2d"), pixels, n);
      const target = canvas.toDataURL();
      const sourceHash = await hash(new Uint8Array(await blob.arrayBuffer())),
        targetHash = await hash(pixels);
      await window.saveBackgroundEvidence(`${variant}-setup`, {
        sourceHash,
        targetHash,
        edits: project.edits,
        portrait,
        profile: old.profile,
        polygon,
        marginPixels: margin,
        protectedEvaluationBoxes: guarded ? boxes : [],
        method: "manual outer silhouette; feathered 64x64 mask",
        optimizer: "v4 fresh + v4 continuation + v5 edgeWeight1/sweeps8",
        evaluationFace: originalPortrait.face,
      });
      const options = {
        pixels,
        resolution: n,
        profile: old.profile,
        lines: old.params.requestedLines,
        mode: old.params.mode,
        portrait,
      };
      const start = performance.now(),
        first = await generate(options);
      await validateInstruction(first);
      if (
        variant === "control" &&
        first.sequenceHash !== project.instruction.sequenceHash
      )
        throw new Error("Control stage 1 failed exact replay");
      await window.saveBackgroundEvidence(`${variant}-stage1`, {
        instruction: first,
        durationMs: performance.now() - start,
      });
      const secondStart = performance.now(),
        second = await generate({ ...options, seed: first });
      await validateInstruction(second);
      if (variant === "control" && second.sequenceHash !== old.sequenceHash)
        throw new Error("Control stage 2 failed exact replay");
      await window.saveBackgroundEvidence(`${variant}-stage2`, {
        instruction: second,
        durationMs: performance.now() - secondStart,
      });
      const fitStart = performance.now(),
        instruction = await generateDensity(
          { ...options, seed: second },
          { edgeWeight: 1, sweeps: 8 },
        );
      await validateInstruction(instruction);
      if (
        variant === "control" &&
        instruction.sequenceHash !== selected.sequenceHash
      )
        throw new Error("Control v5 failed exact replay");
      return {
        instruction,
        sourceHash,
        edits: project.edits,
        durationMs: performance.now() - start,
        fitDurationMs: performance.now() - fitStart,
        pixels: [...pixels],
        crop,
        target,
        preview: [...previewPng(instruction)],
        comparison:
          "Background preprocessing only; optimizer, crop, materials and regions identical",
      };
    }, variant);
    for (const name of ["crop", "target"]) {
      writeFileSync(
        `${folder}/${variant}-${name}.png`,
        Buffer.from(data[name].split(",")[1], "base64"),
      );
      delete data[name];
    }
    writeFileSync(`${folder}/${variant}-target.bin`, Buffer.from(data.pixels));
    delete data.pixels;
    writeFileSync(`${folder}/${variant}.png`, Buffer.from(data.preview));
    delete data.preview;
    writeFileSync(`${folder}/${variant}.json`, JSON.stringify(data, null, 2));
    console.log(
      JSON.stringify({
        variant,
        hash: data.instruction.sequenceHash,
        durationMs: data.durationMs,
        metrics: data.instruction.metrics,
      }),
    );
  }
} finally {
  await browser.close();
}
