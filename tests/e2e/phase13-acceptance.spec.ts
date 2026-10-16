import { test } from "@playwright/test";
import { existsSync } from "node:fs";
import { phase13Cases, reportCase } from "./phase13-report-case";
test.use({ serviceWorkers: "block" });
for (const c of phase13Cases)
  test(`sharper portraits3 ${c.name}`, async ({ page }, info) => {
    test.setTimeout(300000);
    test.skip(
      !existsSync(c.source),
      "Private/synthetic local acceptance photos are intentionally excluded from Git.",
    );
    await reportCase(page, info, c);
  });
