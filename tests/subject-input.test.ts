import { it, expect, describe } from "vitest";
import {
  DEFAULT_PORTRAIT,
  processPortrait,
  validPortrait,
} from "../src/core/portrait";
import {
  makeSubjectPlan,
  subjectPlanOf,
  validSubjectPlan,
  LEGACY_SOURCE_REVISION,
  type SubjectKind,
} from "../src/core/subject-plan";
import {
  addPerson,
  movePerson,
  peopleEntries,
  removePerson,
  setPersonReviewed,
  unconfirmedPeople,
  unreviewedPeople,
  withPeople,
} from "../src/core/people-edit";
import {
  estimatedPairPortrait,
  reviewedPeoplePortrait,
} from "../src/core/face-features";
import { createProfile } from "../src/core/geometry";
import { generate, hash, sequencePayload } from "../src/core/engine";
import { validateInstruction } from "../src/core/validation";
import { DEFAULT_EDITS, type PortraitSettings } from "../src/core/types";
import { syntheticSubject } from "./fixtures/synthetic-subjects";
import { customerError } from "../src/errors";

const off = (): PortraitSettings => ({
  ...structuredClone(DEFAULT_PORTRAIT),
  enabled: false,
});
const reviewedAll = (p: PortraitSettings) =>
  peopleEntries(p).reduce((v, f) => setPersonReviewed(v, f.id!, true), p);

describe("general subjects keep original pixels", () => {
  for (const [kind, fixture] of [
    ["vehicle", "car"],
    ["animal", "dog"],
    ["object", "object"],
  ] as const)
    it(`${kind}: target is the exact source and the plan forbids person masks`, () => {
      const pixels = syntheticSubject(fixture, 64);
      const plan = makeSubjectPlan(kind, "rev-1", DEFAULT_EDITS, off());
      // Non-people kinds never enable person processing; pixels pass through.
      expect(Array.from(processPortrait(pixels, 64, off()))).toEqual(
        Array.from(pixels),
      );
      expect(plan.kind).toBe(kind);
      expect(plan.preparation).toBe("original");
      expect(plan.subjects).toHaveLength(1);
      expect(plan.subjects[0].regions).toEqual([]);
      expect(() =>
        makeSubjectPlan(
          kind,
          "rev-1",
          DEFAULT_EDITS,
          off(),
          "explicit-person-mask",
        ),
      ).toThrow("Person-only mask");
      expect(() => validSubjectPlan(plan, { ...off(), enabled: true })).toThrow(
        "human anatomy",
      );
      expect(
        makeSubjectPlan(
          kind,
          "rev-1",
          DEFAULT_EDITS,
          off(),
          "manual-subject-mask",
        ).preparation,
      ).toBe("manual-subject-mask");
    });
  it("rejects malformed plans", () => {
    const plan = makeSubjectPlan("object", "rev", DEFAULT_EDITS, off());
    for (const bad of [
      { ...plan, version: "subject-plan/2" },
      { ...plan, kind: "plant" },
      { ...plan, sourceRevision: "" },
      { ...plan, subjects: [] },
      { ...plan, subjects: [plan.subjects[0], plan.subjects[0]] },
      {
        ...plan,
        subjects: [
          {
            ...plan.subjects[0],
            bounds: { left: 0.5, top: 0, width: 0.7, height: 1 },
          },
        ],
      },
    ])
      expect(() => validSubjectPlan(bad as never, off())).toThrow();
  });
});

describe("immutable subject metadata", () => {
  const profile = () => createProfile("circle", 48);
  it("new guides carry the plan inside the hashed params; tampering is rejected", async () => {
    const pixels = syntheticSubject("car", 48),
      subject = makeSubjectPlan("vehicle", "rev-car", DEFAULT_EDITS, off());
    const i = await generate({
      pixels,
      resolution: 48,
      profile: profile(),
      lines: 60,
      mode: "dark",
      subject,
      guarded: true,
    });
    expect(i.params.subject).toEqual(subject);
    expect(i.params.portrait).toBeUndefined();
    await validateInstruction(i);
    expect(subjectPlanOf(i.params)).toEqual({ plan: subject, legacy: false });
    const changed = structuredClone(i);
    changed.params.subject!.kind = "object";
    await expect(validateInstruction(changed)).rejects.toThrow();
    const unsafe = structuredClone(i);
    unsafe.params.subject!.preparation = "explicit-person-mask";
    await expect(validateInstruction(unsafe)).rejects.toThrow();
  });
  it("legacy guides without a plan keep their exact params and hash; the adapter is read-only", async () => {
    const pixels = syntheticSubject("object", 48);
    const legacy = await generate({
      pixels,
      resolution: 48,
      profile: profile(),
      lines: 40,
      mode: "dark",
      portrait: { ...DEFAULT_PORTRAIT, enabled: true },
    });
    const before = JSON.stringify(legacy);
    expect(legacy.params.subject).toBeUndefined();
    const view = subjectPlanOf(legacy.params);
    expect(view.legacy).toBe(true);
    expect(view.plan.kind).toBe("people");
    expect(view.plan.sourceRevision).toBe(LEGACY_SOURCE_REVISION);
    expect(JSON.stringify(legacy)).toBe(before);
    expect(await hash(sequencePayload(legacy))).toBe(legacy.sequenceHash);
    await validateInstruction(legacy);
    const general = await generate({
      pixels,
      resolution: 48,
      profile: profile(),
      lines: 40,
      mode: "dark",
    });
    expect(subjectPlanOf(general.params).plan.kind).toBe("whole-image");
  });
  it("engine refuses a general plan combined with person anatomy", async () => {
    await expect(
      generate({
        pixels: syntheticSubject("dog", 48),
        resolution: 48,
        profile: profile(),
        lines: 20,
        mode: "dark",
        portrait: { ...DEFAULT_PORTRAIT, enabled: true },
        subject: makeSubjectPlan("animal", "r", DEFAULT_EDITS, off()),
      }),
    ).rejects.toThrow();
  });
});

describe("1–3 people with independent review", () => {
  const detected = () => {
    // Two detector faces in source coordinates (synthetic boxes, not anatomy).
    const face = (left: number) => ({
      face: { left, top: 0.25, width: 0.25, height: 0.45 },
      eyes: { left: left + 0.03, top: 0.33, width: 0.19, height: 0.07 },
      nose: { left: left + 0.08, top: 0.42, width: 0.09, height: 0.1 },
      mouth: { left: left + 0.06, top: 0.55, width: 0.13, height: 0.06 },
    });
    return unconfirmedPeople(
      reviewedPeoplePortrait(
        [face(0.1), face(0.6)] as never,
        { ...DEFAULT_PORTRAIT, enabled: true },
        DEFAULT_EDITS,
        400,
        400,
        1,
        160,
        "rectangle",
      ),
    );
  };
  it("detector suggestions start unconfirmed for every person", () => {
    const p = detected();
    expect(peopleEntries(p)).toHaveLength(2);
    expect(unreviewedPeople(p)).toEqual([1, 2]);
  });
  it("adds a third person when the detector found two, with stable ids", () => {
    const p = detected(),
      before = peopleEntries(p);
    const three = addPerson(p, "manual-third");
    const after = peopleEntries(three);
    expect(after).toHaveLength(3);
    expect(after.slice(0, 2)).toEqual(before);
    expect(after[2].id).toBe("manual-third");
    expect(after[2].regions.placement).toBe("proportional-estimate");
    validPortrait(three);
    expect(() => addPerson(three, "fourth")).toThrow("up to three");
    expect(() => addPerson(p, before[0].id!)).toThrow();
  });
  it("review gates per person; moving one person invalidates only that person", async () => {
    let p = addPerson(detected(), "third");
    expect(unreviewedPeople(p)).toEqual([1, 2, 3]);
    p = setPersonReviewed(p, peopleEntries(p)[0].id!, true);
    expect(unreviewedPeople(p)).toEqual([2, 3]);
    expect(
      customerError(`people-review/${unreviewedPeople(p).join(",")}`, "en"),
    ).toContain("2, 3");
    p = reviewedAll(p);
    expect(unreviewedPeople(p)).toEqual([]);
    const entries = peopleEntries(p);
    const moved = withPeople(
      p,
      entries.map((f, k) =>
        k === 1 ? movePerson(f, { ...f.face, left: f.face.left + 0.02 }) : f,
      ),
    );
    expect(unreviewedPeople(moved)).toEqual([2]);
    expect(peopleEntries(moved)[0]).toEqual(entries[0]);
    expect(peopleEntries(moved)[2]).toEqual(entries[2]);
    const resized = withPeople(
      p,
      entries.map((f, k) =>
        k === 2 ? movePerson(f, { ...f.face, width: f.face.width * 0.9 }) : f,
      ),
    );
    expect(unreviewedPeople(resized)).toEqual([3]);
    // The Worker contract agrees with the UI gate.
    const pixels = new Uint8Array(64 * 64 * 3).fill(200);
    await expect(
      generate({
        pixels,
        resolution: 64,
        profile: createProfile("rectangle", 32),
        lines: 10,
        mode: "dark",
        portrait: moved,
      }),
    ).rejects.toThrow("Review every person");
  });
  it("removing a person keeps the others' boxes, ids and review state", () => {
    let p = addPerson(detected(), "third");
    p = setPersonReviewed(p, peopleEntries(p)[2].id!, true);
    const removed = removePerson(p, peopleEntries(p)[0].id!);
    expect(peopleEntries(removed).map((f) => f.id)).toEqual(
      peopleEntries(p)
        .slice(1)
        .map((f) => f.id),
    );
    expect(unreviewedPeople(removed)).toEqual([1]);
    const single = removePerson(removed, peopleEntries(removed)[0].id!);
    expect(single.people).toBeUndefined();
    expect(single.personId).toBe("third");
    expect(unreviewedPeople(single)).toEqual([]);
    expect(removePerson(single, "third")).toBe(single);
  });
  it("a people plan records every person and its review flag", () => {
    const p = reviewedAll(addPerson(detected(), "third"));
    const plan = makeSubjectPlan("people", "rev", DEFAULT_EDITS, p);
    expect(plan.subjects.map((s) => s.id)).toEqual(
      peopleEntries(p).map((f) => f.id),
    );
    expect(plan.subjects.every((s) => s.reviewed)).toBe(true);
    const half = setPersonReviewed(p, peopleEntries(p)[1].id!, false);
    expect(() => validSubjectPlan(plan, half)).toThrow("differ");
  });
  it("legacy 4–8 person portraits still load and validate", () => {
    const base = estimatedPairPortrait({ ...DEFAULT_PORTRAIT, enabled: true });
    const faces = Array.from({ length: 6 }, (_, k) => ({
      ...structuredClone(base.people!.faces[0]),
      id: `legacy-${k}`,
    }));
    const legacy: PortraitSettings = {
      ...base,
      people: { ...base.people!, faces },
    };
    validPortrait(legacy);
    expect(peopleEntries(legacy)).toHaveLength(6);
    expect(() => addPerson(legacy, "x")).toThrow();
    const plan = makeSubjectPlan(
      "people",
      "r",
      DEFAULT_EDITS,
      reviewedAll(legacy),
    );
    expect(plan.subjects).toHaveLength(6);
    expect(peopleEntries(removePerson(legacy, "legacy-0"))).toHaveLength(5);
  });
});

it("every subject kind has localized card text in all four locales", async () => {
  const { subjectText } = await import("../src/subject-i18n");
  const kinds: SubjectKind[] = [
    "people",
    "animal",
    "vehicle",
    "object",
    "whole-image",
  ];
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    const titles = kinds.map((k) => subjectText(locale, k));
    expect(new Set(titles).size).toBe(5);
    for (const k of kinds)
      expect(subjectText(locale, `${k}-desc`).length).toBeGreaterThan(5);
  }
  expect(subjectText("uz-Cyrl", "vehicle")).toMatch(/[А-Яа-яЎўҚқҒғҲҳ]/);
  expect(subjectText("uz", "vehicle")).toBe("Mashina");
});
