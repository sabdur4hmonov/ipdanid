import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  generateGlyphOutline,
  prepareLetteringTarget,
} from "../src/core/lettering-guide";
import { LETTERING_FONTS, shapeLettering } from "../src/core/lettering";
import { flatten, hash, sequencePayload } from "../src/core/engine";
import { glyphPath } from "../src/core/glyph-layout";
import { validateInstruction, fromFile, toTxt } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";
import { createProfile } from "../src/core/geometry";
import { continuationStrategy } from "../src/core/generation-strategy";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { DEFAULT_SUBJECT_OBJECTIVE } from "../src/core/subject-objective";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import { sealGenerationInput, validateLocalInput } from "../src/generation-inputs";
import { DEFAULT_EDITS } from "../src/core/types";
const bytes = (font: keyof typeof LETTERING_FONTS) =>
  new Uint8Array(readFileSync("public" + LETTERING_FONTS[font].path));
for (const [text, font] of [
  ["SALOM", "sans"],
  ["МИР", "sans"],
  ["سلام", "arabic"],
] as const)
  it(`${text}: exact continuous glyph loops and bridges survive all offline formats`, async () => {
    const input = {
        text,
        fontBytes: bytes(font),
        widthMm: 600,
        heightMm: 300,
        count: 120,
        resolution: 160,
      },
      i = await generateGlyphOutline(input),
      again = await generateGlyphOutline(input),
      l = i.profile.glyphLayout!;
    expect(i.sequenceHash).toBe(again.sequenceHash);
    expect(i.segments[0].path).toEqual(glyphPath(l));
    expect(flatten(i)).toHaveLength(120 + l.contours.length - 1);
    let at = 0;
    for (const c of l.contours) {
      expect(i.segments[0].path[at]).toBe(c.start);
      expect(i.segments[0].path[at + c.count]).toBe(c.start);
      at += c.count + 1;
    }
    const loop = (pin: number) =>
      l.contours.findIndex((c) => pin >= c.start && pin < c.start + c.count);
    expect(flatten(i).filter((s) => loop(s.from) !== loop(s.to))).toHaveLength(
      l.contours.length - 1,
    );
    const restored = await fromFile(toTxt(i));
    expect(restored.sequenceHash).toBe(i.sequenceHash);
    expect(rasterSequence(restored)).toEqual(rasterSequence(i));
    expect(rasterSequence(i, 0)).not.toEqual(rasterSequence(i));
    expect(() => continuationStrategy(i)).toThrow("lettering/rebuild");
    for (const mutate of [
      (x: typeof i) => {
        x.profile.pins[0].x += 0.001;
      },
      (x: typeof i) => {
        x.segments[0].path.splice(1, 1);
      },
      (x: typeof i) => {
        x.metrics.perColorMeters[x.profile.colors[0]] = NaN;
      },
      (x: typeof i) => {
        x.params.product!.fontHash = "a".repeat(64);
      },
    ]) {
      const changed = structuredClone(i);
      mutate(changed);
      changed.sequenceHash = await hash(sequencePayload(changed));
      await expect(validateInstruction(changed)).rejects.toThrow();
    }
  });
it("text target uses actual pinned shaped pixels and explicit review, with bound product metadata", async () => {
  const p = createProfile("rectangle", 48, "dark", {
      widthMm: 600,
      heightMm: 300,
    }),
    g = await shapeLettering("O", bytes("sans"), p);
  await expect(prepareLetteringTarget(g, p, 64, false)).rejects.toThrow(
    "lettering/review",
  );
  const t = await prepareLetteringTarget(g, p, 64, true);
  expect(t.subject.kind).toBe("whole-image");
  expect(t.subject.subjects[0].reviewed).toBe(true);
  expect(t.product.style).toBe("target");
  expect(t.subject.sourceRevision).toBe(`lettering-${await hash(t.pixels)}`);
});
it("real generalized lettering fit binds text provenance in recovery and archived input",async()=>{
  const p=createProfile("rectangle",24,"dark",{widthMm:600,heightMm:300}),g=await shapeLettering("O",bytes("sans"),p),t=await prepareLetteringTarget(g,p,32,true),options={...t,profile:p,resolution:32,lines:120,mode:"dark" as const},tuning={edgeWeight:2,sweeps:1,physical:defaultPhysicalContrast(),subjectObjective:DEFAULT_SUBJECT_OBJECTIVE};
  let checkpoint:DensityCheckpoint|undefined;
  const i=await generateDensity(options,{...tuning,onCheckpoint:c=>{checkpoint=structuredClone(c)}});
  await validateInstruction(i);expect(i.algorithm).toBe("density-subject/18");expect(i.params.product).toEqual(t.product);
  const recovered=await generateDensity(options,{...tuning,resume:checkpoint,materializeOnly:true});expect(recovered.sequenceHash).toBe(i.sequenceHash);
  await expect(generateDensity({...options,product:{...t.product,text:"Q"}},{...tuning,resume:checkpoint})).rejects.toThrow();
  const input=await sealGenerationInput({targetHash:i.imageHash,preparedRevision:t.subject.sourceRevision,edits:DEFAULT_EDITS,resolution:32,profile:p,subject:t.subject,product:t.product,mode:"dark",lines:120,strategy:"subjects",objective:i.params.optimization},t.pixels);
  await validateLocalInput(input,i);
  const altered=structuredClone(input);delete altered.recipe.product;altered.recipeHash=await hash(altered.recipe);await expect(validateLocalInput(altered,i)).rejects.toThrow("integrity");
});
