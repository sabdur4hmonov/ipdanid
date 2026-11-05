import {
  existsSync,
  mkdirSync,
  readdirSync,
  cpSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
const root = "output/website-w1";
const wanted = new Set([
  "start.png",
  "far-face-uz.png",
  "far-face-uz-Cyrl.png",
  "far-face-ru.png",
  "far-face-en.png",
  "far-cropped.png",
  "result.png",
  "buy-screen.png",
  "account.png",
  "second-device-works.png",
]);
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}
const groups = [];
for (const [name, source] of [
  ["desktop", "test-results/website-w1-desktop-purchase/browser"],
  ["mobile", "test-results/website-w1-mobile/browser"],
]) {
  const target = join(root, "screens", name);
  mkdirSync(target, { recursive: true });
  const images = [];
  for (const file of walk(source)) {
    const name = file.split(/[\\/]/).at(-1);
    if (!wanted.has(name)) continue;
    cpSync(file, join(target, name));
    images.push(name);
  }
  for (const required of ["far-face-uz.png", "buy-screen.png", "result.png"])
    if (!images.includes(required))
      throw Error("Missing required customer screenshot");
  groups.push({ name, images });
}
const reports = [
  "desktop-purchase-results.json",
  "mobile-results.json",
  "desktop-compat-results.json",
  "mobile-compat-results.json",
  "local-compat-results.json",
];
const results = reports
  .filter((r) => existsSync(join(root, r)))
  .map((file) => {
    const data = JSON.parse(readFileSync(join(root, file), "utf8"));
    return { file, stats: data.stats };
  });
writeFileSync(
  join(root, "screens/index.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>W1 customer screens</title><style>body{font:16px system-ui;margin:24px;background:#f6f8f3;color:#20392f}section{display:flex;gap:16px;flex-wrap:wrap}figure{margin:0;background:white;padding:12px;border-radius:12px;width:320px}img{max-width:100%;height:auto;border:1px solid #ddd}figcaption{margin:8px 0}h1{font-size:24px}</style><h1>W1 website customer review</h1><p>Local sandbox only. Contact values are placeholders. Recovery keys are masked in account screenshots. No frozen server or APK was modified.</p>${groups.map((g) => `<h2>${g.name}</h2><section>${g.images.map((name) => `<figure><figcaption>${name}</figcaption><a href="${g.name}/${name}"><img loading="lazy" src="${g.name}/${name}" alt="${name}"></a></figure>`).join("")}</section>`).join("")}`,
);
writeFileSync(
  join(root, "screen-manifest.json"),
  JSON.stringify({ groups, results, credentialsPrinted: false }, null, 2),
);
console.log(
  JSON.stringify({
    groups: groups.map((g) => ({ name: g.name, count: g.images.length })),
    credentialsPrinted: false,
  }),
);
