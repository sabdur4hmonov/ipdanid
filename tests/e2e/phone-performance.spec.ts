import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { gallery, photoCases, english } from "./phase12-cases";
import { newEvidenceRoot } from "../helpers/evidence-paths";
test.use({ serviceWorkers: "block", trace: "off" });
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__phonePerf = { jobs: [], beats: [], tasks: [] };
    setInterval(() => w.__phonePerf.beats.push(performance.now()), 32);
    new PerformanceObserver((list) =>
      w.__phonePerf.tasks.push(
        ...list
          .getEntries()
          .map((e) => ({ start: e.startTime, duration: e.duration })),
      ),
    ).observe({ entryTypes: ["longtask"] });
    const post = Worker.prototype.postMessage,
      terminate = Worker.prototype.terminate;
    Worker.prototype.postMessage = function (data: any, ...args: any[]) {
      if (data?.strategy === "classic3") {
        const job = {
          start: performance.now(),
          progress: [] as number[],
          done: 0,
          terminated: 0,
          guide: null as any,
        };
        w.__phonePerf.jobs.push(job);
        (this as any).__phoneJob = job;
        this.addEventListener("message", ({ data }) => {
          if (data.type === "progress") job.progress.push(data.fraction);
          if (data.type === "done") {
            job.done = performance.now();
            job.guide = data.instruction;
          }
        });
      }
      return (post as any).call(this, data, ...args);
    };
    Worker.prototype.terminate = function () {
      const job = (this as any).__phoneJob;
      if (job) job.terminated = performance.now();
      return terminate.call(this);
    };
  });
}
async function calibration(page: Page, setRate: (n: number) => Promise<void>) {
  await page.evaluate(() => {
    const w = window as any;
    w.__calibration = new Worker(
      URL.createObjectURL(
        new Blob(
          [
            `onmessage=()=>{let x=1;const start=performance.now();for(let i=0;i<3000000;i++)x=Math.sqrt(x+i%97)+Math.sin(i);postMessage({ms:performance.now()-start,checksum:x});}`,
          ],
          { type: "text/javascript" },
        ),
      ),
    );
  });
  const mainSample = () =>
    page.evaluate(() => {
      let x = 1;
      const start = performance.now();
      for (let i = 0; i < 3000000; i++)
        x = Math.sqrt(x + (i % 97)) + Math.sin(i);
      return { ms: performance.now() - start, checksum: x };
    });
  const sample = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const worker = (window as any).__calibration;
          worker.onmessage = (e: MessageEvent) => resolve(e.data.ms);
          worker.postMessage(1);
        }),
    );
  await setRate(1);
  await sample();
  await mainSample();
  const normalMain = [
    (await mainSample()).ms,
    (await mainSample()).ms,
    (await mainSample()).ms,
  ];
  const normal = [await sample(), await sample(), await sample()];
  await setRate(4);
  await sample();
  const throttled = [await sample(), await sample(), await sample()];
  const throttledMain = [
    (await mainSample()).ms,
    (await mainSample()).ms,
    (await mainSample()).ms,
  ];
  await page.evaluate(() => (window as any).__calibration.terminate());
  const median = (v: number[]) => v.sort((a, b) => a - b)[1],
    ratio = median(throttled) / median(normal);
  return {
    normal,
    throttled,
    ratio,
    normalMain,
    throttledMain,
    mainRatio: median(throttledMain) / median(normalMain),
    workerThrottled: ratio > 2.5,
  };
}
async function result(page: Page) {
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 45000,
  });
  await expect
    .poll(() =>
      page
        .getByTestId("customer-thread-result")
        .evaluate(
          (c: HTMLCanvasElement) =>
            c.getContext("2d")!.getImageData(500, 500, 1, 1).data[3],
        ),
    )
    .toBe(255);
  return page.evaluate(() => {
    const p = (window as any).__phonePerf,
      job = p.jobs.at(-1),
      end = performance.now();
    const beats = p.beats.filter((t: number) => t >= job.start && t <= end);
    const gaps = beats
      .slice(1)
      .map((t: number, j: number) => t - beats[j])
      .sort((a: number, b: number) => a - b);
    return {
      generationMs: end - job.start,
      workerMs: job.done - job.start,
      progress: job.progress,
      maxGapMs: Math.max(0, ...gaps),
      p95GapMs: gaps[Math.floor(gaps.length * 0.95)] ?? 0,
      longestTaskMs: Math.max(
        0,
        ...p.tasks
          .filter((t: any) => t.start >= job.start && t.start < end)
          .map((t: any) => t.duration),
      ),
      guide: job.guide,
      png: (
        document.querySelector(
          '[data-testid="customer-thread-result"]',
        ) as HTMLCanvasElement
      ).toDataURL(),
    };
  });
}
for (const index of [0, 3, 4, 5] as const)
  test(`4x page CPU mobile real classic3: ${photoCases[index].name}`, async ({
    page,
    context,
  }, info) => {
    test.setTimeout(240000);
    const out = newEvidenceRoot(
      `output/current-phone-performance/${info.project.name}/${photoCases[index].name}`,
    );
    mkdirSync(out, { recursive: true });
    await instrument(page);
    await page.goto("/");
    await english(page);
    // Role-name searches walk the entire accessibility tree. CPU profiling showed
    // those driver queries competing with the UI during this timed interval.
    // Keep real, visible clicks and the same label/latency/pixel assertions.
    const action = page.locator("button.customer-main-action");
    const cdp = await context.newCDPSession(page),
      setRate = async (n: number) => {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: n });
      },
      calibrated = await calibration(page, setRate);
    // Calibrate both. This Chrome only supports page CPU emulation; never label the worker as 4x if it is not.
    writeFileSync(
      out + "/calibration.json",
      JSON.stringify(calibrated, null, 2),
    );
    expect(
      calibrated.mainRatio,
      "Main-thread CPU throttle calibration",
    ).toBeGreaterThan(2.5);
    const initialJs = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((e) => /\.js(?:\?|$)/.test(e.name))
        .map((e) => ({
          url: new URL(e.name).pathname,
          bytes: (e as PerformanceResourceTiming).encodedBodySize,
        })),
    );
    expect(
      initialJs.some((e) =>
        /\/(CustomerHub|CraftStudio|GridStudio|PaintStudio|CreateScreen)-/.test(
          e.url,
        ),
      ),
    ).toBe(false);
    await setRate(1);
    await gallery(page, photoCases[index]);
    if (photoCases[index].shape !== "circle")
      await page
        .getByRole("button", {
          name: photoCases[index].shape === "heart" ? "Heart" : "Square",
          exact: true,
        })
        .click();
    await expect(action).toHaveText("Create");
    if (index === 0) {
      await setRate(4);
      await action.click();
      await expect
        .poll(() =>
          page.locator(".customer-progress progress").getAttribute("value"),
        )
        .not.toBe("0");
      await expect(action).toHaveText("Cancel");
      const t = Date.now();
      await action.click();
      const cancellationMs = Date.now() - t;
      expect(cancellationMs).toBeLessThan(700);
      await expect(
        action,
      ).toBeEnabled();
      await expect(action).toHaveText("Create");
      expect(
        await page.evaluate(() => {
          const j = (window as any).__phonePerf.jobs.at(-1);
          return j.terminated > 0 && !j.done;
        }),
      ).toBe(true);
      writeFileSync(
        out + "/cancel.json",
        JSON.stringify({ cancellationMs, terminated: true }),
      );
      await setRate(1);
    }
    await action.click();
    const baseline = await result(page);
    await page
      .getByRole("button", { name: "Adjust again", exact: true })
      .click();
    await setRate(4);
    await action.click();
    await expect(
      action,
    ).toBeVisible();
    await expect(action).toHaveText("Cancel");
    const menu = page.getByTestId("customer-menu"),
      start = Date.now();
    await menu.locator("summary").click();
    await expect(menu).toHaveAttribute("open", "");
    const menuLatencyMs = Date.now() - start;
    await menu.locator("summary").click();
    const slow = await result(page);
    writeFileSync(
      out + "/report.json",
      JSON.stringify(
        {
          calibrated,
          initialJs,
          baseline: { ...baseline, png: undefined, guide: undefined },
          throttled: { ...slow, png: undefined, guide: undefined },
          sequenceHash: slow.guide.sequenceHash,
          menuLatencyMs,
          conservativeFourTimesEstimateMs:
            slow.generationMs +
            (calibrated.workerThrottled ? 0 : 3 * slow.workerMs),
          estimateIsPhysicalPhoneMeasurement: false,
        },
        null,
        2,
      ),
    );
    expect(slow.guide.sequenceHash).toBe(baseline.guide.sequenceHash);
    expect(slow.png).toBe(baseline.png);
    expect(slow.guide).toMatchObject({
      algorithm: "classic-greedy/3",
      params: { resolution: 500 },
      metrics: { lines: 3000 },
    });
    expect(slow.guide.profile.pins).toHaveLength(240);
    expect(slow.generationMs).toBeLessThan(20000);
    // The extrapolation is recorded as a limitation, never a measured 4x worker result.
    expect(slow.progress.length).toBeGreaterThan(2);
    expect(slow.maxGapMs).toBeLessThan(1000);
    expect(slow.p95GapMs).toBeLessThan(150);
    expect(menuLatencyMs).toBeLessThan(700);
    await page.screenshot({ path: out + "/result.png", fullPage: true });
    await setRate(1);
  });
