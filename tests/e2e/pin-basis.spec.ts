import { openMore, revealControl } from "./navigation";
import { withPinBasis } from "../../src/core/pin-basis";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createProfile } from "../../src/core/geometry";
import {
  generateDensity,
  type DensityCheckpoint,
} from "../../src/core/density";
import { DEFAULT_PORTRAIT } from "../../src/core/portrait";
import { defaultPhysicalContrast } from "../../src/core/physical-contrast";
import { DEFAULT_EDITS } from "../../src/core/types";
import { validateInstruction } from "../../src/core/validation";

for (const mode of ["dark", "light"] as const)
  test(`seedless ${mode} 320-pin exact Worker recovery survives reload, exports, reuse and presets`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const Native = Worker;
      (window as any).__basisTerminal = null;
      window.Worker = class extends Native {
        constructor(...args: any[]) {
          super(args[0], args[1]);
          this.addEventListener("message", (e) => {
            if (e.data.type === "error")
              (window as any).__basisTerminal = {
                type: "error",
                message: e.data.message,
              };
            if (e.data.type === "done")
              (window as any).__basisTerminal = {
                type: "done",
                mode: e.data.instruction.params.mode,
                hash: e.data.instruction.sequenceHash,
              };
          });
        }
      };
    });
    const base = createProfile("circle", 240, mode);
    base.threadMm = 0.1;
    const profile = withPinBasis(base, 320);
    const pixels = Uint8Array.from(
      { length: 32 * 32 * 3 },
      (_, k) => 120 + (Math.floor(k / 3) % 100),
    );
    const o = {
      pixels,
      profile,
      resolution: 32,
      mode,
      lines: 800,
      portrait: {
        ...DEFAULT_PORTRAIT,
        enabled: true,
        regions: {
          reference: "processed-target/sample-centers-v1" as const,
          placement: "manual" as const,
          eyes: { left: 0.3, top: 0.4, width: 0.4, height: 0.1 },
          nose: { left: 0.4, top: 0.55, width: 0.2, height: 0.15 },
          mouth: { left: 0.3, top: 0.75, width: 0.4, height: 0.1 },
        },
      },
    };
    const tuning = {
      physical: defaultPhysicalContrast(),
      edgeWeight: 2,
      sweeps: 2,
    };
    const expected = await generateDensity(o, tuning);
    let checkpoint: DensityCheckpoint | undefined;
    await expect(
      generateDensity(
        { ...o, cancelled: () => !!checkpoint },
        {
          ...tuning,
          onCheckpoint: (s) => {
            checkpoint = s;
          },
        },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(checkpoint!.sweeps).toBe(1);
    await page.goto("/");
    await page.evaluate(
      async ({ pixels, record }) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open("iprasm.optimizer-recovery", 1);
          r.onupgradeneeded = () => r.result.createObjectStore("stages");
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        await new Promise<void>((resolve, reject) => {
          const t = db.transaction("stages", "readwrite");
          t.objectStore("stages").put(
            { ...record, pixels: new Uint8Array(pixels) },
            "physical",
          );
          t.oncomplete = () => resolve();
          t.onerror = () => reject(t.error);
        });
        db.close();
      },
      {
        pixels: [...pixels],
        record: {
          version: "iprasm.optimizer-recovery/1",
          checkpoint,
          profile,
          portrait: o.portrait,
          resolution: o.resolution,
          mode,
          totalSweeps: 2,
          lines: 800,
          strategy: "basis",
          edits: DEFAULT_EDITS,
          name: "Manual anatomy recovery QA",
        },
      },
    );
    await page.reload();
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await page
      .getByRole("button", { name: "Resume saved optimization", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__basisTerminal), {
        timeout: 15000,
      })
      .toEqual({ type: "done", mode, hash: expected.sequenceHash });
    const preview = page.locator("canvas[data-sequence-hash]");
    await expect(preview).toHaveAttribute(
      "data-sequence-hash",
      expected.sequenceHash,
    );
    await page
      .getByRole("button", { name: "Save & assemble", exact: true })
      .click();
    const event = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Project JSON", exact: true })
      .click();
    const project = JSON.parse(
      readFileSync((await (await event).path())!, "utf8"),
    ).project;
    await validateInstruction(project.instruction);
    expect(project.instruction.sequenceHash).toBe(expected.sequenceHash);
    expect(project.instruction.algorithm).toBe("density-pin-basis/11");
    expect(project.instruction.profile).toEqual(profile);
    expect(project.progress.confirmed).toBe(0);
    expect(project.instruction.metrics.densityFit.sweeps).toBe(
      expected.metrics.densityFit!.sweeps,
    );
    // Connected sandbox persistence must accept the exact new instruction version too.
    await openMore(page);
    await page.getByRole("button", { name: "Account & shop", exact: true })
      .click();
    const hub = page.locator(".customer-hub");
    await hub
      .getByRole("button", { name: "Start sandbox session", exact: true })
      .click();
    const secrets = ({ LOCAL_ADMIN_TOKEN: process.env.LOCAL_ADMIN_TOKEN! });
    const issued = await page.request.post(
      (process.env.IP_RASM_TEST_API_URL! + "/api/admin/codes"),
      {
        headers: { Authorization: `Bearer ${secrets.LOCAL_ADMIN_TOKEN}` },
        data: { profile: profile.id, quota: 1, expiresAt: Date.now() + 60000 },
      },
    );
    expect(issued.ok()).toBe(true);
    await hub
      .getByLabel("Kit code", { exact: true })
      .fill((await issued.json()).code);
    await hub.getByRole("button", { name: "Redeem code", exact: true }).click();
    await expect(hub.getByTestId("customer-credits")).toHaveText("1");
    await hub
      .getByRole("button", { name: "Project sync", exact: true })
      .click();
    const finished = page.waitForResponse((r) =>
      r.url().endsWith("/api/jobs/finish"),
    );
    await hub
      .getByRole("button", {
        name: "Save instruction to server · 1 credit",
        exact: true,
      })
      .click();
    expect((await finished).status()).toBe(200);
    await expect(hub.getByTestId("customer-credits")).toHaveText("0");
    await page
      .locator("nav")
      .getByRole("button", { name: "My projects", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Reuse settings", exact: true })
      .first()
      .click();
    await openMore(page);
    await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
      .click();
    await expect(
      page.getByLabel("Portrait optimization", { exact: true }),
    ).toHaveValue("basis");
    await revealControl(page.locator("summary").filter({ hasText: "Saved settings" }));
    await page.locator("summary").filter({ hasText: "Saved settings" }).click();
    await revealControl(page.getByLabel("Settings name", { exact: true }));
    await page.getByLabel("Settings name", { exact: true }).fill("Exact 320-pin QA");
    await page
      .getByRole("button", { name: "Save settings", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("iprasm.presets.v1") ?? "[]")[0]
              ?.name,
        ),
      )
      .toBe("Exact 320-pin QA");
    const presets = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("iprasm.presets.v1")!),
    );
    expect(presets[0].settings.pinCoordinates).toEqual(profile.pins);
    expect(presets[0].settings.pinBasis).toEqual(profile.pinBasis);
    await page.reload();
    await openMore(page);
    await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
      .click();
    await revealControl(page.locator("summary").filter({ hasText: "Saved settings" }));
    await page.locator("summary").filter({ hasText: "Saved settings" }).click();
    await revealControl(page.getByLabel("Saved settings", { exact: true }));
    await page.getByLabel("Saved settings", { exact: true }).selectOption(presets[0].id);
    await expect(
      page.getByLabel("Portrait optimization", { exact: true }),
    ).toHaveValue("basis");
    await page.getByText("Dimensions and materials", { exact: true }).click();
    await expect(
      page.getByLabel("Number of pins", { exact: true }),
    ).toHaveValue("320");
    await revealControl(page.getByRole("button", { name: "Heart", exact: true, includeHidden: true }));
    await page.getByRole("button", { name: "Heart", exact: true }).click();
    await expect(
      page.getByLabel("Portrait optimization", { exact: true }),
    ).toHaveValue("guarded");
    await expect(
      page.getByLabel("Number of pins", { exact: true }),
    ).toHaveValue("240");
  });
