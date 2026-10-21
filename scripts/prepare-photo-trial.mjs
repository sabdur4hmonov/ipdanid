// Publish only the explicitly synthetic photo acceptance case, never owner files.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = realpathSync("."),
  source = realpathSync("output/phase15-dist"),
  snapshot = resolve("output/phase15-photo-trial-dist"),
  report = join(snapshot, "photo-test");
assert.equal(source, join(root, "output", "phase15-dist"));
assert(!existsSync(snapshot), "Refuse to replace a published photo trial");
assert.equal(realpathSync("output"), join(root, "output"));
function entries(path) {
  assert(!lstatSync(path).isSymbolicLink(), "No linked snapshot assets");
  return readdirSync(path, { withFileTypes: true }).flatMap((e) => {
    const p = join(path, e.name);
    assert(!e.isSymbolicLink(), "No linked snapshot assets");
    return e.isDirectory() ? entries(p) : [p];
  });
}
const digest = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const inputs = [];
for (const project of ["desktop", "mobile-browser"])
  for (const shape of ["circle", "rectangle", "heart"]) {
    const directory = realpathSync(
      `output/current-photo-trial/${project}/${shape}`,
    );
    assert(
      directory.startsWith(join(root, "output", "current-photo-trial") + sep),
    );
    const data = JSON.parse(
      readFileSync(join(directory, "result.json"), "utf8"),
    );
    assert.equal(data.shape, shape);
    assert.equal(data.project, project);
    assert.equal(data.algorithm, "classic-greedy/3");
    assert.equal(data.pins, 240);
    assert.equal(data.lines, 3000);
    assert.equal(data.ownerPhotoUsed, false);
    assert.equal(data.exactPhysicalRender, true);
    assert.equal(data.autoFitRestored, true);
    assert.equal(data.readjustRetained, true);
    assert(data.elapsedMs > 0 && data.elapsedMs < 15000);
    for (const name of [
      "source.jpg",
      "prepared.png",
      "result.png",
      "start.png",
      "adjust.png",
      "result-screen.png",
      "result.json",
    ])
      assert(lstatSync(join(directory, name)).isFile());
    inputs.push({ directory, data });
  }
const assets = entries(source);
cpSync(source, snapshot, { recursive: true, errorOnExist: true, force: false });
for (const file of assets)
  assert.equal(digest(file), digest(join(snapshot, relative(source, file))));
mkdirSync(report);
for (const { directory, data } of inputs) {
  const destination = join(report, data.project, data.shape);
  mkdirSync(destination, { recursive: true });
  for (const name of [
    "source.jpg",
    "prepared.png",
    "result.png",
    "start.png",
    "adjust.png",
    "result-screen.png",
    "result.json",
  ])
    copyFileSync(join(directory, name), join(destination, name));
}
cpSync(
  join(inputs[0].directory, "source.jpg"),
  join(report, "namuna-portret.jpg"),
);
const names = { circle: "Doira", rectangle: "Kvadrat", heart: "Yurak" };
let html = `<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ip Rasm — bitta rasm bilan sinov</title><style>
body{font:17px/1.5 system-ui;background:#f5f7fa;color:#17324f;max-width:1120px;margin:24px auto;padding:0 16px}h1{font-size:30px}a{color:#17324f}nav{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.button{display:inline-block;border:1px solid #17324f;border-radius:12px;padding:14px 18px;text-decoration:none;background:white}.primary{background:#17324f;color:white}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}figure{margin:0;background:white;padding:8px;border-radius:12px}img{width:100%;height:auto;display:block}figcaption{padding:8px 0}section{margin:32px 0}details img{max-width:400px}p{max-width:850px}@media(max-width:600px){body{font-size:16px}.grid{gap:4px}figure{padding:3px}figcaption{font-size:12px}}
</style><h1>Bitta rasm bilan sinab ko‘ramiz</h1><p>Avval namunaviy rasmni saqlang. Ilovada <strong>Galereyadan tanlash</strong> orqali shu rasmni yuklang, joylashuvini moslang va <strong>Yaratish</strong>ni bosing.</p><nav><a class="button primary" href="namuna-portret.jpg" download="namuna-portret.jpg">1. Rasmni saqlash</a><a class="button" href="/">2. Ilovani ochish</a></nav><p>Quyida oddiy ilovada hisoblangan natijalar. Bular ip yo‘lining haqiqiy chizmasi; yuzning asl surati ustiga qo‘yilmagan. Namuna sun’iy yaratilgan, sizning shaxsiy suratingiz ishlatilmagan.</p>`;
for (const project of ["desktop", "mobile-browser"]) {
  html += `<h2>${project === "desktop" ? "Kompyuter" : "Telefon o‘lchamidagi brauzer"}</h2>`;
  for (const { data } of inputs.filter((i) => i.data.project === project)) {
    const base = `${project}/${data.shape}`;
    html += `<section><h3>${names[data.shape]} · ${(data.elapsedMs / 1000).toFixed(2)} soniya</h3><div class="grid">`;
    for (const [file, label] of [
      ["source.jpg", "Asl namuna"],
      ["prepared.png", "Hisoblash uchun tayyorlangan"],
      ["result.png", "3000 ip · ~6.7 soat"],
    ])
      html += `<figure><img src="${base}/${file}" alt="${label}" loading="lazy"><figcaption>${label}</figcaption></figure>`;
    html += `</div><details><summary>Ilovadagi uch ekran</summary>`;
    for (const file of ["start.png", "adjust.png", "result-screen.png"])
      html += `<img src="${base}/${file}" alt="Ilova ekrani" loading="lazy">`;
    html += `</details></section>`;
  }
}
html += `<p>Sinov: 6/6 brauzer holati. Kattalashtirish, burish, qaytarish, Oldin/Keyin va Qayta moslash tekshirildi. 240 mix, 500 px hisoblash, 1000 px fizik chizma. Haqiqiy telefondagi tezlik va jismoniy yig‘ish hali alohida tekshiriladi.</p></html>`;
writeFileSync(join(report, "index.html"), html);
const manifest = Object.fromEntries(
  entries(snapshot).map((file) => [
    relative(snapshot, file).replaceAll("\\", "/"),
    digest(file),
  ]),
);
mkdirSync("output/phase15/photo-trial", { recursive: true });
writeFileSync(
  "output/phase15/photo-trial/snapshot.json",
  JSON.stringify(
    {
      snapshot: relative(root, snapshot),
      source: relative(root, source),
      sourceAssets: assets.length,
      sourceAssetsExact: true,
      syntheticOnly: true,
      results: inputs.map((i) => i.data),
      files: manifest,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    snapshot,
    sourceAssets: assets.length,
    cases: inputs.length,
    syntheticOnly: true,
  }),
);
