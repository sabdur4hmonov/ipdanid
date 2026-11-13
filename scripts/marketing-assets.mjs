import { createHash } from "node:crypto";

// Owner-authorized W2 generated concept, not a photograph of a person or customer result.
// A path alone never permits media export: the committed bytes must match too.
export const marketingAssets = Object.freeze({
  "src/assets/craft-concept-v1-576.webp":
    "d745ed0d158a65cfddc3a59b6c09766b94cf828f935b6ba29a08dd08c5bb050e",
  "src/assets/craft-concept-v1-1152.webp":
    "64a90685039f5f18d88ec43edfc51975a5cf2654eeb09dd27cf83fb29469b265",
});
export function approvedMarketingAsset(path, bytes) {
  return (
    Object.hasOwn(marketingAssets, path) &&
    createHash("sha256").update(bytes).digest("hex") === marketingAssets[path]
  );
}
