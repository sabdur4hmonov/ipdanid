"""Create an owner handoff from verified synthetic evidence; no private config/database/photo copying."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)
evidence = root / 'output/product-evidence'
browser = json.loads((evidence / 'final-browser.json').read_text())['stats']
assert browser['expected'] == 10 and browser['unexpected'] == 0
assert 'OK (3 tests)' in (evidence / 'device-final-test.txt').read_text()
http = json.loads((evidence / 'customer-http.json').read_text())
assert http['passed'] and http['checks'] == 37
device = json.loads((evidence / 'device/product-device-core.json').read_text())
apk = root / 'output/mobile/ip-rasm-product-debug.apk'
build = json.loads((root / 'output/mobile/ip-rasm-product-build-evidence.json').read_text())
assert hashlib.sha256(apk.read_bytes()).hexdigest() == build['apkSha256']
shutil.copy2(apk, out / apk.name)
shutil.copy2(root / 'docs/PRODUCT_COMPLETION_CHECKPOINT.md', out / 'CHECKPOINT.md')
for name in ['product-device-assembly.png', 'product-device-customer.png']:
    shutil.copy2(evidence / 'device' / name, out / name)
summary = {'browser': browser, 'http': http, 'device': device,
           'nativeTests': 3, 'apkSha256': build['apkSha256'],
           'portraitSolverChanged': False, 'productionActive': False,
           'physicalAcceptance': False}
(out / 'evidence.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
html = '''<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ip Rasm · tekshirilgan yangi bosqich</title><style>
*{box-sizing:border-box}body{margin:0;background:#f7f7f0;color:#234c40;font:17px/1.6 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:40px 24px}h1{font:48px Georgia,serif;margin:10px 0}h2{font-size:23px}p{max-width:75ch}.badge{font-size:13px;text-transform:uppercase;letter-spacing:2px}.card{background:#fff;border:1px solid #dce2d4;border-radius:20px;padding:24px;margin:20px 0}.actions{display:flex;flex-wrap:wrap;gap:12px}a{color:inherit}.actions a{background:#234c40;color:white;border-radius:10px;padding:12px 18px;text-decoration:none}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px}.stats strong{display:block;font-size:38px;font-weight:500}.photos{display:flex;flex-wrap:wrap;gap:24px}.photos figure{margin:0;max-width:280px}.photos img{width:100%;border:1px solid #ddd;border-radius:12px}figcaption{font-size:14px}.note{background:#fff5da}.fine{font-size:13px;overflow-wrap:anywhere}li{margin:8px 0}@media(max-width:600px){h1{font-size:36px}main{padding:24px 16px}}
</style><main><div class="badge">2026-10-08 · local development</div><h1>Ip Rasm: web va Android</h1>
<p>Hisob, lokal buyurtma va support, qo‘llanma navigatsiyasi hamda haqiqiy telefon sinovlari qo‘shildi. Bu tekshirilgan yangi bosqich; to‘liq mahsulot va portret sifati hali qabul qilinmagan.</p>
<div class="actions"><a href="http://127.0.0.1:4183/">Yangi web sahifa</a><a href="ip-rasm-product-debug.apk" download>Android APK</a><a href="CHECKPOINT.md">Davom ettirish hujjati</a></div>
<section class="card stats"><div><strong>3</strong>Haqiqiy telefon testi</div><div><strong>10</strong>Yakuniy brauzer testi</div><div><strong>37</strong>HTTP tekshiruvi</div><div><strong>16</strong>APK fayli aynan mos</div></section>
<section class="card"><h2>Ishlaydigan yangi funksiyalar</h2><ul><li>Hisobga kirish, tiklash kaliti, kodlar va kredit sovg‘alari.</li><li>Lokal katalog, savat, buyurtma, bekor qilish, qaytarish va support javoblari.</li><li>Himoyalangan lokal admin: katalog/qoldiq, kodlar, buyurtma va audit.</li><li>Yo‘riqnoma va progressni aniq tanlab serverga saqlash yoki qaytarib olish; ziddiyatda avtomatik ustiga yozilmaydi.</li><li>50 qadamli sahifalar, bookmark, papkalar, nom/hash qidiruvi va saqlash holati.</li><li>UZ/RU/EN interfeys; original surat serverga yuborilmaydi.</li></ul></section>
<section class="card"><h2>Telefonda tekshirilgan</h2><p>23117RA68G, Android 16: ilovaning o‘z namunasi → haqiqiy Worker → saqlash → progress 10 → bookmark → Activity qayta yaratilishi → aynan bir xil hash/progress → native JSON/PDF. Hisob va lokal support qayta ochilganda saqlanadi.</p><p>Namunada 501 qadam. Telefon PDF’ining 19 sahifasi, barcha qadamlar, hash va progress JSON bilan mos. Taxminan 5.7 soniya — faqat shu namuna uchun; portret benchmarki emas. 74 ta unit test turli yakunlangan runlarda o‘tdi; barchasi bitta final run deb ko‘rsatilmaydi.</p>
<div class="photos"><figure><img src="product-device-assembly.png" alt="Haqiqiy Android ilovasida yig‘ish oynasi"><figcaption>Android: yig‘ish oynasi</figcaption></figure><figure><img src="product-device-customer.png" alt="Haqiqiy Android ilovasida lokal support"><figcaption>Android: lokal support</figcaption></figure></div></section>
<section class="card note"><h2>Ochiq qolgan ishlar</h2><p>Burun/lab va kesishuvchi iplar sifati, turli portretlar, haqiqiy ip bilan yig‘ish va printer masshtabi; native foto tanlash/ruxsat/ovoz/offline sinovlari va iOS; haqiqiy to‘lov/yetkazish/xabarlar hamda qolgan engine va keng roadmap.</p><p>Hisob/katalog/buyurtma/support — lokal sandbox. Pul olinmaydi, tovar yoki tashqi xabar yuborilmaydi. Telefonda lokal server uchun USB va <code>adb reverse tcp:4311 tcp:4311</code> kerak. Mahalliy yaratish/progress/eksport ilova ichida ishlaydi.</p></section>
<p class="fine">APK SHA-256: HASH<br>Push, nashr yoki shaxsiy suratni tashqi serverga yuklash qilinmagan.</p></main></html>'''
(out / 'report.html').write_text(html.replace('HASH', build['apkSha256']), encoding='utf-8')
print(json.dumps({'report': str(out / 'report.html'), 'apkSha256': build['apkSha256']}))
