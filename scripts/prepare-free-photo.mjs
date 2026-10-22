import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  copyFileSync,
  readdirSync,
  lstatSync,
} from "node:fs";
import { resolve, join, relative } from "node:path";
const web = resolve("output/phase15-free-photo-dist"),
  evidence = resolve("output/phase15/free-photo");
assert(
  !existsSync(web) && !existsSync(join(evidence, "snapshot.json")),
  "Preserve published free-photo evidence",
);
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    assert(!e.isSymbolicLink());
    const p = join(dir, e.name);
    assert(!lstatSync(p).isSymbolicLink());
    return e.isDirectory() ? files(p) : [p];
  });
const digest = (p) =>
  createHash("sha256").update(readFileSync(p)).digest("hex");
const source = resolve("output/phase15-dist");
for (const project of ["desktop", "mobile-browser"])
  for (const n of [0, 5]) {
    const v = JSON.parse(
      readFileSync(
        `output/current-free-photo/${project}/${n}/verification.json`,
        "utf8",
      ),
    );
    assert(
      v.exactPhysicalRender &&
        v.preparation === "standard-preparation/9" &&
        v.elapsedMs < 15000,
    );
  }
cpSync(source, web, { recursive: true, force: false, errorOnExist: true });
for (const f of files(source))
  assert.equal(digest(f), digest(join(web, relative(source, f))));
const report = join(web, "free-photo");
mkdirSync(report, { recursive: true });
let rows = "";
for (const project of ["desktop", "mobile-browser"])
  for (const n of [0, 5]) {
    const src = `output/current-free-photo/${project}/${n}`,
      dest = join(report, project, String(n));
    mkdirSync(dest, { recursive: true });
    for (const name of [
      "source.jpg",
      "cutout.png",
      "result.png",
      "start.png",
      "adjust.png",
      "result-screen.png",
      "verification.json",
    ])
      copyFileSync(join(src, name), join(dest, name));
    const v = JSON.parse(readFileSync(join(src, "verification.json"), "utf8"));
    rows += `<h2>${project} · ${n === 0 ? "Bir odam" : "Ikki odam"} · ${(v.elapsedMs / 1000).toFixed(2)} soniya</h2><div class="grid">${[
      ["source.jpg", "Asl surat"],
      ["cutout.png", "Foni qirqilgan — foydalanuvchi joylashtirgan"],
      ["result.png", "Haqiqiy 3000 ip"],
    ]
      .map(
        ([f, label]) =>
          `<figure><img src="${project}/${n}/${f}" alt="${label}"><figcaption>${label}</figcaption></figure>`,
      )
      .join("")}</div>`;
  }
copyFileSync(
  join(report, "desktop/0/source.jpg"),
  join(report, "namuna-portret.jpg"),
);
writeFileSync(
  join(report, "index.html"),
  `<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ip Rasm — erkin moslash</title><style>body{font:17px system-ui;color:#18334b;background:#f4f6fa;max-width:1100px;margin:auto;padding:20px}p{line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}figure{margin:0;padding:12px;background:white;border-radius:14px}img{width:100%;aspect-ratio:1;object-fit:contain}a{color:#174c90}</style><h1>Suratni o‘zingiz joylashtiring</h1><p><a href="/">Ilovani ochish</a> · <a href="namuna-portret.jpg" download>Namunani yuklab olish</a></p><p>Surat → shakl → faqat fon qirqimi → erkin surish va kattalashtirish → ipli natija → yig‘ish. Yuz, soch va yelka avtomatik kesilmaydi. Qirqimni o‘chirish/qaytarish cho‘tkasi bilan tuzating. “Dam olish” aniq qadamni saqlaydi.</p><p>Quyida avtomatik brauzer sinovlari. Natija haqiqiy ketma-ketlikdan chizilgan, surat ustiga qo‘yilmagan. Ipli o‘xshashlikning mukammalligi yoki haqiqiy telefon/taxta sinovi tasdiqlanmagan.</p>${rows}</html>`,
);
mkdirSync(evidence, { recursive: true });
writeFileSync(
  join(evidence, "snapshot.json"),
  JSON.stringify(
    {
      snapshot: relative(process.cwd(), web),
      status: "FREE COMPOSITION VERIFIED; PHYSICAL QUALITY NOT CLAIMED",
      files: Object.fromEntries(
        files(web).map((p) => [relative(web, p), digest(p)]),
      ),
    },
    null,
    2,
  ),
);
console.log("Prepared immutable free-photo preview; synthetic images only.");
