import { existsSync, realpathSync } from "node:fs";
import { resolve, dirname, basename, join, relative, sep } from "node:path";
function canonical(path: string) {
  let cursor = resolve(path);
  const tail: string[] = [];
  while (!existsSync(cursor)) {
    tail.unshift(basename(cursor));
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return join(realpathSync(cursor), ...tail);
}
function checked(root: string, output: string, results: string) {
  const child = (parent: string) => root.startsWith(parent + sep);
  if (!child(output) && !child(results))
    throw Error("Evidence must use a new output/ or test-results/ directory");
  const rel = relative(output, root).split(sep)[0].toLowerCase();
  if (/^phase(?:9|10|11|12|13|14)$/.test(rel) || /-dist$/.test(rel))
    throw Error("Historical reports and live web directories are frozen");
}
// Check lexical paths before filesystem inspection, then resolve existing
// ancestors so a junction cannot redirect a new report into an old report.
export function newEvidenceRoot(value: string) {
  const root = resolve(value);
  checked(root, resolve("output"), resolve("test-results"));
  checked(canonical(root), canonical("output"), canonical("test-results"));
  return root;
}
