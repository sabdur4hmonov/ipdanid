// Durable evidence summary; copied specification/research files are never rewritten.
import { readFileSync, writeFileSync } from "node:fs";
const updates = {
  "GOV-01": [
    "partial",
    "inspection",
    "DECISIONS.md; empty repo cloned; originals in docs",
  ],
  "GOV-02": [
    "partial",
    "partial",
    "ROADMAP/STATUS/BLOCKERS/CI; all milestones retained",
  ],
  "WEB-01": [
    "partial",
    "partial",
    "src/App.tsx/style.css; desktop + Pixel viewport browser flow",
  ],
  "WEB-02": [
    "partial",
    "build",
    "actual Android/iOS source; debug APK built; no device/iOS run",
  ],
  "JOUR-01": [
    "partial",
    "yes",
    "tests/e2e/workspace.spec.ts; photo/edit/generate/save without login",
  ],
  "JOUR-02": [
    "partial",
    "partial",
    "saved project resume/export passes; kit-code HTTP sandbox only",
  ],
  "JOUR-03": [
    "partial",
    "partial",
    "server/index.ts support/order and gift credit-transfer endpoints; purchase/delivery/commission/UI pending",
  ],
  "IMG-01": [
    "yes",
    "partial",
    "core/image.ts; browser EXIF rotation/PNG alpha/header and byte limits; synthetic fixtures; broader photo/decoder coverage pending",
  ],
  "IMG-02": [
    "yes",
    "partial",
    "core/image.ts/App.tsx; all crop/edit controls; aspect-aware target preparation",
  ],
  "IMG-03": [
    "partial",
    "partial",
    "local manual face region/background/contrast/reset and exact target; real-photo paired evidence and synthetic regional regression; automatic small/multiple-face detection and diverse-photo evaluation pending",
  ],
  "IMG-04": [
    "partial",
    "partial",
    "original sample, free variants, four bounded photo candidates and persistent validated settings; browser edit/reload evidence",
  ],
  "ENG-01": [
    "partial",
    "yes",
    "MaterialProfile v4; immutable geometry/materials; stock supply estimate and recomputed winding allowances; head/winding detail and physical calibration pending",
  ],
  "ENG-02": [
    "yes",
    "yes",
    "greedy-optical/4 face-weighted fine/coarse loss, pair lookahead and legal coordinate refinement; exact-photo baseline/paired comparison; tests/portrait-quality.test.ts; diverse-photo likeness still unverified",
  ],
  "ENG-03": [
    "yes",
    "partial",
    "20k connection CPU ceiling, 32 MiB typed-footprint cache, cancel and staged refinement checkpoints; actual portrait 101.5s and exact replay 81.2s on desktop; real modest phone and total memory measurement pending",
  ],
  "ENG-04": [
    "yes",
    "yes",
    "hash and illegal path/import tests; E2E preview/player/JSON; PDF metadata",
  ],
  "ENG-05": [
    "yes",
    "yes",
    "circle/rectangle/heart and dimension/spacing tests; physical numbering trial pending",
  ],
  "ENG-06": [
    "partial",
    "partial",
    "actual-sequence lengths, per-color estimates and shortages independent of stock; exact portrait needs 1023.3m against 600m; accounting/tamper tests; shaft winding remains approximate",
  ],
  "ENG-07": [
    "partial",
    "partial",
    "3 line choices, immutable photo variants, persistent edit/material presets and library parameter reuse; photo comparisons pending",
  ],
  "ENG-08": [
    "yes",
    "partial",
    "real light/multicolor continuous segments, color meters; representative photo comparisons/physical trial pending",
  ],
  "PLAY-01": [
    "yes",
    "partial",
    "browser next/jump/confirm/resume/autoplay; controlled speech queue cancellation and unchanged confirmed state; device outcomes pending",
  ],
  "PLAY-02": [
    "yes",
    "partial",
    "localized knot/tension/repair/color/finish text in UI/PDF; physical usability pending",
  ],
  "PLAY-03": [
    "partial",
    "partial",
    "UZ/RU/EN text + matching TTS/number words; controlled browser absence/filter/cancellation verified; audible/human pronunciation pending",
  ],
  "PLAY-04": [
    "partial",
    "partial",
    "original synthesized sound/ducking/cancel/lifecycle pause; native background service pending",
  ],
  "PLAY-05": [
    "yes",
    "yes",
    "E2E announced vs confirmed/reload/jump; recurring pin chooser/undo",
  ],
  "PLAY-06": [
    "partial",
    "yes",
    "native Preferences/browser Web Locks CAS and two-tab conflict E2E; server progress CAS; auth sync UI pending",
  ],
  "PLAY-07": [
    "partial",
    "yes",
    "precache engine/PDF/font; real offline reload/export; no packaged recorded voices or last-sync server UI",
  ],
  "EXP-01": [
    "yes",
    "partial",
    "localized A4/Letter font-embedded guide and confirmed snapshot; all ordered steps/50mm rulers/repeated overlap marks checked; printer/human trial pending",
  ],
  "EXP-02": [
    "yes",
    "yes",
    "JSON project progress/edit export; bounded JSON/TXT exact sequence; PNG preview",
  ],
  "LIB-01": [
    "partial",
    "yes",
    "names/reopen/archive/restore/backup/import/parameter reuse; E2E; folders pending",
  ],
  "SHOP-01": [
    "partial",
    "partial",
    "server migration/catalog/stock; clearly development prices; full catalog UI pending",
  ],
  "SHOP-02": [
    "partial",
    "partial",
    "HTTP order/create/cancel/ownership; checkout/shipping/discount/tracking UI pending",
  ],
  "PAY-01": [
    "partial",
    "yes",
    "server price/stock state tested; only generic sandbox adapter; Click/Payme/COD policy pending",
  ],
  "PAY-02": [
    "partial",
    "yes",
    "HMAC event amount/age/idempotency/replay tests; live-provider reconciliation pending",
  ],
  "MSG-01": [
    "partial",
    "yes",
    "queued→sandbox_recorded, sent=false; provider delivery/localized templates/retries pending",
  ],
  "CODE-01": [
    "partial",
    "yes",
    "secure HMAC code/expiry/revoke/profile/one-owner audit; QR/batches/ownership recovery UI pending",
  ],
  "CODE-02": [
    "partial",
    "yes",
    "transactional code/job/gift ledger; one-recipient claims/refund/dedupe/expiry/free download tests; activation/purchase/delivery UI pending",
  ],
  "ADMIN-01": [
    "partial",
    "partial",
    "server-admin bearer protected code/sandbox routes; full RBAC/admin portal pending",
  ],
  "I18N-01": [
    "partial",
    "partial",
    "working UI/PDF and actionable recovery errors UZ/RU/EN; browser switching/error tests; commerce/templates/RTL pending",
  ],
  "DATA-01": [
    "partial",
    "partial",
    "migrations 001–003 entity vocabulary/jobs/gift transfers; SQLite WAL transactions; no table claimed as feature",
  ],
  "SEC-01": [
    "partial",
    "partial",
    "guest opaque sessions/order/instruction ownership/budget/body limits; media retention/backup/recovery pending",
  ],
  "QA-01": [
    "partial",
    "yes",
    "26 domain/portrait/PDF tests + HTTP sandbox + twelve E2E outcomes on two browser profiles; local exact-photo paired evidence; VERIFICATION.md; broader security/mobile/portrait-diversity coverage pending",
  ],
  "QA-02": [
    "partial",
    "partial",
    "named i7-1065G7/16GiB 96px/120pin benchmark artifacts; browser visual review; no physical phone benchmark",
  ],
  "QA-03": [
    "protocol",
    "no",
    "docs/PHYSICAL_TRIAL.md; no physical assembly/printing performed",
  ],
  "DELIVERY-01": [
    "partial",
    "partial",
    "README/setup/lockfile/migrations/CI/native projects/debug APK; hosted CI/store/provider dependencies pending",
  ],
};
const path = "docs/FEATURE_MATRIX.md";
const lines = readFileSync(path, "utf8").split("\n");
for (let j = 0; j < lines.length; j++) {
  if (!lines[j].startsWith("| ")) continue;
  const cells = lines[j].split("|").map((s) => s.trim());
  const u = updates[cells[1]];
  if (!u) continue;
  cells[4] = u[0];
  cells[5] = u[1];
  cells[9] = u[2];
  lines[j] = "| " + cells.slice(1, -1).join(" | ") + " |";
}
writeFileSync(path, lines.join("\n"));
