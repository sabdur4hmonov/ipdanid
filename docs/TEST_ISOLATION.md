# Test isolation

All browser API tests use a fresh SQLite database beneath `IP_RASM_TEST_ARTIFACTS` (default `test-results`). Database folders are siblings of `browser`, which Playwright cleans at startup. Neither API nor preview servers may be reused. Ports must differ and port 4194 is reserved for the owner.

The browser config generates private test secrets once per run and propagates them to every worker and its API. It never reads `tmp/data/local-secrets.json`. The test API accepts only the configured loopback preview origin in addition to the existing local allowlist. The ordinary owner server retains its existing configuration and restrictions.

`server/test-safety.mjs` rejects missing test database configuration, `tmp/data` paths, traversal into that directory, and existing symlink/junction ancestors that resolve into it. The server activates the check before secrets or SQLite when `IP_RASM_TEST_SERVER=1` or `NODE_ENV=test`. HTTP verification scripts set the flag and allocate fresh databases through `scripts/test-artifacts.mjs`, beneath `IP_RASM_TEST_ARTIFACTS` (default `test-results`). Protected roots are rejected before mkdir. Scripts supply their own secrets and never open owner data. Playwright also checks its artifacts/report paths before creating directories.

Use installed Chrome without downloading a browser:

```powershell
$env:IP_RASM_TEST_BROWSER_CHANNEL = 'chrome'
$env:IP_RASM_TEST_PORT = '4289'
$env:IP_RASM_TEST_API_PORT = '4429'
$env:IP_RASM_TEST_ARTIFACTS = 'test-results/manual-full'
$env:IP_RASM_TEST_REPORT = 'test-results/manual-full/report.json'
npm run build
npm run test:e2e
```

Use unused ports. Do not run another build while the preview is serving tests: Vite clears `dist`, which can cause transient navigation errors. Do not stop unrelated services to free a port. Preserve interrupted/failed artifacts in a separately named directory.

Test navigation helpers open the More menu and disclosure summaries through real clicks. They do not force hidden controls or alter DOM visibility. New tests should use the visible photo-first flow and open optional settings explicitly.

The full local suite contains private, pre-existing quality fixtures. The public CI configuration remains restricted to committed synthetic fixtures; public green does not imply full local portrait/physical acceptance.
