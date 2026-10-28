import { test, expect } from "vitest";
import { privateManualUrl } from "../scripts/manual-file-boundary";
test("private instruction filename stays denied for imports, encoding, Windows case and FS URLs without blocking owner docs", () => {
  for (const path of [
    "/output/phase16/manual-testing.txt",
    "/output/phase16/manual-testing.txt?import",
    "/@fs/D:/workspace/manual-testing.txt?raw",
    "/output/MANUAL-TESTING.TXT",
    "/output/%6danual-testing.txt",
    "/output/manual-testing-before-123.txt",
    "/output%5cmanual-testing.txt",
  ])
    expect(privateManualUrl(path)).toBe(true);
  for (const path of [
    "/",
    "/AGENT/OWNER_TESTS.md",
    "/manual-testing.md",
    "/manual-testing.txt/icon.svg",
    "/%invalid",
  ])
    expect(privateManualUrl(path)).toBe(false);
});
