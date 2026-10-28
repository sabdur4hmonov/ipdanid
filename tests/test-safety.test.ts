import { afterEach, describe, expect, it, vi } from "vitest";
import { freshTestDatabase } from "../scripts/test-artifacts.mjs";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertTestDatabasePath,
  assertTestPorts,
} from "../server/test-safety.mjs";

describe("isolated test database boundary", () => {
  it("refuses every frozen owner preview/API before launching test services", () => {
    for (const port of [
      4194, 4195, 4196, 4197, 4198, 4199, 4200, 4201, 4210, 4211, 4212, 4213,
      4214, 4215, 4216, 4331, 4465, 4478, 4479, 4480, 4481, 4482, 4483, 4650, 4651,
      4652, 4653, 4654, 4655, 4656, 4217, 4657,
    ]) {
      expect(() => assertTestPorts(port, 4690)).toThrow("reserved");
      expect(() => assertTestPorts(4540, port)).toThrow("reserved");
    }
    for (const port of [0, 80, NaN, 65536, 4539.5])
      expect(() => assertTestPorts(port, 4690)).toThrow();
    expect(() => assertTestPorts(4540, 4540)).toThrow("differ");
    expect(() => assertTestPorts(4540, 4690)).not.toThrow();
  });
  afterEach(() => vi.unstubAllEnvs());
  it("allocates distinct artifact databases and rejects a protected root before mkdir", () => {
    const root = mkdtempSync(join(tmpdir(), "iprasm-artifacts-"));
    try {
      vi.stubEnv("DATABASE_PATH", "");
      vi.stubEnv("IP_RASM_TEST_ARTIFACTS", root);
      const a = freshTestDatabase("http"),
        b = freshTestDatabase("http");
      expect(a.databasePath).not.toBe(b.databasePath);
      expect(a.databasePath.startsWith(root)).toBe(true);
      vi.stubEnv("IP_RASM_TEST_ARTIFACTS", join(root, "tmp", "data"));
      expect(() => freshTestDatabase("http")).toThrow("owner data");
      expect(existsSync(join(root, "tmp"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("refuses owner paths including traversal and missing configuration", () => {
    for (const path of [
      undefined,
      "tmp/data/iprasm.sqlite",
      "tmp/data/new/db.sqlite",
      "tmp/tests/../data/db.sqlite",
    ])
      expect(() => assertTestDatabasePath(path)).toThrow();
    expect(() => assertTestDatabasePath(":memory:")).not.toThrow();
    expect(() =>
      assertTestDatabasePath("test-results/api-unique/test.sqlite"),
    ).not.toThrow();
  });
  it("refuses an existing ancestor junction into protected data", () => {
    const root = mkdtempSync(join(tmpdir(), "iprasm-safety-"));
    try {
      const protectedPath = join(root, "tmp", "data");
      mkdirSync(protectedPath, { recursive: true });
      symlinkSync(
        protectedPath,
        join(root, "alias"),
        process.platform === "win32" ? "junction" : "dir",
      );
      expect(() =>
        assertTestDatabasePath(join(root, "alias", "new", "db.sqlite")),
      ).toThrow("owner data");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
