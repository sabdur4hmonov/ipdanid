// Exact existing production geometry. No owner account/photo/DB access.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
  combinedHoles,
} from "../src/core/standard-kit";
import { standardKitPdf, stickerMarks } from "../src/core/standard-kit-pdf";
import { hash } from "../src/core/engine";

const out = "output/board-ready-20261025";
if (existsSync(out + "/manifest.json"))
  throw Error("Preserve the delivered board pack");
mkdirSync(out, { recursive: true });
const config = structuredClone(DEFAULT_STANDARD_KIT),
  profiles = standardProfiles(config),
  holes = combinedHoles(profiles);
const products = [
  ["sheet", "01-taxta-500x500-1ga1.pdf"],
  ["tiles", "02-taxta-A4-6-varaq.pdf"],
  ["stickers", "03-sektorlar-A4-18-varaq.pdf"],
] as const;
const files = [];
for (const [kind, name] of products) {
  const bytes = await standardKitPdf(config, kind);
  writeFileSync(out + "/" + name, bytes);
  files.push({ name, kind, sha256: await hash(bytes) });
}
let minGapMm = Infinity;
for (let a = 0; a < holes.length; a++)
  for (let b = 0; b < a; b++)
    minGapMm = Math.min(
      minGapMm,
      Math.hypot(holes[a].xMm - holes[b].xMm, holes[a].yMm - holes[b].yMm),
    );
const bounds = profiles.map((p) => {
  const xs = p.pins.map((q) => q.x * p.widthMm),
    ys = p.pins.map((q) => q.y * p.heightMm);
  return {
    pattern: p.shape,
    nails: p.pins.length,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    widthMm: Math.max(...xs) - Math.min(...xs),
    heightMm: Math.max(...ys) - Math.min(...ys),
  };
});
writeFileSync(
  out + "/coordinates.json",
  JSON.stringify(
    {
      config,
      configHash: await hash(config),
      reference: "physical-mm/y-down/1",
      holes,
      stickers: profiles.map((p) => ({
        pattern: p.shape,
        marks: stickerMarks(p),
      })),
    },
    null,
    2,
  ),
);
writeFileSync(
  out + "/mix-koordinatalari.csv",
  "pattern,pin_index_zero_based,pin_number_one_based,sector_label,x_mm,y_mm\n" +
    holes
      .map((h) =>
        [
          h.pattern,
          h.pin,
          h.pin + 1,
          h.label,
          h.xMm.toFixed(6),
          h.yMm.toFixed(6),
        ].join(","),
      )
      .join("\n") +
    "\n",
);
writeFileSync(
  out + "/BIRINCHI-OQING.html",
  `<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ip Rasm - taxta va birinchi qadam</title><style>body{font:17px/1.6 system-ui;max-width:850px;padding:24px;margin:auto;color:#142e3d}h1,h2{line-height:1.2}table{border-collapse:collapse;width:100%}td,th{padding:8px;border:1px solid #b8c9c6;text-align:left}strong{color:#123d2b}a{color:#125eb0}li{margin:10px 0}@media print{body{font-size:11pt;padding:0}h2{break-after:avoid}}</style>
<h1>Ip Rasm: yasash uchun tayyor andoza</h1><p><strong>Tashqi taxta: 500 x 500 mm, oq MDF.</strong> Barcha uch shakl bir taxtaga sig'adi. Bir rasmda tanlangan shaklning 240 ta mixi ishlatiladi.</p>
<table><tr><th>Shakl</th><th>Mix markazlari orasidagi tashqi o'lcham</th></tr><tr><td>Doira</td><td>460 mm diametr; taxta chetidan 20 mm</td></tr><tr><td>Kvadrat</td><td>470 x 470 mm; taxta chetidan 15 mm</td></tr><tr><td>Yurak</td><td>367.041 x 348.385 mm; aynan PDF konturi</td></tr></table>
<p>Yurak sozlamasidagi 390 mm - hisoblash ramkasi. Haqiqiy mixlar konturi yuqoridagi o'lchamda. Uni qo'lda 390 yoki 460 mm qilib cho'zmang. Har shaklda A-1...A-60, B-1...B-60, C-1...C-60, D-1...D-60 bor.</p>
<h2>1. Qaysi faylni chop etish kerak?</h2><ul><li>Katta formatli printer: <a href="01-taxta-500x500-1ga1.pdf">01 - bitta 500 x 500 mm varaq</a>.</li><li>Oddiy A4 printer: <a href="02-taxta-A4-6-varaq.pdf">02 - oltita A4 andoza</a>. Bu katta varaqning muqobili; ikkalasini birdan ishlatish shart emas.</li><li>Mixlar yonidagi raqamlar: <a href="03-sektorlar-A4-18-varaq.pdf">03 - sektor stikerlari</a>. Doira 1-6, kvadrat 7-12, yurak 13-18-betlar. Faqat tanlangan shaklning 6 betini chop etish mumkin.</li></ul>
<h2>2. Masshtabni tekshirish va varaqlarni ulash</h2><ol><li>Printerda <strong>100% / Actual size</strong> tanlang. Fit, Shrink yoki Sahifaga sig'dirishni o'chiring.</li><li>Har bir varaqdagi <strong>50 mm chiziqni</strong> chizg'ich bilan tekshiring: aynan 5 sm bo'lsin. Mos kelmasa masshtabni tuzatmaguncha teshmang.</li><li>A4 varaqlarning tile 1,1; 2,1; 3,1 yozilganlarini yuqori qatorga, 1,2; 2,2; 3,2 ni pastga qo'ying. Belgilarni ustma-ust keltiring; umumiy qism 10 mm. Chop etilmagan oq chetni qirqib, kesishuv belgilariga qarab ulang.</li><li>Tekshirish: doira 460 mm, kvadrat 470 mm; taxtaning yuqorisi PDFdagi BOARD TOP. Barcha koordinatalar old tomondan, chap-yuqoridan o'lchanadi.</li></ol>
<h2>3. Teshiklar va mixlar</h2><p>C - doira (ko'k), S - kvadrat (kulrang), H - yurak (qizil). Andozada 720 xil nuqta bor; uch shaklni ham tayyorlasangiz 720 joyni belgilang. <strong>Bir ishga faqat bitta shaklning 240 mixini o'rnating.</strong> Eng yaqin ikki markaz masofasi ${minGapMm.toFixed(6)} mm.</p><p>Profil mix tanasi 1.5 mm, qora ip 0.12 mm deb hisoblaydi. PDFdagi aylana mix tanasini bildiradi, tayyor burg'i tavsiyasi emas. Taxta qalinligi va pilot teshik diametri real mix/MDFga mos tanlanadi: avval ortiqcha bo'lakda mustahkamligini va mix tagidan chiqib ketmasligini sinang. Taxta tepasini, C/S/H ni va A-1 ni o'chmaydigan kichik belgi bilan ajrating.</p>
<h2>4. Stikerlarni yopishtirish</h2><p>03-fayldan tanlangan shaklni 100% chiqaring; uning 50 mm belgisini ham tekshiring. Egri chiziqlar bo'ylab kesib, tick belgilarini aynan mix markazlariga moslang. Stikerni cho'zmang. A-1 va sektor almashish joylarini oldin tekshiring. Shakllarning raqamlari o'zaro almashtirilmaydi.</p>
<h2>5. Rasm va birinchi qadam</h2><ol><li><a href="http://127.0.0.1:4214/">Ilovani shu kompyuterda oching</a>. Rasmni tanlang, kerakli shaklni bosing, fon va joylashuvni tekshiring.</li><li>Yaratish orqali haqiqiy ipli ko'rinishni ko'ring. Burun/tiniqlik ustida ish davom etmoqda; yoqmagan natijani taxtada boshlamang. Bu andoza portret sifati qabul qilinganini anglatmaydi.</li><li>Yig'ishni boshlash orqali kit kodini kiriting. Shaxsiy test kodi bu ustaga beriladigan papkada yo'q; output/phase15/subject-repair/manual-testing.txt da.</li><li>Aynan ekranda ko'rsatilgan <strong>birinchi mixda</strong> tugun qiling. Birinchi yo'nalish tanlangan rasmga bog'liq; doim A-1 dan boshlanadi deb taxmin qilmang. Masalan B-17 - B sektoridagi 17-mix.</li><li>Ipni keyingi ko'rsatilgan mixga olib boring; ishni qilgach bajarilganini tasdiqlang. Ko'rish uchun Oldingi/Keyingi tugmasi bajarilgan ipni avtomatik belgilamaydi.</li><li>Dam olish tugmasini bosing va saqlangani yozilishini kuting. Qayta ochilganda shu rasm, qo'llanma va qadamga qayting. Internetni uzishdan oldin ilova/qo'llanma shu qurilmada ochilib, yuklanib bo'lsin. Boshqa brauzer, inkognito yoki qurilmada lokal qadam o'zidan-o'zi paydo bo'lmaydi.</li></ol>
<p>3000 ulanish x 8 soniya = taxminan 6 soat 40 daqiqa; bu real o'lchangan yig'ish vaqti emas. Ip miqdorini natijadagi metr hisobidan oling; 1200 m boshlang'ich taxmin har bir rasmga yetishi kafolatlanmagan. Dastlabki 20-50 qadamdan keyin mixlar/yo'nalish/taranglik va saqlashni tekshiring.</p>
<p>Bu papkada faqat andoza va koordinatalar bor. Hisob paroli, Admin tokeni, kit kodi yoki shaxsiy rasm yo'q.</p></html>`,
);
writeFileSync(
  out + "/manifest.json",
  JSON.stringify(
    {
      schema: "iprasm.board-pack/1",
      config,
      configHash: await hash(config),
      bounds,
      minGapMm,
      holeCount: holes.length,
      files,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    out,
    holeCount: holes.length,
    minGapMm,
    bounds,
    files: files.map((f) => f.name),
  }),
);
