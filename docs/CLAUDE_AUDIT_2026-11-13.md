# Claude audit — 2026-11-13 (source HEAD 70aad11, branch feat/full-roadmap)

Manager audit of code + portrait quality. All numbers below were produced in a clean Linux copy of `git archive HEAD` with the repo's own solver, renderer (`referenceRaster`, 1000 px) and metric (`scripts/p16-1b/review.ts` `scoreRender`, viewing-SSIM against each case's own target). Reproduction scripts: `scripts/claude/` (see section 7).

## 1. Portrait quality — classic-greedy/4 candidate (main result)

**Finding.** Two classic3 constants are mis-tuned for the current product targets:

| Constant | classic3 (now) | Proposed /4 |
| --- | --- | --- |
| `darknessGamma` (err = (1 − v)^γ · importance) | 1.6 | **1.2** |
| face importance amplitude (importance = 1 + A · gaussian over `targetFaces`) | 1 | **3** |

Everything else is identical: `lineDarkness` 0.08 × importance, 240 pins, 3000 lines, minGap 25, maxChordRepeat 1, pin degree ≤ 160, Square guards/weave, `classic-coverage/2` renderer, 0.12 mm / 0.9 opacity.

**Reproduction check.** My non-accelerated copy of the classic3 loop (`scripts/claude/exp.ts` `solve`) reproduces production `generateClassicLeastSquares` paths *exactly* (path equality) for F0 Circle, F0 Heart, F0 Square and F2 Heart, and reproduces the archived scores (F0 Circle face 0.61585 / nose 0.49653; P16.1-C F2 photo-01 0.6291 / 0.6211).

**Results (base → /4 candidate), 9 cases, 4 distinct people (3 synthetic):**

| Case | face | nose | eyes | mouth |
| --- | --- | --- | --- | --- |
| F0 owner Circle (P16.1 benchmark) | 0.616 → 0.649 | 0.497 → 0.578 | 0.667 → 0.702 | 0.688 → 0.735 |
| F0 owner Heart | 0.614 → 0.682 | 0.529 → 0.621 | 0.752 → 0.808 | 0.717 → 0.754 |
| F0 owner Square | 0.493 → 0.531 | 0.414 → 0.473 | 0.533 → 0.581 | 0.583 → 0.651 |
| F2 photo-01 Circle | 0.629 → 0.647 | 0.621 → 0.669 | 0.728 → 0.732 | 0.592 → 0.612 |
| F2 photo-02 Square | 0.552 → 0.571 | 0.502 → 0.590 | 0.599 → 0.633 | 0.547 → 0.535 |
| F2 photo-03 Heart | 0.631 → 0.653 | 0.573 → 0.623 | 0.635 → 0.667 | 0.675 → 0.669 |
| F2 photo-04 synthetic | 0.634 → 0.657 | 0.657 → 0.678 | 0.612 → 0.612 | 0.672 → 0.690 |
| F2 photo-05 synthetic | 0.603 → 0.631 | 0.619 → 0.667 | 0.593 → 0.612 | 0.538 → 0.599 |
| F2 photo-06 synthetic | 0.636 → 0.659 | 0.620 → 0.648 | 0.641 → 0.631 | 0.623 → 0.663 |

Means: face **+0.030** (9/9 improved, min +0.018), nose **+0.057** (9/9, min +0.022), eyes +0.024 (8/9, worst −0.010), mouth +0.030 (7/9, worst −0.012). For scale: P16.1-B candidates moved face SSIM by ±0.003.

**Visual.** Cleaner, lighter background; eyes/nose/mouth clearly more defined; fewer stray diagonal strands across the face (most visible on photo-05/06 and F0 Circle). Owner-facing sheet: `output/claude-audit/sifat-oldin-keyin.png`.

**Grid searched (3000 lines, all 5 F2 circle/square cases):** γ ∈ {1.0, 1.1, 1.2, 1.3, 1.4} × A ∈ {1.5, 2, 3, 4, 5}. Trend: lower γ and higher A help up to a plateau. γ1.2/A3 chosen as the best robust point (worst single-region delta −0.0115). γ1.1/A4 and γ1.2/A5 have slightly higher means but worse worst-case, and A ≥ 4 starts starving hair/outline strands outside the face box (not measured by the face metric).

**Also tried, not recommended:** asymmetric over-darkening penalty λ = 2/4 (mixed), lineDarkness 0.06 (worse) / 0.10 (mixed), 2500 lines (worse everywhere), 3500 lines (small further gain, but +1.1 h assembly time).

**Caveats.** Tuned and tested on the existing 9-case benchmark. The metric only covers face regions. Before making it the default, validate on fresh photos: the owner plus 5–10 new consented photos, including a far/small face and two people, with an owner blind A/B vote.

**Integration notes.** Introduce a new immutable version (`classic-reference/4`, engine `classic-greedy/4`, profile id suffix `-classic4`) so every existing /3 guide stays replayable and its seed checks unchanged. `ClassicScoreCache` acceleration needs no change, because only the `err`/`darkness` arrays change. Fit time unchanged (≈1.2–1.6 s per 3000-line fit in my container).

## 2. Framing

P16.1-C F2 (face height 0.65, nose tip at (0.50, 0.42), white below chin) is clearly better than F1 and F0, both visually and per metric (owner Circle nose 0.50 → 0.62). Combined F2 + /4 gives 0.497 → 0.669 on the original P16.1 nose region. W1 auto-framing appears to use the same 0.65 cap (`src/core/customer-framing.ts:54`); confirm W1 default == P16.1-C F2 parameters. **Manager decision: P16.1-C accepted (F2 is the default framing).**

## 3. Physical kit risk (owner is building the first board now)

Solver and renderer assume **0.12 mm black thread, opacity 0.9**. With typical sewing thread (≈0.2–0.3 mm) and 3000 lines, the real board will be much darker than the preview. Before the first full build: measure the real thread diameter, and either buy matching thread or add a calibrated material profile (`threadMm`/opacity) as a new versioned profile. Do a 300–500 connection test first.

## 4. Security / production readiness

Good overall:

- Production hard-fails without `CODE_PEPPER`, `SANDBOX_PAYMENT_KEY` and `ADMIN_PASSWORD_HASH`.
- Admin password uses scrypt with a timing-safe compare; owner session tokens are stored hashed with an 8 h expiry.
- Per-IP limits: auth 12/min, generation 3/min, plus global budgets.
- SQL is parameterised. The only interpolation is constant table names in `account-erasure-store.ts`.
- Caddy sets HSTS and a strict CSP. Docker runs non-root with `cap_drop: ALL` and `no-new-privileges`, and the API port is not published.
- `node:sqlite` means no native deps, so ARM64 (Oracle Ampere) works.

Findings:

- **S1 (medium):** admin login shares the generic 12/min/IP auth budget. Add an admin-specific lockout/backoff (e.g. 5 failures → 15 min) plus an audit log entry, before going public.
- **S2 (medium):** backups. Schedule `scripts/backup-sqlite.mjs` on the server, copy backups off the server (Object Storage + owner PC), and run one restore drill. The DB and `CODE_PEPPER` must always be backed up together: losing the pepper invalidates every kit code.
- **S3 (low):** in non-production `CODE_PEPPER` silently falls back to random. Opening a copied DB that already contains kit codes would then make all codes fail. Refuse to start when the DB has kit codes and no explicit pepper is set.
- **S4 (info):** local launchers write the admin token and test codes to `output/**/manual-testing.txt`. That is fine locally (`output/` is git-ignored), but never use this path or flow in production.

Tests: in the clean Linux copy, 758/760 unit tests pass. The 2 failures happened only because `Dockerfile`/`.env.example` were not in the copied archive. Typecheck is clean apart from test imports of `AGENT/reference`, which was not copied.

## 5. Architecture / maintainability

- About 75k lines of TS. Very large files: `useAppController.tsx` 2219, `CustomerHub.tsx` 1956, `screens/CreateScreen.tsx` 1923, `CustomerStudio.tsx` 1756, `core/density.ts` 1547. Split them when touched; no big-bang refactor.
- **Scope:** the C01–C28 side products (mosaic, diamond, book folding, QR, 3D, workshops, B2B/partner, commissions, push, analytics…) multiply maintenance and attack surface for a business that sells one kit. In production, put everything outside the core flow (photo → preview → buy/code → assemble → account → admin) behind feature flags that are OFF by default. Keep the code.
- **Mobile performance:** the photo step can pull large on-device models (`selfie_multiclass_256x256.tflite` 16 MB, wasm 11 MB, `face_landmarker.task` 3.7 MB, `deeplab_v3.tflite` 2.8 MB). Measure real 4G time to first preview. Options: long-cache headers, preloading after the landing page, a smaller model, or server-side segmentation.
- **Agent docs:** `AGENT/PROGRESS.md` is 150 KB and `AGENT/LOG.md` is 353 KB, much of it compressed text without spaces. Every Codex session reads them, which wastes context and causes confusion. Archive the history to `AGENT/archive/` and keep `PROGRESS.md` ≤ 5 KB with only current state and the next step.
- **Repo hygiene:** `docs/IP_RASM_CODEX_HANDOFF.zip` is tracked; remove it from the tree (history stays). There is no `origin/main`, so the PR base is still undecided.

## 6. Priorities

1. Integrate classic-greedy/4 (γ 1.2, A 3) as a versioned option. Validate on fresh photos, owner blind A/B, then make it the default for NEW works only.
2. Confirm the W1 default framing equals P16.1-C F2, and close P16.1-C.
3. Thread calibration before the owner's first full board.
4. Before the Oracle deploy: S1 admin lockout, S2 backup schedule + restore drill, S3 pepper guard.
5. Production feature flags for non-core features.
6. Archive the agent docs.

## 7. Reproduction

`scripts/claude/exp.ts` (harness: `load`, `solve`, `evaluate`), `scripts/claude/more.ts` (Heart/Square + path-equality check), `scripts/claude/f0.ts` (F0 Circle). They read inputs from a staged copy of `output/quality-original-20261026/**` and `output/p16-1c-review/private/**`; edit the `U` constant to point at the repo's `output/`. Example:

```
IDS=photo-01,photo-02 VARIANTS='{"base":{},"g4":{"gamma":1.2,"amp":3}}' npx tsx scripts/claude/exp.ts
```
