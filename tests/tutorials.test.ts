import { it, expect, vi } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import {
  makeTutorial,
  validateTutorial,
  tutorialIds,
  TUTORIALS,
  tutorialDiagram,
  tutorialMesh,
  tutorialSvg,
  TRAY_NET,
  TRAY_CREASES,
} from "../src/core/tutorials";
import { tutorialPdf } from "../src/core/tutorial-pdf";
import {
  tutorialMediaManifest,
  tutorialMediaBlob,
} from "../src/core/tutorial-media";
import { tutorialPhrase, tutorialWords } from "../src/tutorial-i18n";
import { hash } from "../src/core/engine";
import { ringArea } from "../src/core/solid-geometry";
import { PDFDocument } from "pdf-lib";
it("binds original versioned free lessons and refuses altered or unknown instructions", async () => {
  const plans = await Promise.all(tutorialIds.map(makeTutorial));
  expect(new Set(plans.map((p) => p.sequenceHash)).size).toBe(3);
  for (const p of plans) {
    expect(await validateTutorial(JSON.parse(JSON.stringify(p)))).toEqual(p);
    await expect(
      validateTutorial({ ...p, sequenceHash: "0".repeat(64) }),
    ).rejects.toThrow("integrity");
    await expect(
      validateTutorial({ ...p, revision: "other" } as any),
    ).rejects.toThrow("integrity");
    await expect(
      validateTutorial({ ...p, extra: true } as any),
    ).rejects.toThrow("format");
  }
  await expect(makeTutorial("unknown" as any)).rejects.toThrow("id");
  expect(plans.every((p) => !("accessPolicy" in p))).toBe(true);
  for (const id of tutorialIds) {
    expect(TUTORIALS[id].steps.length).toBeGreaterThan(5);
    for (const step of [0, -1, 1.5, TUTORIALS[id].steps.length + 1])
      expect(() => tutorialDiagram(id, step)).toThrow("step");
  }
});
it("has a feasible connected tray net with four real glue tabs and fourteen constant-length accordion panels", () => {
  expect(Math.abs(ringArea(TRAY_NET))).toBe(6980);
  expect(TRAY_CREASES).toHaveLength(8);
  const paper = tutorialMesh("paper");
  expect(paper).toHaveLength(28);
  for (let i = 0; i < 14; i++) {
    const [a, b, c] = paper[i * 2].triangle;
    expect(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])).toBeCloseTo(
      15,
      10,
    );
    expect(Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2])).toBe(150);
    if (i > 0) expect(a).toEqual(paper[(i - 1) * 2].triangle[1]);
  }
  const tray = tutorialMesh("cardboard");
  expect(tray).toHaveLength(18);
  for (const p of tray.flatMap((f) => f.triangle)) {
    expect(p[0]).toBeGreaterThanOrEqual(0);
    expect(p[0]).toBeLessThanOrEqual(50);
    expect(p[1]).toBeLessThanOrEqual(50);
    expect(p[2]).toBeLessThanOrEqual(20);
  }
  expect(tutorialMesh("ebru")).toEqual([]);
  expect(
    tutorialDiagram("paper", 1).commands.filter(
      (c) => c.type === "line" && c.dash,
    ),
  ).toHaveLength(13);
  for (const id of tutorialIds)
    expect(tutorialSvg(id, 1)).toContain('data-calibration-mm="50"');
});
it("delivers every material, action and control in all four locales including actual Uzbek Cyrillic", () => {
  const phrases = [
    ...Object.values(tutorialWords),
    ...tutorialIds.flatMap((id) => [
      TUTORIALS[id].title,
      TUTORIALS[id].materials,
      ...TUTORIALS[id].steps,
    ]),
  ];
  for (const p of phrases) {
    expect(p).toHaveLength(3);
    for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
      const text = tutorialPhrase(p, locale);
      expect(text.trim().length).toBeGreaterThan(2);
      if (locale === "uz-Cyrl") expect(text).toMatch(/[а-яўқғҳ]/i);
    }
  }
});
it("exports every original step plus exact-scale paper and cardboard templates with offline Cyrillic fonts", async () => {
  const font = new Uint8Array(
    readFileSync("public/fonts/NotoSans-Regular.ttf"),
  );
  mkdirSync("output/current-tutorial/unit", { recursive: true });
  for (const id of tutorialIds) {
    const g = await makeTutorial(id);
    for (const locale of ["en", "uz-Cyrl"] as const) {
      const bytes = await tutorialPdf(g, locale, 2, font),
        doc = await PDFDocument.load(bytes);
      expect(doc.getSubject()).toBe(g.sequenceHash);
      expect(doc.getPageCount()).toBe(8);
      const last = doc.getPages().at(-1)!;
      expect(last.getWidth()).toBeCloseTo(
        ((id === "ebru" ? 210 : 297) * 72) / 25.4,
        6,
      );
      writeFileSync(`output/current-tutorial/unit/${id}-${locale}.pdf`, bytes);
    }
    await expect(tutorialPdf(g, "en", 99, font)).rejects.toThrow("progress");
  }
});
it("accepts only bounded owned same-origin optional media and verifies every byte before display", async () => {
  const bytes = new Uint8Array([1, 2, 3]),
    a = {
      tutorial: "paper",
      step: 1,
      path: "/tutorials/owned/sample.png",
      bytes: 3,
      sha256: await hash(bytes),
      type: "image/png",
      credit: "Owner",
      license: "Owned",
    } as const;
  const manifest = (asset: any) => ({
    schema: "iprasm.tutorial-media/1",
    assets: [asset],
  });
  expect(tutorialMediaManifest(manifest(a))).toEqual([a]);
  for (const patch of [
    { path: "https://elsewhere.test/a.png" },
    { path: "/tutorials/owned/../photo.png" },
    { path: "/tutorials/owned/a.svg" },
    { type: "text/html" },
    { bytes: 10_000_001 },
    { sha256: "invalid" },
    { credit: "" },
    { step: 7 },
    { tutorial: "unknown" },
  ])
    expect(() => tutorialMediaManifest(manifest({ ...a, ...patch }))).toThrow(
      "media",
    );
  expect(() =>
    tutorialMediaManifest({
      schema: "iprasm.tutorial-media/1",
      assets: [a, a],
    }),
  ).toThrow("media");
  const controller = new AbortController();
  try {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(bytes)),
    );
    expect(
      new Uint8Array(
        await (await tutorialMediaBlob(a, controller.signal)).arrayBuffer(),
      ),
    ).toEqual(bytes);
    await expect(
      tutorialMediaBlob({ ...a, sha256: "0".repeat(64) }, controller.signal),
    ).rejects.toThrow("media");
    await expect(
      tutorialMediaBlob({ ...a, bytes: 2 }, controller.signal),
    ).rejects.toThrow("media");
    await expect(
      tutorialMediaBlob({ ...a, bytes: 4 }, controller.signal),
    ).rejects.toThrow("media");
    controller.abort();
    await expect(tutorialMediaBlob(a, controller.signal)).rejects.toThrow(
      "media",
    );
  } finally {
    vi.unstubAllGlobals();
  }
});
