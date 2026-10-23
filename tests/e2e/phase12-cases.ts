import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
export const photoCases = [
  {
    name: "synthetic-1-circle",
    source: "output/phase10/inputs/synthetic-1.png",
    shape: "circle",
  },
  {
    name: "synthetic-2-circle",
    source: "output/phase10/inputs/synthetic-2.png",
    shape: "circle",
  },
  {
    name: "synthetic-3-circle",
    source: "output/phase10/inputs/synthetic-3.png",
    shape: "circle",
  },
  {
    name: "owner-phase9-circle",
    source: "output/portrait-dispatch/target-320.png",
    shape: "circle",
  },
  {
    name: "synthetic-1-square",
    source: "output/phase10/inputs/synthetic-1.png",
    shape: "rectangle",
  },
  {
    name: "synthetic-pair-heart",
    source: "output/phase10/inputs/synthetic-1.png",
    shape: "heart",
    pair: true,
  },
] as const;
export async function gallery(page: Page, c: (typeof photoCases)[number]) {
  const jpg = await page.evaluate(
    async ({ raw, other }) => {
      const load = async (s: string) => {
        const i = new Image();
        i.src = "data:image/png;base64," + s;
        await i.decode();
        return i;
      };
      const a = await load(raw),
        canvas = document.createElement("canvas");
      canvas.width = other ? 1600 : a.width;
      canvas.height = other ? 1100 : a.height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#eee";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (other) {
        ctx.drawImage(a, 0, 100, 800, 800);
        ctx.drawImage(await load(other), 800, 100, 800, 800);
      } else ctx.drawImage(a, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.96).split(",")[1];
    },
    {
      raw: readFileSync(c.source).toString("base64"),
      other:
        "pair" in c
          ? readFileSync("output/phase10/inputs/synthetic-2.png").toString(
              "base64",
            )
          : "",
    },
  );
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", {
      name: /^(Galereyadan tanlash|Choose photo)$/,
      exact: true,
    })
    .click();
  await (
    await chooser
  ).setFiles({
    name: c.name + ".jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(jpg, "base64"),
  });
  await expect(page.getByTestId("customer-flow")).toHaveAttribute(
    "data-screen",
    "adjust",
  );
  await expect(page.getByTestId("customer-photo")).not.toHaveAttribute(
    "data-framing",
    "null",
    { timeout: 90000 },
  );
  await expect(
    page.getByRole("button", { name: /^(Yaratish|Create)$/, exact: true }),
  ).toBeEnabled({ timeout: 30000 }); // Tone preparation is asynchronous; generation keeps its separate timing gate.
  return Buffer.from(jpg, "base64");
}
export async function english(page: Page) {
  await page.getByTestId("customer-menu").locator("summary").click();
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page.getByTestId("customer-menu").locator("summary").click();
}
export async function png(page: Page, id: string) {
  return page
    .getByTestId(id)
    .evaluate((c: HTMLCanvasElement) => c.toDataURL().split(",")[1]);
}

// Observe the actual worker input, not the colour placement preview. Test only.
export async function captureStudioTarget(page: Page) {
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (data: any, ...args: any[]) {
      if (data?.strategy === "classic3" && data.pixels) {
        const c = document.createElement("canvas");
        c.width = c.height = data.resolution;
        const ctx = c.getContext("2d")!,
          d = ctx.createImageData(c.width, c.height);
        for (let k = 0; k < data.pixels.length / 3; k++) {
          for (let ch = 0; ch < 3; ch++)
            d.data[k * 4 + ch] = data.pixels[k * 3 + ch];
          d.data[k * 4 + 3] = 255;
        }
        ctx.putImageData(d, 0, 0);
        (window as any).__studioTarget = c.toDataURL().split(",")[1];
      }
      return original.apply(this, [data, ...args] as any);
    };
  });
}
export async function studioTargetPng(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__studioTarget);
}
