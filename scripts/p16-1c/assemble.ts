import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { cases, root } from "./benchmark";
import { blindOrder } from "./review";
type Row = {
  eligible: boolean;
  render?: string;
  small?: string;
  ms?: number;
  ratio?: number;
  reason?: string;
};
type Result = {
  id: string;
  original: string;
  shape: string;
  rows: Record<string, Row>;
};
const results: Result[] = cases.map((c) =>
  JSON.parse(readFileSync(`${root}/private/${c.id}/result.json`, "utf8")),
);
const prior = existsSync(root + "/key.json")
  ? JSON.parse(readFileSync(root + "/key.json", "utf8"))
  : undefined;
const mapping: Record<string, Record<string, string>> = {},
  allowed = new Set(["index.html"]);
const image = (src: string, classes: string, width?: number) => {
  allowed.add(src);
  return `<img src="${src}" alt="Surat" loading="lazy" class="${classes}" ${width ? `width="${width}" height="${width}"` : ""}>`;
};
const sections = results
  .map((r, index) => {
    const levels = Object.entries(r.rows)
      .filter(([, v]) => v.eligible)
      .map(([level]) => level);
    assert(levels.includes("F0"));
    const order = blindOrder(levels, prior?.mapping[r.id]);
    mapping[r.id] = Object.fromEntries(order.map((v) => [v.letter, v.level]));
    const shape =
      r.shape === "circle"
        ? "Doira"
        : r.shape === "rectangle"
          ? "Kvadrat"
          : "Yurak";
    return `<section id="${r.id}"><h2>${index + 1}-surat · ${shape}</h2>${image(r.original, "original")}<div class="scroll"><div class="row" style="--n:${order.length}">${order
      .map(({ letter, level }) => {
        const v = r.rows[level];
        assert(v.render && v.small);
        return `<article><h3>${letter}</h3>${image(v.render, "full", 1000)}<p>Uzoqdan ko‘rinishi</p>${image(v.small, "small", 250)}</article>`;
      })
      .join(
        "",
      )}</div></div><p class="vote">${index + 1}-surat uchun eng o‘xshash harf: ______</p></section>`;
  })
  .join("");
const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Joylashuvlarni solishtirish</title><style>body{font:17px system-ui;background:#f4f6f5;color:#153136;max-width:1360px;margin:auto;padding:24px}h1{font-size:28px}section{background:white;border-radius:12px;padding:20px;margin:28px 0;min-width:0}.original{display:block;height:240px;max-width:100%;object-fit:contain;margin-bottom:18px}.scroll{overflow-x:auto;max-width:100%;padding-bottom:12px}.row{display:grid;grid-template-columns:repeat(var(--n),minmax(280px,1fr));gap:12px}article{text-align:center;border:1px solid #dce3df;border-radius:8px;min-width:0;padding:6px}h3{font-size:26px;margin:8px}.full{display:block;width:100%;max-width:400px;height:auto;aspect-ratio:1;margin:auto}.small{display:block;width:250px;height:250px;max-width:none;margin:auto}.vote{font-weight:600}article p{margin:16px 0 8px}@media(max-width:650px){body{padding:10px}section{padding:12px}.original{height:200px}.row{grid-template-columns:repeat(var(--n),280px)}} </style></head><body><h1>Qaysi joylashuv sizga ko‘proq o‘xshaydi?</h1><p>Har bir surat uchun eng o‘xshash harfni yozing. Masalan: <b>1 — K, 2 — R</b>. Teng bo‘lsa, “teng” deb yozing. Harflar har suratda alohida aralashtirilgan.</p><p>Avval katta, keyin pastdagi kichik ko‘rinishlarni solishtiring. Kichik namuna devordagi rasmni taxminan 2 metr uzoqdan ko‘rishni tasavvur qilish uchun; ekran o‘lchamiga qarab farq qiladi. Telefonda natijalarni yon tomonga surish mumkin.</p><p>To‘rtta asl manba surat, jami oltita shakl holati. Hozircha saytdagi asosiy sozlamalar o‘zgarmagan.</p>${sections}</body></html>`;
writeFileSync(root + "/index.html", html);
writeFileSync(
  root + "/key.json",
  JSON.stringify(
    {
      schema: "p16-1c/blind-review/1",
      mapping,
      cases: results,
      preparation: JSON.parse(
        readFileSync(root + "/private/preparation.json", "utf8"),
      ),
      metricsDoNotSelect: true,
      constraintsOnly: true,
    },
    null,
    2,
  ),
);
writeFileSync(root + "/public-files.json", JSON.stringify([...allowed]));
console.log(
  JSON.stringify(
    {
      cases: results.length,
      eligibleNew: results.flatMap((r) =>
        Object.entries(r.rows).filter(
          ([level, row]) => level !== "F0" && row.eligible,
        ),
      ).length,
      rejected: results.flatMap((r) =>
        Object.entries(r.rows)
          .filter(([, v]) => !v.eligible)
          .map(([level, v]) => ({ id: r.id, level, reason: v.reason })),
      ),
      page: root + "/index.html",
    },
    null,
    2,
  ),
);
