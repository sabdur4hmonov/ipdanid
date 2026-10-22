import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const web = resolve("output/phase15-portrait-repair-dist");
const evidence = resolve("output/phase15/portrait-repair");
assert(
  !existsSync(web) && !existsSync(join(evidence, "snapshot.json")),
  "Preserve published repair evidence",
);
const old = resolve("output/phase15-photo-trial-dist/photo-test/desktop/heart");
const current = resolve("output/current-heart-repair-v2/desktop/heart");
const digest = (p) =>
  createHash("sha256").update(readFileSync(p)).digest("hex");
assert.equal(
  digest(join(old, "source.jpg")),
  digest(join(current, "source.jpg")),
  "Publish only the exact original synthetic sample",
);
for (const project of ["desktop", "mobile-browser"]) {
  const p = JSON.parse(
    readFileSync(
      `output/current-heart-repair-v2/${project}/heart/result.json`,
      "utf8",
    ),
  );
  assert.equal(p.ownerPhotoUsed, false);
  assert.equal(p.exactPhysicalRender, true);
  assert(p.elapsedMs < 15000);
}
function files(dir) {
  assert(!lstatSync(dir).isSymbolicLink());
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    assert(!e.isSymbolicLink());
    const p = join(dir, e.name);
    return e.isDirectory() ? files(p) : [p];
  });
}
const source = realpathSync("output/phase15-dist");
const assets = files(source);
cpSync(source, web, { recursive: true, errorOnExist: true, force: false });
for (const f of assets)
  assert.equal(digest(f), digest(join(web, relative(source, f))));
const report = join(web, "photo-repair");
mkdirSync(report);
for (const [from, to] of [
  [join(current, "source.jpg"), "namuna-portret.jpg"],
  [join(current, "source-white.png"), "source-white.png"],
  [join(old, "prepared.png"), "old-target.png"],
  [join(old, "result.png"), "old-result.png"],
  [join(current, "prepared.png"), "new-target.png"],
  ...[2000, 2500, 3000].map((n) => [
    join(current, `result-${n}.png`),
    `new-${n}.png`,
  ]),
]) {
  assert(lstatSync(from).isFile() && !lstatSync(from).isSymbolicLink());
  copyFileSync(from, join(report, to));
}
const scores = JSON.parse(readFileSync(join(current, "scores.json"), "utf8"));
const card = (title, image) =>
  `<figure><img src="${image}" alt="${title}"><figcaption>${title}</figcaption></figure>`;
writeFileSync(
  join(report, "index.html"),
  `<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ip Rasm — yuz kesilishini tekshirish</title><style>body{font:17px system-ui;color:#18334b;background:#f4f6fa;margin:24px auto;padding:0 18px;max-width:1300px}h1{font-size:28px}p{max-width:900px;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}figure{margin:0;padding:10px;background:white;border-radius:14px}img{width:100%;aspect-ratio:1;object-fit:contain}figcaption{margin:8px 0}a{color:#174c90}.status{padding:16px;background:#fff1cc;border-radius:12px}table{border-collapse:collapse}td,th{text-align:left;padding:10px;border-bottom:1px solid #ccd5df}</style>
<h1>Yuz kesilishi: sabab va tuzatish</h1><p class="status"><b>Kesilish tuzatildi. Ipli portret sifati hali yakuniy qabul qilinmagan.</b> Soch va iyak endi saqlanadi. Ipdan paydo bo‘ladigan kulrang fon va yuz tiniqligi ustida ish davom etadi. Bu sinov natijasi, tayyor mahsulot va’dasi emas.</p>
<p><a href="/">Yangi ilovani ochish</a> · <a href="namuna-portret.jpg" download>Shu namunani saqlash</a></p>
<h2>Fon modeli sochni saqlagan</h2><div class="grid">${card("Asl sun’iy namuna", "namuna-portret.jpg")}${card("Mavjud model: fon oq, soch to‘liq", "source-white.png")}${card("Eski target: yurak o‘yig‘i boshni kesgan", "old-target.png")}${card("Yangi target: bosh va iyak to‘liq", "new-target.png")}</div>
<h2>Haqiqiy ip ketma-ketligi — bir xil o‘lchamda</h2><div class="grid">${card("Eski 3000 ip", "old-result.png")}${[2000, 2500, 3000].map((n) => card(`Yangi joylashuv · ${n} ip`, `new-${n}.png`)).join("")}</div>
<p>Yangi joylashuvda butun bosh sig‘ishi uchun yuz hajmi ham o‘zgargan. Uni yashirmadik. 2000/2500 rasmlar — shu ketma-ketlikning dastlabki qismi; ilovaning hozirgi standarti 3000. Yuz ustiga original surat qo‘yilmagan va preview kontrasti sun’iy o‘zgartirilmagan.</p>
<h2>O‘lchovlar va cheklov</h2><table><tr><th>Holat</th><th>Yuz SSIM</th></tr><tr><td>Eski 3000</td><td>${scores.old.face.ssim.toFixed(4)}</td></tr>${scores.budgets.map((x) => `<tr><td>Yangi ${x.budget}</td><td>${x.score.face.ssim.toFixed(4)}</td></tr>`).join("")}</table>
<p>SSIM har bir holatning o‘z targetiga nisbatan hisoblangan. Crop va yuz maydoni o‘zgargani sabab bu raqamlar to‘g‘ridan-to‘g‘ri “o‘xshashlik shuncha oshdi” degani emas. Raqamning o‘zi sifatni tasdiqlamaydi.</p>
<h2>GitHubdan tekshirilgan nomzodlar</h2><p><a href="https://github.com/ZHKKKe/MODNet">MODNet</a> — portret va soch chetlari uchun sinov nomzodi. <a href="https://github.com/ZhengPeng7/BiRefNet">BiRefNet</a> — yuqori aniqlikdagi taqqoslash nomzodi. Bu suratda bosh kesilishi modeldan keyin paydo bo‘lgan, shu sabab yangi katta model o‘rnatilmadi.</p></html>`,
);
mkdirSync(evidence, { recursive: true });
writeFileSync(
  join(evidence, "snapshot.json"),
  JSON.stringify(
    {
      snapshot: relative(process.cwd(), web),
      status: "CROP FIXED; STRING QUALITY OPEN",
      files: Object.fromEntries(
        files(web).map((p) => [relative(web, p), digest(p)]),
      ),
    },
    null,
    2,
  ),
);
console.log(
  "Prepared immutable portrait repair preview; synthetic-only evidence, no private guides or credentials.",
);
