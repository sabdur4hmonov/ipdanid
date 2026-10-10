import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const out = "output/simple-flow";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, viewport, isMobile] of [
    ["desktop", { width: 1280, height: 900 }, false],
    ["mobile", { width: 412, height: 915 }, true],
  ]) {
    const context = await browser.newContext({ viewport, isMobile, hasTouch: isMobile });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4183/");
    await page.getByLabel("Language").selectOption("uz");
    await page.getByRole("button", { name: "Galereyadan yuklash", exact: true }).waitFor();
    const count = await page.locator("main button:visible").count();
    if (count !== 2) throw Error(`Unexpected initial actions: ${count}`);
    await page.screenshot({ path: `${out}/start-uz-${name}.png`, fullPage: true });
    await context.close();
  }
} finally {
  await browser.close();
}
const unit = JSON.parse(readFileSync("output/simple-flow-unit.json", "utf8"));
const tests = JSON.parse(readFileSync("output/simple-flow-browser.json", "utf8").replace(/^\uFEFF/, ""));
const apk = JSON.parse(readFileSync(`${out}/build-evidence.json`, "utf8"));
if (!unit.success || tests.stats.unexpected || tests.stats.skipped || tests.stats.expected !== 20)
  throw Error("Final verification is not complete");
writeFileSync(`${out}/report.html`, `<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ip Rasm · sodda oqim</title><style>body{font:16px system-ui;margin:24px auto;padding:0 20px;max-width:1080px;color:#263c33;background:#f7f7f2}h1{font-size:30px}p{line-height:1.6}a{color:#173f35}section{display:flex;align-items:start;gap:24px;flex-wrap:wrap}figure{margin:0;flex:1;min-width:280px}img{max-width:100%;border:1px solid #ddd;border-radius:12px}figcaption{margin:12px 0}code{overflow-wrap:anywhere}</style><h1>Rasmga olish yoki galereyadan yuklash</h1><p>Boshlang‘ich ekranda ikki asosiy tugma. Surat tanlangach, uni moslash va haqiqiy ip yo‘lini hisoblash chiqadi. Oq fon qurilmada tayyorlanadi; kerakli batafsil sozlamalar yopiq bo‘limlarda. Loyihalar, progress va eksportlar saqlangan.</p><p><a href="http://127.0.0.1:4183/">Ilovani sinash</a> · <a href="../mobile/ip-rasm-simple-flow-debug.apk">Yangi Android APK</a> · <a href="../strand-quality/report.html">Avvalgi ip sifati taqqoslanishi</a></p><section><figure><img src="start-uz-mobile.png" alt="Telefon o‘lchamida ikki surat tugmasi"><figcaption>Telefon o‘lchamidagi brauzer</figcaption></figure><figure><img src="start-uz-desktop.png" alt="Kompyuterda sodda boshlang‘ich ekran"><figcaption>Kompyuter brauzeri</figcaption></figure></section><h2>Tekshiruv</h2><p>${unit.numPassedTests} mavjud test va ${tests.stats.expected} desktop/touch ssenariy o‘tdi. APK ichidagi ${apk.verifiedDistAssets} web fayli yakuniy build bilan aynan teng. APK hali telefonga o‘rnatilmadi.</p><p>Portret sifati hali perfect emas: burun/lab detallari, kesishuvchi iplar, turli suratlar va haqiqiy yig‘ish sinovi ochiq. Ushbu o‘zgarish interfeysni soddalashtiradi; ip algoritmi yoki material defaultlarini o‘zgartirmaydi.</p><p>APK SHA-256: <code>${apk.apkSha256}</code></p></html>`, "utf8");
console.log("Private UZ desktop/mobile previews and verified review report saved.");
