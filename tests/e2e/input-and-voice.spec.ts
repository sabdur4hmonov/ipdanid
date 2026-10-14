import { openMore, revealControl } from "./navigation";
import { test, expect } from "@playwright/test";

test("normalizes JPEG orientation, composites PNG alpha, and rejects unsafe inputs", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  const upload = page.locator("input[type=file]").first();
  await upload.setInputFiles("tests/fixtures/orientation-6.jpg");
  await expect(page.getByLabel("Edited photo")).toBeVisible();
  const colors = await page
    .getByLabel("Edited photo", { exact: true })
    .evaluate((canvas: HTMLCanvasElement) => {
      const c = canvas.getContext("2d")!;
      return [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ].map(([x, y]) => [
        ...c.getImageData(
          Math.round(x * canvas.width),
          Math.round(y * canvas.height),
          1,
          1,
        ).data,
      ]);
    });
  expect(colors[0][2]).toBeGreaterThan(200);
  expect(colors[0][0]).toBeLessThan(50);
  expect(colors[1][0]).toBeGreaterThan(200);
  expect(colors[1][1]).toBeLessThan(50);
  expect(colors[2][0]).toBeGreaterThan(200);
  expect(colors[2][1]).toBeGreaterThan(200);
  expect(colors[3][1]).toBeGreaterThan(200);
  expect(colors[3][2]).toBeLessThan(50);
  await upload.setInputFiles("tests/fixtures/transparency.png");
  await revealControl(page.getByRole("button", { name: "transparency.png", exact: true, includeHidden: true }));
  await expect(
    page.getByRole("button", { name: "transparency.png", exact: true }),
  ).toBeVisible();
  const corner = await page
    .getByLabel("Edited photo", { exact: true })
    .evaluate((canvas: HTMLCanvasElement) => [
      ...canvas.getContext("2d")!.getImageData(5, 5, 1, 1).data,
    ]);
  expect(corner).toEqual([255, 255, 255, 255]);
  await upload.setInputFiles({
    name: "unsupported.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  await expect(page.getByRole("alert")).toContainText("valid JPEG or PNG");
  const header = Buffer.alloc(24);
  header.set([137, 80, 78, 71, 13, 10, 26, 10]);
  header.writeUInt32BE(5000, 16);
  header.writeUInt32BE(5000, 20);
  await upload.setInputFiles({
    name: "crafted-oversized-header.png",
    mimeType: "image/png",
    buffer: header,
  });
  await expect(page.getByRole("alert")).toContainText(
    "safe decoded dimensions",
  );
  // Create the same oversized File in the browser: transferring a 20MB base64 CDP
  // payload stalled before the application's change handler on this Windows host.
  // The actual file input, handler and byte-limit rejection remain under test.
  await upload.evaluate((input: HTMLInputElement) => {
    const files = new DataTransfer();
    files.items.add(
      new File([new Uint8Array(15 * 1024 * 1024 + 1)], "oversized.png", {
        type: "image/png",
      }),
    );
    input.files = files.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByRole("alert")).toContainText("Maximum file size");
  await page.getByLabel("Language", { exact: true }).selectOption("uz");
  await expect(page.getByRole("alert")).toContainText("Fayl 15 MB dan katta");
  await page.getByLabel("Language", { exact: true }).selectOption("ru");
  await expect(page.getByRole("alert")).toContainText("Файл больше 15 МБ");
  // Rejecting a new input must retain the last valid working photo.
  await expect(page.getByLabel("Edited photo")).toBeVisible();
});

test("matching voice fallback and cancellation keep playback distinct from confirmation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const calls: { kind: string; text?: string; lang?: string }[] = [];
    (window as any).__speechCalls = calls;
    const voices = [
      {
        name: "Test English",
        lang: "en-US",
        localService: true,
        default: true,
        voiceURI: "test-en",
      },
    ];
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => voices,
        addEventListener: () => {},
        removeEventListener: () => {},
        cancel: () => calls.push({ kind: "cancel" }),
        speak: (u: any) =>
          calls.push({ kind: "speak", text: u.text, lang: u.lang }),
      },
    });
    (window as any).SpeechSynthesisUtterance = class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    };
  });
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await revealControl(page.getByRole("button", { name: "Lighter", exact: true, includeHidden: true }));
  await page.getByRole("button", { name: "Lighter", exact: true }).click();
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  const voice = page.getByRole("checkbox", {
    name: "Voice guidance",
    exact: true,
  });
  await page.getByLabel("Guide language", { exact: true }).selectOption("en");
  await voice.check();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__speechCalls.filter((c: any) => c.kind === "speak")
            .length,
      ),
    )
    .toBeGreaterThan(0);
  await page.getByLabel("Language", { exact: true }).selectOption("uz");
  await expect(page.getByRole("checkbox", { name: "Ovozli qo‘llanma", exact: true })).toBeEnabled();
  await page.getByLabel("Instruktor tili", { exact: true }).selectOption("uz");
  await expect(
    page.getByRole("checkbox", { name: "Ovozli qo‘llanma", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Bu tilda ovoz mavjud emas. Matnli qo‘llanma ishlaydi.", {
      exact: true,
    }),
  ).toBeVisible();
  const before = await page.evaluate(
    () =>
      (window as any).__speechCalls.filter((c: any) => c.kind === "speak")
        .length,
  );
  await page.getByRole("button", { name: "Keyingi", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        (window as any).__speechCalls.filter((c: any) => c.kind === "speak")
          .length,
    ),
  ).toBe(before);
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page.getByLabel("Guide language", { exact: true }).selectOption("en");
  await revealControl(page.getByLabel("Seconds per step", { exact: true }));
  await page.getByLabel("Seconds per step", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByLabel("Jump to exact step")).toHaveValue("3", {
    timeout: 5000,
  });
  await expect(page.getByTestId("confirmed-step")).toContainText("0/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect(
    await page.evaluate(() => (window as any).__speechCalls.at(-1).kind),
  ).toBe("cancel");
  await page.getByLabel("Jump to exact step").fill("12");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("confirmed-step")).toContainText("0/");
  const tail = await page.evaluate(() =>
    (window as any).__speechCalls.slice(-2),
  );
  expect(tail[0].kind).toBe("cancel");
  expect(tail[1].kind).toBe("speak");
  expect(tail[1].text).toContain("12");
});
