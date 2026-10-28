import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test, expect } from "vitest";
import {
  KitInventorySummary,
  type KitInventoryRow,
} from "../src/KitInventorySummary";
import type { Locale } from "../src/core/types";
test("private summary shows actual supplied counts and localized states, never code/export fields or unsafe HTML", () => {
  const rows: KitInventoryRow[] = ["staging", "ready", "failed", "revoked"].map(
    (status, k) => ({
      id: "inventory-" + k + "<script>",
      profile: "standard-base-r1",
      total: 1000000,
      issued: k === 1 ? 1000000 : 100,
      status: status as KitInventoryRow["status"],
      codes: ["never-render-this-secret"],
      exportKey: "never-render-this-key",
    }),
  );
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as Locale[]) {
    const html = renderToStaticMarkup(
      createElement(KitInventorySummary, { locale, rows }),
    );
    expect(html).toContain('data-total="1000000"');
    expect(html).toContain('data-issued="1000000"');
    expect(html).not.toContain("never-render-this");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("undefined");
    expect((html.match(/data-testid="kit-inventory-row"/g) || []).length).toBe(
      4,
    );
    expect(
      renderToStaticMarkup(
        createElement(KitInventorySummary, { locale, rows: [] }),
      ),
    ).not.toContain("<table>");
  }
});
