import { test } from "@playwright/test";
import { existsSync } from "node:fs";
import { phase13Cases, reportCase } from "./phase13-report-case";
test.use({ serviceWorkers: "block" });
for (const name of ["owner-phase9-square", "synthetic-pair-heart"])
  test(`mobile sharper portraits3 ${name}`, async ({ page }, info) => {
    test.setTimeout(300000);
    const c = phase13Cases.find((c) => c.name === name)!;
    test.skip(
      !existsSync(c.source),
      "Local acceptance photos are intentionally excluded from Git.",
    );
    await reportCase(page, info, c);
  });
