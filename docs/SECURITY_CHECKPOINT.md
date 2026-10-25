# C24 security closure — active

## C24a dependency and complete-history audit accepted2026-10-25

Initial npm audit:1high(Vite),2moderate(Vitest/mocker),0critical. Official registry patch versions verified; workspace dev dependencies pinned Vite7.3.7/Vitest4.1.12 with ignore-scripts,9packages changed. No system/phone install, lifecycle script, owner preview restart or protected build change. Full npm audit now0allseverities,report c24-patched-npm-audit.json. Production acquiring/providers untouched.

New audit-history-secrets.mjs scans every locally available Git ref, not only HEAD or Phase15. Separate full path history catches renamed/aliased blobs; unique text blobs scanned for recognized credentials and configured root.env/.env.production values without serializing matches. Protected tmp/data never accessed. Explicit limits: no guarantee about arbitrary unrecognized secrets/unlabelled personal images; binary files path-checked,notdecoded; oversize text fails for separate review,known large model/font/media binaries counted separately. CLI prints counts only; failures do not dump subprocess buffers. Tests create an isolated ignored syntheticGit history, remove fake credential from HEAD, still detect it and former.env path; reports never include value. Also tests known-value redaction and path examples.

At6245539:4558objects,3091textblobs,35smallbinaryblobs,0oversize text,0knownrootenvvalues,0prohibitedpaths,0recognizedcredentialfindings. Ignoredlocaldata/realmanualtokens notread. Report c24-history-audit.json; re-run aftercommit beforepush. Source product export scan remains separate. No claim about unavailable remote refs or arbitrary hidden formats.

Executed28/28focusedunit7files on patchedVitest(history,production auth,trial,physical preview,classic reference,sector exports,localeaudit),TypeScript,2131module isolatedbuild20.13s. ActualpatchedVite desktop/mobile public/oldguide/export/offline4/4passed36.8s at4537/API4683. Highest protected4213/4214 snapshots each92SHAfiles reverified fromlocalmetadata only,no HTTP contact. SourceC24a is a tested tooling milestone,NOT completion of request/proxy/storage/CSP security.

Next C24b: failing guards first for trustedproxy identity/current rawremoteAddress,bounded scoped/global rate/maps,globalgallerybytes/items capacity and CaddyCSP; strict input/body/auth limits and actual host/stack tests. Current reverse proxy collapses clientIP and CaddyCSP is absent; do not mark C24 complete until fixed/tested. No realcharges/Telegram/messages/systemchanges.
