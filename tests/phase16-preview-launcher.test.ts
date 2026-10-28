import { test, expect } from "vitest";
import { spawnSync } from "node:child_process";
test("new Phase16 launcher refuses old snapshots, owner paths and unknown arguments before writes or private key reads", () => {
  for (const args of [
    [],
    ["--name", "final-review"],
    ["--dist=tmp/data"],
    ["--dist=output/phase15-final-review-dist"],
    ["--dist=output/phase16-private/phase16-fake-dist"],
    ["--dist=output/phase16-fake-dist", "extra"],
  ]) {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/start-phase16-preview.mjs", ...args],
      { encoding: "utf8", windowsHide: true, timeout: 15000 },
    );
    expect(result.status).not.toBe(0);
    expect(result.error).toBeUndefined();
    expect(result.stderr).toMatch(
      /Expected one explicit|immediate workspace output child|Only a fresh Phase16/,
    );
    expect(result.stdout).not.toContain("ready");
  }
}, 90000);
