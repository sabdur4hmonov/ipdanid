# Website launch contract — 2026-10-26

The owner prioritizes the website before the native app and will provide Telegram and phone contacts later. Do not invent contacts or send messages. Existing email/password accounts are optional; they must never be a prerequisite for ordinary previews or physical-kit login.

- A visitor uploads and positions a photo and generates unlimited static thread previews without signing in.
- Each physical box has its own private kit code. The code itself signs in without an additional password and defaults to three distinct full-guide unlocks.
- Reopening the same unlocked guide, resuming work and reissuing its device receipt do not charge another build or replenish the balance.
- Before unlock, ordered player steps, PDF/TXT/JSON instructions and ordered video/GIF exports remain locked. A finished static preview is free.
- After three distinct unlocks, the next static preview remains free but its new instructions require another kit credit. Other boxes retain independent grants.
- The website handoff may precede Android packaging. Full C26/native/hardware/provider acceptance remains a separate, accurately recorded status.

Verification: `tests/kit-store.test.ts`, `tests/e2e/kit-build.spec.ts`, `tests/e2e/board-first-build.spec.ts`, and `tests/e2e/phase15-animation.spec.ts`. The animation guard was reproduced failing before the fix. No photo, kit code, password or database is committed.
