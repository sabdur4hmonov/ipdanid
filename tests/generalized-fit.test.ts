import { it, expect } from "vitest";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { makeSubjectPlan } from "../src/core/subject-plan";
import {
  DEFAULT_SUBJECT_OBJECTIVE,
  reviewSubjectCandidate,
} from "../src/core/subject-objective";
import { DEFAULT_EDITS, type PortraitSettings } from "../src/core/types";
import { createProfile } from "../src/core/geometry";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import {
  validateInstruction,
  progressFor,
  toTxt,
  parseProjectFile,
} from "../src/core/validation";
import { Distribution } from "../src/core/distribution";
import { rasterSequence } from "../src/core/optical";
import { DEFAULT_PORTRAIT, portraitRegions } from "../src/core/portrait";
const tuning = {
  subjectObjective: DEFAULT_SUBJECT_OBJECTIVE,
  physical: defaultPhysicalContrast(),
  edgeWeight: 2,
  sweeps: 2,
};
for (const count of [1, 2, 3])
  it(`same strong objective fits ${count} reviewed people with bound replay`, async () => {
    const persons = Array.from({ length: count }, (_, j) => {
      const face = {
          left: 0.08 + j * 0.3,
          top: 0.18,
          width: count === 1 ? 0.65 : 0.23,
          height: 0.6,
        },
        b = portraitRegions(face);
      return {
        id: `person-${j + 1}`,
        face,
        regions: {
          placement: "manual" as const,
          reference: "processed-target/sample-centers-v1" as const,
          eyes: b.eyes,
          nose: b.nose,
          mouth: b.mouth,
        },
      };
    });
    const portrait: PortraitSettings = {
      ...DEFAULT_PORTRAIT,
      enabled: true,
      face: persons[0].face,
      regions: persons[0].regions,
      ...(count > 1
        ? {
            people: {
              version: "multiple-portraits/1",
              reference: "processed-target/sample-centers-v1",
              faces: persons,
            },
          }
        : { personId: persons[0].id }),
    };
    const n = 32,
      pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) =>
        Math.round(150 + 45 * Math.sin((Math.floor(k / 3) % n) * 0.2)),
      ),
      subject = makeSubjectPlan(
        "people",
        "synthetic-people",
        DEFAULT_EDITS,
        portrait,
      ),
      options = {
        profile: createProfile("rectangle", 32),
        pixels,
        resolution: n,
        mode: "dark" as const,
        lines: 800,
        portrait,
        subject,
      };
    let cp: DensityCheckpoint | undefined;
    const i = await generateDensity(options, {
      ...tuning,
      onCheckpoint: (s) => {
        cp = s;
      },
    });
    await validateInstruction(i);
    expect((await reviewSubjectCandidate(i, i, pixels)).worstSubjectPass).toBe(
      true,
    );
    const changedTarget = new Uint8Array(pixels);
    changedTarget[0] ^= 1;
    await expect(reviewSubjectCandidate(i, i, changedTarget)).rejects.toThrow(
      "review target",
    );
    const missing = structuredClone(i);
    delete missing.metrics.regions!.final[
      Object.keys(missing.metrics.regions!.final)[0]
    ];
    await expect(validateInstruction(missing)).rejects.toThrow(
      "regional metrics",
    );
    expect(i.algorithm).toBe("density-subject/18");
    expect(
      Object.keys(i.metrics.regions!.final).filter((k) => k.endsWith(".whole")),
    ).toHaveLength(count);
    const replay = await generateDensity(options, {
      ...tuning,
      resume: cp,
      materializeOnly: true,
    });
    expect(replay.sequenceHash).toBe(i.sequenceHash);
    expect(replay.segments).toEqual(i.segments);
    await expect(
      generateDensity(options, {
        ...tuning,
        subjectObjective: { ...DEFAULT_SUBJECT_OBJECTIVE, detailMultiplier: 3 },
        resume: cp,
      }),
    ).rejects.toThrow("checkpoint");
    new Distribution(i.profile.pins.length, i.segments);
    const project = {
      schema: "iprasm.project/1",
      project: {
        id: "test",
        name: "Synthetic",
        edits: DEFAULT_EDITS,
        instruction: i,
        progress: progressFor(i),
      },
    };
    const imported = await parseProjectFile(JSON.stringify(project)),
      text = await parseProjectFile(toTxt(i));
    expect(
      "instruction" in imported
        ? imported.instruction.sequenceHash
        : imported.sequenceHash,
    ).toBe(i.sequenceHash);
    expect(
      "instruction" in text ? text.instruction.segments : text.segments,
    ).toEqual(i.segments);
  }, 30000);
for (const kind of ["animal", "vehicle", "object", "whole-image"] as const)
  for (const mode of ["dark", "light"] as const)
    it(`${kind}/${mode} uses generic details, no human portrait`, async () => {
      const n = 32,
        subject = makeSubjectPlan(kind, `synthetic-${kind}`, DEFAULT_EDITS);
      subject.subjects[0].reviewed = true;
      subject.subjects[0].bounds = {
        left: 0.1,
        top: 0.1,
        width: 0.8,
        height: 0.8,
      };
      subject.subjects[0].regions = [
        {
          role: "detail",
          box: { left: 0.3, top: 0.3, width: 0.3, height: 0.3 },
        },
      ];
      const options = {
        profile: createProfile("rectangle", 24, mode),
        pixels: new Uint8Array(n * n * 3).fill(mode === "dark" ? 160 : 80),
        resolution: n,
        mode,
        lines: 800,
        subject,
      };
      const i = await generateDensity(options, tuning);
      await validateInstruction(i);
      expect(i.params.portrait).toBeUndefined();
      expect(i.params.subject).toEqual(subject);
      expect(i.algorithm).toBe("density-subject/18");
      expect(Object.keys(i.metrics.regions!.final)).toEqual([
        "subject-1.whole",
        "subject-1.detail-1",
      ]);
    }, 30000);
it("320 is explicit and unsupported/cancelled combinations cannot fall back", async () => {
  const subject = makeSubjectPlan("object", "test", DEFAULT_EDITS);
  subject.subjects[0].reviewed = true;
  const options = {
    subject,
    profile: createProfile("circle", 24),
    pixels: new Uint8Array(320 * 320 * 3).fill(180),
    resolution: 320,
    lines: 800,
    mode: "dark" as const,
    cancelled: () => true,
  };
  await expect(generateDensity(options, tuning)).rejects.toMatchObject({
    name: "AbortError",
  });
  await expect(
    generateDensity({ ...options, mode: "color" }, tuning),
  ).rejects.toThrow();
  subject.subjects[0].reviewed = false;
  await expect(generateDensity(options, tuning)).rejects.toThrow("review");
}, 30000);
it("native320 actually fits and routes generic input without downsampling", async () => {
  const subject = makeSubjectPlan("object", "native320", DEFAULT_EDITS);
  subject.subjects[0].reviewed = true;
  const profile = createProfile("circle", 24),
    known = {
      profile,
      params: { resolution: 320 },
      segments: [{ color: profile.colors[0], path: [0, 6, 12, 18, 0] }],
      metrics: { lines: 4 },
    } as any,
    pixels = Uint8Array.from(rasterSequence(known), (v) => Math.round(v * 255));
  const i = await generateDensity(
    {
      subject,
      profile,
      pixels,
      resolution: 320,
      mode: "dark",
      lines: 1600,
    },
    { ...tuning, sweeps: 1 },
  );
  await validateInstruction(i);
  expect(i.params.resolution).toBe(320);
  expect(i.algorithm).toBe("density-subject/18");
  expect(i.metrics.densityFit!.evaluations).toBeGreaterThan(0);
}, 60000);
