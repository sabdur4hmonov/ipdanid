import type { combinedHoles } from "../src/core/standard-kit";

export function boardCoordinateCsv(holes: ReturnType<typeof combinedHoles>) {
  return "pattern,pin_index_zero_based,pin_number_one_based,sector_label,x_mm,y_mm\n" +
    holes.map(({ pattern, pin, label, xMm, yMm }) =>
      [pattern, pin, pin + 1, label, xMm.toFixed(6), yMm.toFixed(6)].join(","),
    ).join("\n") + "\n";
}
