import type { Instruction, Locale, Shape } from "./types";
import type { SubjectKind, SubjectPlan } from "./subject-plan";
import { baseLocale, scriptText } from "../uzbek-script";
export type GenerationStrategy =
  | "classic"
  | "classic2"
  | "continuous"
  | "guarded"
  | "global"
  | "multiscale"
  | "physical"
  | "anatomy"
  | "basis"
  | "features"
  | "texture"
  | "subjects"
  | "outline"
  | "simplify";
interface Capability {
  canContinue: boolean;
  render: "legacy-lines" | "optical-raster";
  strategy: GenerationStrategy;
  continuation: GenerationStrategy;
  kinds: readonly SubjectKind[];
  modes: readonly string[];
  shapes: readonly Shape[];
  maximumResolution: number;
  maximumSubjects: number;
  experimental: boolean;
}
const allKinds: SubjectKind[] = [
    "people",
    "animal",
    "vehicle",
    "object",
    "whole-image",
  ],
  allShapes: Shape[] = ["circle", "rectangle", "heart"];
const cap = (
  strategy: GenerationStrategy,
  options: Partial<Capability> = {},
): Capability => ({
  render: "optical-raster",
  canContinue: true,
  strategy,
  continuation: strategy,
  kinds: allKinds,
  modes: ["dark", "light", "color"],
  shapes: allShapes,
  maximumResolution: 192,
  maximumSubjects: 1,
  experimental: false,
  ...options,
});
export const CAPABILITIES: Readonly<
  Record<Instruction["algorithm"], Capability>
> = Object.freeze({
  "standard-accent/20": cap("outline", {
    modes: ["dark"],
    shapes: ["heart"],
    maximumSubjects: 2,
    canContinue: false,
    experimental: true,
  }),
  "standard-accent/21": cap("outline", {
    modes: ["dark"],
    shapes: ["heart"],
    maximumSubjects: 2,
    canContinue: false,
    experimental: true,
    maximumResolution: 500,
  }),
  "classic-greedy/1": cap("classic", { modes: ["dark"], maximumSubjects: 3 }),
  "classic-greedy/2": cap("classic2", {
    modes: ["dark"],
    maximumSubjects: 3,
    maximumResolution: 500,
  }),
  "greedy-optical/1": cap("global", { render: "legacy-lines" }),
  "greedy-optical/2": cap("global", { render: "legacy-lines" }),
  "greedy-optical/3": cap("global"),
  "greedy-optical/4": cap("continuous", { continuation: "global" }),
  "continuous-guarded/6": cap("guarded", { continuation: "multiscale" }),
  "group-optical/15": cap("guarded", { kinds: ["people"], maximumSubjects: 8 }),
  "density-optical/5": cap("global", {
    kinds: ["people"],
    modes: ["dark", "light"],
  }),
  "density-multiscale/7": cap("multiscale", {
    kinds: ["people"],
    modes: ["dark", "light"],
  }),
  "density-physical/8": cap("physical", {
    kinds: ["people"],
    modes: ["dark", "light"],
  }),
  "density-anatomy/10": cap("anatomy", {
    kinds: ["people"],
    modes: ["dark", "light"],
    experimental: true,
  }),
  "density-pin-basis/11": cap("basis", {
    kinds: ["people"],
    modes: ["dark", "light"],
    shapes: ["circle"],
    experimental: true,
  }),
  "density-resolved/12": cap("basis", {
    kinds: ["people"],
    modes: ["dark", "light"],
    shapes: ["circle"],
    maximumResolution: 320,
    experimental: true,
  }),
  "density-head/13": cap("basis", {
    kinds: ["people"],
    modes: ["dark", "light"],
    shapes: ["circle"],
    maximumResolution: 320,
    experimental: true,
  }),
  "hair-cycles/14": cap("basis", {
    kinds: ["people"],
    modes: ["dark"],
    shapes: ["circle"],
    maximumResolution: 320,
    experimental: true,
  }),
  "density-feature/16": cap("features", {
    kinds: ["people"],
    modes: ["dark", "light"],
    shapes: ["circle"],
    maximumResolution: 320,
    experimental: true,
  }),
  "density-texture/17": cap("texture", {
    kinds: ["people"],
    modes: ["dark"],
    shapes: ["circle"],
    maximumResolution: 320,
    experimental: true,
  }),
  "density-subject/18": cap("subjects", {
    modes: ["dark", "light"],
    maximumResolution: 320,
    maximumSubjects: 3,
    experimental: true,
  }),
  "glyph-outline/19": cap("outline", {
    kinds: ["whole-image"],
    modes: ["dark"],
    shapes: ["rectangle"],
    maximumResolution: 320,
    canContinue: false,
    experimental: true,
  }),
  "assembly-prune/9": cap("simplify", {
    maximumResolution: 320,
    continuation: "global",
  }),
});
export type CapabilityProblem = "review" | "combination" | "clipped";
export function getCapability(algorithm: string) {
  return Object.hasOwn(CAPABILITIES, algorithm)
    ? CAPABILITIES[algorithm as Instruction["algorithm"]]
    : undefined;
}
const messages = {
  en: {
    review:
      "Review every subject and marked detail before using this solver (up to three subjects).",
    combination:
      "This solver does not support this subject, colour, shape or resolution combination. Choose a supported combination explicitly.",
    clipped:
      "A marked subject is outside the board or too small. Move or enlarge it.",
  },
  uz: {
    review:
      "Bu usuldan oldin har bir obyekt va belgilangan qismni tekshiring (ko‘pi bilan uchta obyekt).",
    combination:
      "Bu usul obyekt, rang, shakl yoki aniqlikning ushbu birikmasini qo‘llamaydi. Mos birikmani tanlang.",
    clipped:
      "Belgilangan obyekt taxtadan tashqarida yoki juda kichik. Uni suring yoki kattalashtiring.",
  },
  ru: {
    review: "Проверьте каждый объект и отмеченные детали (до трёх объектов).",
    combination:
      "Этот метод не поддерживает сочетание объекта, цвета, формы или разрешения. Выберите поддерживаемое сочетание.",
    clipped:
      "Отмеченный объект вне доски или слишком мал. Переместите или увеличьте его.",
  },
};
export function capabilityMessage(locale: Locale, problem: CapabilityProblem) {
  return scriptText(messages[baseLocale(locale)][problem], locale);
}
export function capabilityProblem(
  algorithm: Instruction["algorithm"],
  o: { subject?: SubjectPlan; mode: string; resolution: number; shape: Shape },
): CapabilityProblem | undefined {
  const c = CAPABILITIES[algorithm];
  if (
    !c ||
    !c.modes.includes(o.mode) ||
    !c.shapes.includes(o.shape) ||
    !Number.isInteger(o.resolution) ||
    o.resolution < 32 ||
    o.resolution > c.maximumResolution ||
    (o.subject && !c.kinds.includes(o.subject.kind))
  )
    return "combination";
  if (
    algorithm === "density-subject/18" &&
    (!o.subject ||
      o.subject.subjects.length > c.maximumSubjects ||
      o.subject.subjects.some((v) => !v.reviewed))
  )
    return "review";
}
