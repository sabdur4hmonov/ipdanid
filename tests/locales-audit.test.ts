import { expect, test } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  auditLocaleSource,
  auditLocales,
  auditVisibleLiterals,
} from "../scripts/check-locales.mjs";
test("CI inspects every source locale dictionary without importing browser code", () => {
  const result = auditLocales();
  expect(result.errors).toEqual([]);
  expect(result.dictionaries.length).toBeGreaterThan(45);
  expect(
    result.dictionaries.reduce(
      (n: number, d: { keys: number }) => n + d.keys,
      0,
    ),
  ).toBeGreaterThan(1600);
});
test("missing language, missing key, blank tuple and missing Cyrillic bridge each fail the audit", () => {
  const good =
    'const words={title:["Salom","Привет","Hello"]}; function text(l,k){return scriptText(words[k][0],l)}';
  expect(auditLocaleSource(good).errors).toEqual([]);
  for (const bad of [
    good.replace(',"Hello"', ""),
    good.replace('"Привет"', '"  "'),
    good.replace("scriptText", "unreviewedFallback"),
    'const words={uz:{title:"Salom"},ru:{},en:{title:"Hello"}};scriptText("x",l)',
    'const uz={title:"Salom"},en={title:"Hello"};scriptText("x",l)',
  ])
    expect(auditLocaleSource(bad).errors.length).toBeGreaterThan(0);
});
test("recorded-voice per-key locales and transactional title/body arrays are checked too", () => {
  expect(
    auditLocaleSource(
      'const words={hello:{uz:"Salom",ru:"Привет",en:"Hello"}};scriptText("x",l)',
    ).errors,
  ).toEqual([]);
  expect(
    auditLocaleSource(
      'const en={order:["Title","Body"]},uz={order:["Sarlavha","Matn"]},ru={order:["Тема",""]};scriptText("x",l)',
    ).errors.length,
  ).toBeGreaterThan(0);
});
test("nested keys and interpolation placeholders cannot silently diverge", () => {
  expect(
    auditLocaleSource(
      'const words={uz:{group:{title:"Salom"}},en:{group:{title:"Hello"}},ru:{group:{}}};scriptText("x",l)',
    ).errors.length,
  ).toBeGreaterThan(0);
  expect(
    auditLocaleSource(
      'const words={title:["Salom {0}","Привет {1}","Hello {0}"]};scriptText("x",l)',
    ).errors.length,
  ).toBeGreaterThan(0);
});
test("CI rejects new untranslated JSX prose while keeping invariant dimensions and autonyms", () => {
  const result = auditLocaleSource(
    '<div>Untranslated recovery message<select aria-label="Untranslated picker"/><span>mm</span></div>',
    "fixture.tsx",
  );
  expect(auditVisibleLiterals(result.literals)).toHaveLength(2);
});
test("the actual CI command exits nonzero when one language key is removed", () => {
  mkdirSync("test-results", { recursive: true });
  const dir = mkdtempSync("test-results/locale-negative-");
  const file = dir + "/fixture-i18n.ts";
  const good =
    'const words={uz:{title:"Salom"},ru:{title:"Привет"},en:{title:"Hello"}}; function text(l,k){return scriptText(words[l][k],l)}';
  writeFileSync(file, good);
  const run = () =>
    spawnSync(
      process.execPath,
      ["scripts/check-locales.mjs", "--source-root=" + dir],
      { encoding: "utf8" },
    );
  expect(run().status).toBe(0);
  writeFileSync(file, good.replace('ru:{title:"Привет"}', "ru:{}"));
  const failure = run();
  expect(failure.status).toBe(1);
  expect(failure.stderr).toContain("Missing ru translation");
});
