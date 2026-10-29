import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import UPNGModule from "@pdf-lib/upng";
import { benchmark, reviewRoot } from "./benchmark";
import { safety, type FaceScore } from "./review";
const UPNG =
  (UPNGModule as unknown as { default?: typeof UPNGModule }).default ??
  UPNGModule;
type Row = {
  recipe: string;
  ms: number;
  ratio?: number;
  scores: FaceScore[];
  pathSha: string;
  render: string;
  noses: { src: string; width: number; height: number }[];
};
type Case = {
  id: string;
  shape: string;
  originalSources: string[];
  faces: { left: number; top: number; width: number; height: number }[];
  rows: Record<"baseline" | "A" | "B" | "C", Row>;
};
const cases: Case[] = benchmark.map((c) =>
  JSON.parse(readFileSync(`${reviewRoot}/private/${c.id}/result.json`, "utf8")),
);
const outcomes = Object.fromEntries(
  (["A", "B", "C"] as const).map((candidate) => [
    candidate,
    safety(
      cases.map((c) => ({
        baseline: c.rows.baseline.scores,
        candidate: c.rows[candidate].scores,
        ratio: c.rows[candidate].ratio!,
      })),
    ),
  ]),
);
// Human inspection can veto numeric survivors, never rescue a failed guardrail.
const visualPath = `${reviewRoot}/private/visual-review.json`;
const visual: { inspected: boolean; vetoes: string[]; notes: string } =
  existsSync(visualPath)
    ? JSON.parse(readFileSync(visualPath, "utf8"))
    : { inspected: false, vetoes: [], notes: "Pending equal-scale inspection" };
for (const candidate of ["A", "B", "C"] as const)
  if (visual.vetoes.includes(candidate)) {
    outcomes[candidate].eligible = false;
    outcomes[candidate].reasons.push("visual-eyes-or-mouth-regression");
  }
const shuffle = <T>(items: T[]) => {
  for (let k = items.length - 1; k > 0; k--) {
    const j = randomInt(k + 1);
    [items[k], items[j]] = [items[j], items[k]];
  }
  return items;
};
const keyPath = `${reviewRoot}/key.json`;
const prior = existsSync(keyPath)
  ? JSON.parse(readFileSync(keyPath, "utf8"))
  : undefined;
const publicFiles = new Set(["index.html"]),
  mapping: Record<string, unknown> = {};
const img = (src: string, attr = "") => {
  publicFiles.add(src);
  return `<img src="${src}" loading="lazy" alt="Surat" ${attr}>`;
};
const sections = cases
  .map((c, index) => {
    const candidates = [
      "baseline",
      ...(["A", "B", "C"] as const).filter((k) => outcomes[k].eligible),
    ];
    const saved: Record<string, string> | undefined = prior?.mapping?.[c.id];
    // Preserve blinded letters if assembling after visual veto. Never reshuffle votes.
    const letters = shuffle("JKMNPRSTVXYZLFGH".split(""));
    const assigned = candidates.map((candidate, k) => ({
      candidate,
      letter: saved
        ? Object.keys(saved).find((letter) => saved[letter] === candidate)!
        : letters[k],
    }));
    assert(
      assigned.every((a) => a.letter),
      "Cannot change frozen candidate set after review publication",
    );
    const ordered = prior
      ? assigned.sort(
          (a, b) =>
            prior.order[c.id].indexOf(a.letter) -
            prior.order[c.id].indexOf(b.letter),
        )
      : shuffle(assigned);
    mapping[c.id] = Object.fromEntries(
      ordered.map((a) => [a.letter, a.candidate]),
    );
    return `<section id="${c.id}"><h2>${index + 1}-surat</h2><div class="originals">${c.originalSources.map((src) => img(src)).join("")}</div><div class="grid">${ordered
      .map(({ candidate, letter }) => {
        const row = c.rows[candidate as keyof typeof c.rows];
        return `<article><h3>${letter}</h3>${img(row.render, 'class="render" width="1000" height="1000"')}<div class="noses">${row.noses.map((n) => img(n.src, `class="nose" style="width:${n.width * 1.6}px;height:${n.height * 1.6}px"`)).join("")}</div></article>`;
      })
      .join(
        "",
      )}</div><p class="vote">${index + 1}-surat: eng o‘xshash harf — ______</p></section>`;
  })
  .join("");
const noSurvivor = Object.values(outcomes).every((o) => !o.eligible);
const notice = noSurvivor
  ? "<p><strong>Yangi variantlarning hech biri xavfsizlik tekshiruvlaridan to‘liq o‘tmadi.</strong> Quyida faqat avvalgi natija qoldirilgan. Hozir tanlash yoki ovoz berish uchun yangi variant yo‘q; sifati tuzaldi deb aytmaymiz.</p>"
  : "<p>Har suratda yuqoridagi asl rasmga qarang. Pastdagi natijalar va burun kattalashtirmalarini solishtiring. Har biri uchun eng o‘xshash harfni yozing, masalan: <b>1 — K, 2 — R</b>. Harflar har suratda alohida aralashtirilgan. Bir xil ko‘rinsa, “teng” deb yozing.</p>";
const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portretlarni solishtirish</title><style>body{font:17px system-ui;margin:0 auto;max-width:1680px;padding:24px;background:#f4f5f4;color:#162c32}h1{font-size:28px}section{padding:20px;background:white;border-radius:12px;margin:28px 0}.originals{display:flex;gap:12px;margin-bottom:18px}.originals img{height:220px;max-width:46%;object-fit:contain}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}article{min-width:0;text-align:center;border:1px solid #ddd;border-radius:8px;overflow:auto}h3{font-size:24px;margin:8px}.render{display:block;width:100%;max-width:${noSurvivor ? 400 : 1000}px;height:auto;aspect-ratio:1;margin:auto}.noses{min-height:180px;padding:10px;display:flex;justify-content:center;gap:8px;align-items:flex-start}.nose{max-width:none;object-fit:contain;image-rendering:auto}.vote{margin-top:24px;font-weight:600}@media(max-width:650px){body{padding:10px}section{padding:10px}.grid{grid-template-columns:${noSurvivor ? "1fr" : "1fr 1fr"};gap:6px}.noses{overflow:auto;justify-content:flex-start}.originals img{height:180px}}</style></head><body><h1>Portret sinovi</h1>${notice}<p>Juftlik uchun ikkala asl surat ko‘rsatilgan. Bu 8 ta holat 4 ta asl suratdan tayyorlangan; joylashuvlar o‘zgarmagan.</p>${noSurvivor ? sections.replace(/<p class="vote">.*?<\/p>/g, "") : sections}</body></html>`;
writeFileSync(`${reviewRoot}/index.html`, html);
writeFileSync(
  keyPath,
  JSON.stringify(
    {
      version: "p16-1b-review/1",
      mapping,
      order: Object.fromEntries(
        Object.entries(mapping).map(([id, values]) => [
          id,
          Object.keys(values as object),
        ]),
      ),
      outcomes,
      visual,
      cases,
    },
    null,
    2,
  ),
);
writeFileSync(
  `${reviewRoot}/public-files.json`,
  JSON.stringify([...publicFiles]),
);
// Private inspection sheets are not linked or served. Row1 = board; row2 = face.
for (const c of cases) {
  const w = 1200,
    h = 600,
    sheet = new Uint8Array(w * h * 4).fill(255);
  for (const [col, candidate] of ["baseline", "A", "B", "C"].entries()) {
    const buffer = readFileSync(
      `${reviewRoot}/${c.rows[candidate as keyof typeof c.rows].render}`,
    );
    const decoded = UPNG.decode(Uint8Array.from(buffer).buffer),
      pixels = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
    const f = c.faces[0],
      side = Math.min(1, 1.2 * Math.max(f.width, f.height)),
      x0 = Math.max(0, Math.min(1 - side, f.left + f.width / 2 - side / 2)),
      y0 = Math.max(0, Math.min(1 - side, f.top + f.height / 2 - side / 2)),
      fw = side,
      fh = side;
    for (let y = 0; y < 600; y++)
      for (let x = 0; x < 300; x++) {
        const sx =
          y < 300
            ? Math.floor((x * 1000) / 300)
            : Math.floor((x0 + (x / 300) * fw) * 1000);
        const sy =
          y < 300
            ? Math.floor((y * 1000) / 300)
            : Math.floor((y0 + ((y - 300) / 300) * fh) * 1000);
        const from = (sy * 1000 + sx) * 4,
          to = (y * w + col * 300 + x) * 4;
        sheet.set(pixels.subarray(from, from + 4), to);
      }
  }
  writeFileSync(
    `${reviewRoot}/private/visual-${c.id}.png`,
    Buffer.from(UPNG.encode([sheet.buffer], w, h, 0)),
  );
}
console.log(
  JSON.stringify(
    {
      cases: cases.length,
      outcomes,
      visualInspected: visual.inspected,
      page: `${reviewRoot}/index.html`,
    },
    null,
    2,
  ),
);
