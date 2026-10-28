import { createHash } from "node:crypto";
import { DomainError } from "./store";
import { reviewedKitPins } from "./generation-pins";
import {
  standardProfiles,
  type StandardKitConfig,
} from "../src/core/standard-kit";
import { leastSquaresProfile } from "../src/core/classic-least-squares";
import { frameFreePhoto } from "../src/core/free-photo-framing";
import { withPortraitCaption } from "../src/core/portrait-caption";
import type { GenerateOptions } from "../src/core/engine";
import type { Shape } from "../src/core/types";
import type { KitPreparation } from "../src/core/standard-preparation";
export function generationCapability(value: unknown): string {
  if (typeof value !== "string" || !/^[-_A-Za-z0-9]{32,86}$/.test(value))
    throw new DomainError("Generation unavailable", 404);
  const bytes = Buffer.from(value, "base64url");
  if (
    bytes.length < 24 ||
    bytes.length > 64 ||
    bytes.toString("base64url") !== value
  )
    throw new DomainError("Generation unavailable", 404);
  return value;
}
export function generationIdentity(value: unknown): string {
  if (typeof value !== "string" || !/^[-\w]{8,100}$/.test(value))
    throw new DomainError("Invalid generation request");
  return value;
}
export function decodeGenerationRecipe(
  value: unknown,
  config: StandardKitConfig,
) {
  try {
    const b = value as Record<string, any>;
    if (
      !b ||
      Object.keys(b).sort().join() !==
        [
          "version",
          "consent",
          "shape",
          "revision",
          "lines",
          "target",
          "preparation",
          "secret",
          "requestKey",
          ...(b.pins === undefined ? [] : ["pins"]),
        ]
          .sort()
          .join() ||
      b.version !== "protected-generation/1" ||
      b.consent !== "prepared-target-transfer/1" ||
      !["circle", "rectangle", "heart"].includes(b.shape) ||
      ![2500, 3000, 3500].includes(b.lines)
    )
      throw Error("recipe");
    generationCapability(b.secret);
    generationIdentity(b.requestKey);
    if (b.revision !== config.revision)
      throw new DomainError(
        "Kit profile changed; reload before generation",
        409,
      );
    if (
      typeof b.target !== "string" ||
      b.target.length !== 333334 ||
      !/^[A-Za-z0-9_-]+$/.test(b.target)
    )
      throw Error("target");
    const mono = Buffer.from(b.target, "base64url");
    if (mono.length !== 250000 || mono.toString("base64url") !== b.target)
      throw Error("target");
    const k = b.preparation as KitPreparation;
    if (
      !k ||
      Object.keys(k).sort().join() !==
        [
          "version",
          "sourceHash",
          "sourceAspect",
          "whiteBackground",
          "transform",
        ]
          .sort()
          .join() ||
      k.version !== "standard-preparation/9" ||
      !/^[a-f0-9]{64}$/.test(k.sourceHash) ||
      !Number.isFinite(k.sourceAspect) ||
      k.sourceAspect < 0.02 ||
      k.sourceAspect > 50 ||
      !["automatic", "manual", "original"].includes(k.whiteBackground) ||
      JSON.stringify(k).length > 24000
    )
      throw Error("preparation");
    const f = k.transform;
    if (
      !f ||
      !Array.isArray(f.faces) ||
      f.faces.length > 3 ||
      !f.product ||
      !["people", "animal", "vehicle", "object", "lettering"].includes(
        f.product.kind,
      ) ||
      f.faces.some(
        (r) =>
          !r ||
          Object.keys(r).sort().join() !== "height,left,top,width" ||
          Object.values(r).some((x) => !Number.isFinite(x)) ||
          r.width <= 0 ||
          r.height <= 0 ||
          r.left < 0 ||
          r.top < 0 ||
          r.left + r.width > 1.000001 ||
          r.top + r.height > 1.000001,
      ) ||
      (f.caption?.text.length ?? 0) > 64
    )
      throw Error("framing");
    const canonical = withPortraitCaption(
      frameFreePhoto(
        f.product.kind,
        f.faces,
        b.shape,
        k.sourceAspect,
        f.framing?.adjustments[0],
        f.framing?.rotation,
      ),
      b.shape,
      f.caption?.text ?? "",
      "bidi/2",
    );
    if (JSON.stringify(canonical) !== JSON.stringify(f)) throw Error("framing");
    const profile = reviewedKitPins(
        leastSquaresProfile(
          standardProfiles(config).find((p) => p.shape === b.shape)!,
          true,
        ),
        b.pins,
      ),
      pixels = new Uint8Array(750000);
    if (
      f.product.kind === "people" &&
      f.faces.length > profile.standardKit!.maxPeople
    )
      throw Error("people limit");
    for (let at = 0; at < mono.length; at++)
      pixels.fill(mono[at], at * 3, at * 3 + 3);
    const options: GenerateOptions = {
        pixels,
        profile,
        resolution: 500,
        lines: b.lines,
        mode: "dark",
        accessPolicy: "kit-build/1",
        kitPreparation: structuredClone(k),
      },
      recipeHash = createHash("sha256")
        .update(mono)
        .update(JSON.stringify({ profile, preparation: k, lines: b.lines }))
        .digest("hex");
    return {
      options,
      recipeHash,
      secret: b.secret as string,
      requestKey: b.requestKey as string,
      enhanced: f.product.kind === "people" && !f.caption,
      shape: b.shape as Shape,
    };
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw new DomainError("Invalid prepared generation target");
  }
}
export type PreparedGeneration = ReturnType<typeof decodeGenerationRecipe>;
