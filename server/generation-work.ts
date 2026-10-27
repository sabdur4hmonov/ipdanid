import { generateClassicLeastSquares } from "../src/core/classic-least-squares";
import { generatePortraitEnhanced } from "../src/core/portrait-enhancement";
import { validateInstruction } from "../src/core/validation";
import { previewPng } from "../src/core/preview-png";
import type { PreparedGeneration } from "./generation-recipe";
export async function generateProtected(
  recipe: Pick<PreparedGeneration, "options" | "enhanced">,
  progress: (fraction: number) => void,
) {
  const fit = recipe.enhanced
      ? generatePortraitEnhanced
      : generateClassicLeastSquares,
    instruction = await validateInstruction(
      await fit({ ...recipe.options, onProgress: (p) => progress(p * 0.9) }),
    ),
    png = previewPng(instruction);
  progress(1);
  return { instruction, png };
}
