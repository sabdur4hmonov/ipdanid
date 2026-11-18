import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { english, choosePhoto, result } from "../protected-e2e/helpers";
import { PDFDocument } from "pdf-lib";

let server: ChildProcess;
let entry: URL;
let code: string;
let admin: string;
let measuredRevision: number;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  test.setTimeout(480_000);
  const ip = process.env.IP_RASM_P2_LAN_IP;
  if (!ip) throw Error("Set IP_RASM_P2_LAN_IP to the test adapter's private IPv4");
  server = spawn(process.execPath, ["--import", "tsx", "scripts/start-lan-build.mjs", ip, "--test"], {
    stdio: ["ignore", "pipe", "inherit"], windowsHide: true,
  });
  entry = await new Promise<URL>((ok, fail) => {
    let output = "";
    const timer = setTimeout(() => fail(Error("Isolated P2 LAN server did not start")), 420_000);
    server.once("exit", status => {
      clearTimeout(timer);
      fail(Error(`Isolated P2 LAN server stopped (${status})`));
    });
    server.stdout!.on("data", chunk => {
      output += String(chunk);
      const found = output.match(/Telefon URL: (http:\/\/[^\s]+)\r?\nSinov kodi: ([^\r\n]+)\r?\n/);
      if (found) {
        clearTimeout(timer);
        const credentials = readFileSync(resolve(found[2]), "utf8");
        code = credentials.match(/3 works\): (\S+)/)![1];
        admin = credentials.match(/sandbox token: (\S+)/)![1];
        ok(new URL(found[1]));
      }
    });
  });
});
test.afterAll(() => server?.kill());

test("Admin measures thread and downloads the A3 board template", async ({ page }) => {
  const entryResponse = await page.request.get(entry.href, { maxRedirects: 0 });
  expect(entryResponse.status()).toBe(302);
  expect(entryResponse.headers().location).toBe("/");
  expect(entryResponse.headers()["set-cookie"]).toMatch(/HttpOnly; SameSite=Strict/);
  await page.goto(entry.origin);
  await english(page);
  await page.getByTestId("customer-account-link").click();
  const hub = page.locator(".customer-hub");
  await hub.getByRole("button", { name: "Administration", exact: true }).click();
  await hub.getByLabel("Administrator token", { exact: true }).fill(admin);
  await hub.getByRole("button", { name: "Open administration", exact: true }).click();
  const form = page.getByTestId("standard-kit-admin");
  const initial = await (await page.request.get(entry.origin + "/api/kit-profiles")).json();
  measuredRevision = initial.revision + 1;
  await expect(form.getByLabel("Thread diameter (mm)", { exact: true })).toHaveValue("0.12");
  await form.getByLabel("Measured thread diameter (mm)", { exact: true }).fill("0.22");
  await expect(form.getByRole("status")).toContainText("preview may look lighter");
  const saved = page.waitForResponse(r => r.url().endsWith("/api/admin/kits/profiles") && r.request().method() === "POST");
  await form.getByRole("button", { name: "Save standard kit profiles" }).click();
  const config = await (await saved).json();
  expect(config).toMatchObject({ revision: measuredRevision, measuredThreadMm: 0.22, threadMm: 0.12 });
  const download = page.waitForEvent("download");
  await form.getByRole("button", { name: "4 × A3 template · Circle 46" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`ip-rasm-standard-circle-quadrants-r${measuredRevision}.pdf`);
  expect((await PDFDocument.load(readFileSync((await file.path())!))).getPageCount()).toBe(5);
  const issued = await page.request.post(entry.origin + "/api/admin/kits/batch", {
    headers: { authorization: "Bearer " + admin },
    data: { profile: `standard-base-r${measuredRevision}`, count: 1, requestKey: crypto.randomUUID() },
  });
  expect(issued.ok()).toBe(true);
  code = (await issued.json()).codes[0].code;
});

test("plain HTTP on a real LAN interface unlocks, renders, speaks and resumes at 390px", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const deviceVoice = { voiceURI: "p2-device", name: "P2 device voice", lang: "en-US", localService: true, default: true };
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class TestUtterance { constructor(readonly text: string) {} },
    });
    Object.defineProperty(window.speechSynthesis, "getVoices", { value: () => [deviceVoice] });
    Object.defineProperty(window.speechSynthesis, "speak", {
      value: (utterance: SpeechSynthesisUtterance) => {
        document.documentElement.dataset.ttsRequest = utterance.text;
      },
    });
    Object.defineProperty(navigator, "vibrate", {
      value: (duration: number) => {
        document.documentElement.dataset.lastVibration = String(duration);
        return true;
      },
    });
  });
  const blocked = await request.get(entry.origin + "/api/generation/config");
  expect(blocked.status()).toBe(403);
  expect((await request.get(entry.origin + "/?k=invalid")).status()).toBe(403);
  expect((await request.get(entry.origin, { headers: { Host: "other.invalid" } })).status()).toBe(403);
  // Avoid attaching the private entry URL to any report, even on failure.
  await page.request.get(entry.href, { maxRedirects: 0 }).catch(() => {});
  await page.goto(entry.origin);
  await expect(page.getByTestId("customer-menu")).toBeVisible();
  expect(await page.evaluate(() => [isSecureContext, Boolean(crypto.subtle), innerWidth])).toEqual([false, false, 390]);
  expect((await page.request.get(entry.origin + "/api/generation/config", {
    headers: { Origin: "http://other.invalid" },
  })).status()).toBe(403);
  expect(await page.request.get(entry.origin + "/api/generation/config").then(r => r.json())).toMatchObject({ enabled: true });
  await english(page);
  await choosePhoto(page, true);
  await page.locator("button.customer-main-action").click();
  await result(page);
  await page.getByTestId("customer-result").getByRole("button", { name: "Start assembling", exact: true }).click();
  await page.getByTestId("have-kit-code").click();
  await page.getByTestId("kit-code").fill(code);
  await page.getByTestId("build-gate").getByRole("button", { name: "Sign in with kit code", exact: true }).click();
  const unlocked = page.waitForResponse(r => r.url().endsWith("/api/generation/unlock") && r.ok());
  await page.getByTestId("unlock-build").click();
  const guide = (await (await unlocked).json()).instruction;
  expect(guide.params.classic.version).toBe("classic-reference/4");
  expect(guide.profile.standardKit.config).toMatchObject({ revision: measuredRevision, measuredThreadMm: 0.22, threadMm: 0.12 });
  const hash = page.getByTestId("player-hash");
  await expect(hash).toHaveText(/^[a-f0-9]{64}$/);
  const sequenceHash = await hash.innerText();
  await expect(page.getByTestId("player-thread-warning")).toContainText("preview may look lighter");
  await page.getByText("Phone controls", { exact: true }).click();
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await page.getByRole("checkbox", { name: "Vibrate on confirmation" }).check();
  await page.getByTestId("assembly-confirm").click();
  await expect(page.locator("html")).toHaveAttribute("data-last-vibration", "30");
  await page.getByText("Phone controls", { exact: true }).click();
  await expect(page.getByTestId("confirmed-step")).toHaveText(/^1\//);
  const preview = page.getByTestId("assembly-current-result");
  await preview.locator("summary").click();
  const canvas = preview.getByTestId("assembly-partial-result").locator("canvas");
  const final = preview.getByTestId("assembly-final-result").locator("canvas");
  await expect(canvas).toHaveAttribute("data-sequence-hash", sequenceHash);
  await expect(final).toHaveAttribute("data-sequence-hash", sequenceHash);
  const before = await canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  const full = await final.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  expect(before !== full).toBe(true);
  await page.getByTestId("assembly-next").click();
  await expect.poll(() => canvas.evaluate((el, previous) => (el as HTMLCanvasElement).toDataURL() !== previous, before)).toBe(true);
  expect(await final.evaluate((el, previous) => (el as HTMLCanvasElement).toDataURL() === previous, full)).toBe(true);
  await preview.evaluate(el => el.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: "output/p2/player-390.png", scale: "css" });
  await page.getByLabel("Guide language", { exact: true }).selectOption("en");
  await page.getByRole("combobox", { name: "Voice guidance", exact: true }).selectOption({ label: "P2 device voice (en-US)" });
  await page.getByRole("checkbox", { name: "Voice guidance", exact: true }).check();
  await page.getByRole("button", { name: "Repeat", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-tts-request", /[A-D]/);
  await page.getByText("Phone controls", { exact: true }).click();
  const video = page.locator(".assembly-phone-controls video");
  await page.getByRole("button", { name: "Try silent video to keep the screen on" }).click();
  await expect.poll(() => video.evaluate(el => !(el as HTMLVideoElement).paused)).toBe(true);
  const route = await page.getByTestId("assembly-current-route").innerText();
  await page.getByTestId("assembly-rest").click();
  await expect.poll(() => page.evaluate(() =>
    !Array.from(document.querySelectorAll<HTMLVideoElement>(".assembly-phone-controls video"))
      .some(el => !el.paused),
  )).toBe(true);
  await expect(page.getByTestId("assembly-rest-status")).toHaveAttribute("data-state", "saved");
  await page.reload();
  await expect(hash).toHaveText(sequenceHash);
  await expect(page.getByTestId("confirmed-step")).toHaveText(/^1\//);
  await expect(page.getByTestId("assembly-current-route")).toHaveText(route);
  await expect(page.getByTestId("assembly-rest-status")).toHaveAttribute("data-state", "saved");
  await page.getByTestId("assembly-rest").click();
  await expect(page.getByTestId("assembly-rest-status")).toHaveCount(0);
  expect(errors).toEqual([]);
});
