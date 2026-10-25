import ts from "typescript";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const locales = ["uz", "ru", "en"];
const unwrap = (n) => {
  while (
    n &&
    (ts.isAsExpression(n) ||
      ts.isSatisfiesExpression(n) ||
      ts.isParenthesizedExpression(n) ||
      ts.isTypeAssertionExpression(n))
  )
    n = n.expression;
  return n;
};
const name = (p) =>
  p.name &&
  (ts.isIdentifier(p.name) ||
    ts.isStringLiteral(p.name) ||
    ts.isNumericLiteral(p.name))
    ? p.name.text
    : undefined;
const textValue = (n) =>
  n && (ts.isStringLiteralLike(n) || ts.isNoSubstitutionTemplateLiteral(n))
    ? n.text
    : undefined;

// AST-only: never imports product/browser code or evaluates a translation as JS.
export function auditLocaleSource(source, file = "fixture-i18n.ts") {
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const errors = [],
    dictionaries = [],
    literals = [],
    variables = new Map(),
    seen = new Set();
  const position = (n) =>
    ast.getLineAndCharacterOfPosition(n.getStart(ast)).line + 1;
  const fail = (node, message) =>
    errors.push(`${file}:${position(node)} ${message}`);
  function collect(n) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name))
      variables.set(n.name.text, unwrap(n.initializer));
    ts.forEachChild(n, collect);
  }
  collect(ast);
  const object = (n) => {
    n = unwrap(n);
    if (n && ts.isIdentifier(n)) n = variables.get(n.text);
    return n && ts.isObjectLiteralExpression(n) ? n : undefined;
  };
  const props = (obj) => obj.properties.filter(ts.isPropertyAssignment);
  function keys(obj) {
    return props(obj).map(name).filter(Boolean);
  }
  function checkLeaves(obj, path) {
    if (obj.properties.some((p) => !ts.isPropertyAssignment(p)))
      fail(obj, `Unreviewed spread/method in translation ${path}`);
    const names = new Set();
    for (const p of props(obj)) {
      const k = name(p),
        v = unwrap(p.initializer);
      if (!k) {
        fail(p, `Unreviewed computed translation key in ${path}`);
        continue;
      }
      if (names.has(k)) fail(p, `Duplicate translation ${path}.${k}`);
      names.add(k);
      if (object(v)) checkLeaves(object(v), `${path}.${k}`);
      else if (v && ts.isArrayLiteralExpression(v)) {
        if (
          !v.elements.length ||
          v.elements.some(
            (e) =>
              textValue(unwrap(e)) === undefined ||
              !textValue(unwrap(e)).trim(),
          )
        )
          fail(p, `Missing/empty translation ${path}.${k}`);
      } else if (textValue(v) === undefined || !textValue(v).trim())
        fail(p, `Missing/empty translation ${path}.${k}`);
    }
  }
  function nestedParity(objects, path) {
    const union = new Set(objects.flatMap(keys));
    for (const key of union) {
      const values = objects.map((o) => props(o).find((p) => name(p) === key));
      values.forEach((p, j) => {
        if (!p)
          fail(objects[j], `Missing ${locales[j]} translation ${path}.${key}`);
      });
      const children = values.map((p) => object(p?.initializer));
      if (children.some(Boolean)) {
        if (children.every(Boolean)) nestedParity(children, `${path}.${key}`);
        else
          fail(
            values.find(Boolean),
            `Inconsistent nested translation ${path}.${key}`,
          );
      }
      const texts = values.map((p) => textValue(unwrap(p?.initializer)));
      if (texts.every((v) => v !== undefined)) {
        const slots = (v) =>
          [...new Set(v.match(/\{(?:\d+|[A-Za-z_]\w*)\}/g) ?? [])]
            .sort()
            .join();
        if (texts.some((v) => slots(v) !== slots(texts[0])))
          fail(values[0], `Translation placeholders differ ${path}.${key}`);
      }
    }
  }
  function checkMap(obj, label) {
    if (seen.has(obj)) return;
    const languageObjects = locales.map((l) =>
      object(props(obj).find((p) => name(p) === l)?.initializer),
    );
    if (!languageObjects.every(Boolean)) {
      fail(obj, `${label}: all uz/ru/en dictionaries are required`);
      return;
    }
    seen.add(obj);
    languageObjects.forEach((v) => seen.add(v));
    const union = new Set(languageObjects.flatMap(keys));
    languageObjects.forEach((v, j) => {
      const present = new Set(keys(v));
      for (const k of union)
        if (!present.has(k))
          fail(v, `Missing ${locales[j]} translation ${label}.${k}`);
      checkLeaves(v, `${label}.${locales[j]}`);
    });
    dictionaries.push({ file, label, keys: union.size, form: "locale-map" });
    nestedParity(languageObjects, label);
  }
  // Separate const en/uz/ru objects occur in older and many newer modules.
  const standalone = locales.map((l) => object(variables.get(l)));
  if (standalone.filter(Boolean).length >= 2) {
    if (!standalone.every(Boolean))
      fail(standalone.find(Boolean), "Missing standalone uz/ru/en dictionary");
    else {
      const union = new Set(standalone.flatMap(keys));
      standalone.forEach((v, j) => {
        seen.add(v);
        const present = new Set(keys(v));
        for (const k of union)
          if (!present.has(k))
            fail(v, `Missing ${locales[j]} translation ${k}`);
        checkLeaves(v, locales[j]);
      });
      dictionaries.push({
        file,
        label: "en/uz/ru",
        keys: union.size,
        form: "locale-map",
      });
      nestedParity(standalone, "en/uz/ru");
    }
  }
  let hasScriptBridge = false;
  function visit(n) {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === "scriptText"
    )
      hasScriptBridge = true;
    if (ts.isObjectLiteralExpression(n) && !seen.has(n)) {
      const entries = props(n),
        names = keys(n);
      if (locales.filter((l) => names.includes(l)).length >= 2) {
        // Editable owner configuration is deliberately blank until configured;
        // storefront renders its separately translated fallback. Not UI copy.
        const optionalTitle =
          file === "src/business-types.ts" &&
          ts.isPropertyAssignment(n.parent) &&
          name(n.parent) === "homeTitle";
        if (optionalTitle) {
          ts.forEachChild(n, visit);
          return;
        }
        if (entries.some((p) => object(p.initializer))) checkMap(n, "messages");
        else if (locales.some((l) => !names.includes(l)))
          fail(n, "Inline copy requires uz/ru/en values");
        else if (
          entries.every((p) => textValue(unwrap(p.initializer)) !== undefined)
        ) {
          entries
            .filter((p) => locales.includes(name(p)))
            .forEach((p) => {
              if (!textValue(unwrap(p.initializer)).trim())
                fail(p, `Empty ${name(p)} translation`);
            });
          dictionaries.push({
            file,
            label: "inline",
            keys: 1,
            form: "locale-leaf",
          });
          seen.add(n);
        }
      } else {
        const tuples = entries.map((p) => unwrap(p.initializer));
        const translationTuple = (v) =>
          v &&
          ts.isArrayLiteralExpression(v) &&
          v.elements.every((e) => textValue(unwrap(e)) !== undefined);
        const forced =
          /(?:^|-)i18n\.ts$/.test(file) &&
          ts.isVariableDeclaration(n.parent) &&
          /words$/i.test(n.parent.name.getText(ast));
        if (
          entries.length &&
          ((forced &&
            tuples.some((v) => v && ts.isArrayLiteralExpression(v))) ||
            (tuples.every(translationTuple) &&
              tuples.some((v) => v.elements.length === 3)))
        ) {
          seen.add(n);
          entries.forEach((p, j) => {
            const v = tuples[j];
            if (!translationTuple(v) || v.elements.length !== 3)
              fail(
                p,
                `Translation ${name(p)} requires exactly uz/ru/en values`,
              );
            else {
              const slots = (e) =>
                [
                  ...new Set(
                    textValue(unwrap(e)).match(/\{(?:\d+|[A-Za-z_]\w*)\}/g) ??
                      [],
                  ),
                ]
                  .sort()
                  .join();
              v.elements.forEach((e, k) => {
                if (!textValue(unwrap(e)).trim())
                  fail(e, `Empty ${locales[k]} translation ${name(p)}`);
                if (slots(e) !== slots(v.elements[0]))
                  fail(e, `Translation placeholders differ ${name(p)}`);
              });
            }
          });
          dictionaries.push({
            file,
            label: ts.isVariableDeclaration(n.parent)
              ? n.parent.name.getText(ast)
              : "inline",
            keys: entries.length,
            form: "tuple",
          });
        }
      }
    }
    if (ts.isJsxText(n)) {
      const text = n.text.replace(/\s+/g, " ").trim();
      if (/[\p{L}]/u.test(text))
        literals.push({ file, line: position(n), kind: "text", text });
    }
    if (
      ts.isJsxAttribute(n) &&
      ["aria-label", "title", "placeholder", "alt"].includes(
        n.name.getText(ast),
      ) &&
      n.initializer &&
      ts.isStringLiteral(n.initializer) &&
      /\p{L}/u.test(n.initializer.text)
    )
      literals.push({
        file,
        line: position(n),
        kind: n.name.getText(ast),
        text: n.initializer.text,
      });
    if (
      ts.isStringLiteral(n) &&
      /\p{L}/u.test(n.text) &&
      ((ts.isConditionalExpression(n.parent) && n.parent.condition !== n) ||
        ts.isJsxExpression(n.parent))
    ) {
      let parent = n.parent,
        visible = false;
      while (parent && !ts.isSourceFile(parent)) {
        if (
          ts.isCallExpression(parent) ||
          ts.isArrowFunction(parent) ||
          ts.isFunctionExpression(parent)
        )
          break;
        if (ts.isJsxAttribute(parent)) {
          visible = ["aria-label", "title", "placeholder", "alt"].includes(
            parent.name.getText(ast),
          );
          break;
        }
        if (ts.isJsxExpression(parent)) {
          visible =
            !ts.isJsxAttribute(parent.parent) ||
            ["aria-label", "title", "placeholder", "alt"].includes(
              parent.parent.name.getText(ast),
            );
          break;
        }
        parent = parent.parent;
      }
      if (visible)
        literals.push({
          file,
          line: position(n),
          kind: "expression",
          text: n.text,
        });
    }
    ts.forEachChild(n, visit);
  }
  visit(ast);
  if (
    /(?:^|-)i18n\.ts$/.test(file) &&
    (!dictionaries.length || !hasScriptBridge)
  )
    fail(
      ast,
      "Translation module must have an audited dictionary and Uzbek Cyrillic scriptText bridge",
    );
  return { errors, dictionaries, literals };
}
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(resolve(dir, e.name))
      : /\.tsx?$/.test(e.name)
        ? [resolve(dir, e.name)]
        : [],
  );
}
export function auditLocales(root = resolve("src")) {
  const result = { errors: [], dictionaries: [], literals: [] };
  for (const file of files(root)) {
    const r = auditLocaleSource(
      readFileSync(file, "utf8"),
      relative(process.cwd(), file).replaceAll("\\", "/"),
    );
    for (const key of Object.keys(result)) result[key].push(...r[key]);
  }
  result.errors.push(...auditVisibleLiterals(result.literals));
  return result;
}
// Reviewed invariant notation, not prose: SI/paper/format/algorithm identifiers,
// language autonyms and public brand names. A new literal is rejected by CI.
const invariantLiterals = new Map([
  ...[
    "mm",
    "mm ·",
    "m",
    "m ·",
    "h",
    "cm²",
    "cm² ·",
    "mm →",
    "s.",
    "s ·",
    "min ·",
    "mm · Z=",
    "mm · r",
    "400 × 400 mm",
    "0.3 mm",
  ].map((v) => [
    v,
    "International units, dimensions or revision/axis notation",
  ]),
  ...[
    "PDF / QR",
    "SHA-256",
    "MSE",
    "A4",
    "Letter",
    "P",
    "→ P",
    "classic-greedy/1",
    "classic-greedy/2",
  ].map((v) => [v, "Stable format, paper, legacy pin or engine identifier"]),
  ...["O‘zbekcha", "Ўзбекча", "Русский", "English"].map((v) => [
    v,
    "Language selector autonym remains recognizable in every locale",
  ]),
  ...["Ip Rasm ·", "Click", "Payme", "UZS"].map((v) => [
    v,
    "Product/provider brand or ISO currency code",
  ]),
]);
export function auditVisibleLiterals(literals) {
  return literals
    .filter((l) => !invariantLiterals.has(l.text))
    .map(
      (l) => `${l.file}:${l.line} Untranslated visible ${l.kind}: ${l.text}`,
    );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const sourceRoot = process.argv
    .find((a) => a.startsWith("--source-root="))
    ?.slice(14);
  const result = auditLocales(sourceRoot ? resolve(sourceRoot) : undefined);
  const report = process.argv.find((a) => a.startsWith("--report="))?.slice(9);
  if (report) writeFileSync(report, JSON.stringify(result, null, 2));
  if (result.errors.length) {
    process.stderr.write(result.errors.join("\n") + "\n");
    process.exitCode = 1;
  } else
    process.stdout.write(
      JSON.stringify({
        dictionaries: result.dictionaries.length,
        keys: result.dictionaries.reduce((n, d) => n + d.keys, 0),
        locales: ["uz", "uz-Cyrl", "ru", "en"],
        jsxLiteralsToReview: result.literals.length,
      }) + "\n",
    );
}
