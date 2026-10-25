import { test, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import {
  secretKinds,
  prohibitedHistoryPath,
  auditHistory,
} from "../scripts/audit-history-secrets.mjs";
test("credential patterns/known environment values are redacted and examples stay allowed", () => {
  const fake = "ghp_" + "a".repeat(36),
    known = "Synthetic-only-hidden-value-123456789";
  expect(secretKinds(fake)).toEqual(["github-token"]);
  expect(secretKinds('let x="' + known + '"', [known])).toEqual([
    "known-environment-value",
  ]);
  expect(prohibitedHistoryPath(".env.production")).toBe(true);
  expect(prohibitedHistoryPath(".env.example")).toBe(false);
  expect(prohibitedHistoryPath("docs/BACKUP_UZ.md")).toBe(false);
});
test("full history still detects a credential removed from the current tree without printing its value", () => {
  mkdirSync("test-results", { recursive: true });
  const dir = resolve(mkdtempSync("test-results/history-canary-"));
  const git = (...args: string[]) =>
    execFileSync(
      "git",
      [
        "-c",
        "core.hooksPath=" + dir + "/disabled-hooks",
        "-c",
        "user.name=Synthetic Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      { cwd: dir, stdio: "pipe", windowsHide: true },
    );
  git("init", "-b", "fixture");
  const fake = "ghp_" + "b".repeat(36);
  writeFileSync(dir + "/.env", "TOKEN=" + fake);
  git("add", "-f", ".env");
  git("commit", "-qm", "Synthetic private canary");
  unlinkSync(dir + "/.env");
  writeFileSync(dir + "/safe.txt", "No credentials");
  git("add", "-A");
  git("commit", "-qm", "Remove canary from current tree");
  const report = auditHistory(dir, []);
  expect(report.prohibitedPaths).toContain(".env");
  expect(report.findings).toHaveLength(1);
  expect(report.findings[0].kinds).toContain("github-token");
  expect(JSON.stringify(report)).not.toContain(fake);
});
