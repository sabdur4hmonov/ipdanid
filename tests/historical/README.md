# Historical UI acceptance scripts

`heart-head-repair.ts` documents the /7 and /8 automatic-head UI that the owner explicitly replaced on 2026-10-22. It is not a current customer-flow requirement and is not discovered by Playwright. Its executed evidence remains frozen at the /7 checkpoint (commit 7be6df2). Current replacement: `e2e/free-photo-flow.spec.ts`; old guide contracts remain actively tested in `heart-head-repair.test.ts`. Do not rerun old scripts against protected live previews or overwrite their artifacts.
