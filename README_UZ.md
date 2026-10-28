# Ip Rasm — yuklab olish va ishlatish

Foto → oq fondagi moslash → haqiqiy ipli ko‘rinish → quti kodi bilan yig‘ish. Doira, Kvadrat, Yurak; odam, hayvon, buyum va lotin/kirill/arabcha yozuv. Rasmni surish, kattalashtirish, burish va qaytarish mumkin.

## Shu kompyuterdagi tayyor nusxa — 29.10.2026

- Sayt:**http://127.0.0.1:4217/**.
- APK:**output/mobile/ip-rasm-phase16-20261029-be6e489bff81-debug.apk**; lokal API4657.
- 3 ta shaxsiy quti kodi/Admin: [output/phase16/manual-testing.txt](output/phase16/manual-testing.txt). Kodlar va kalitlarni ommaga yubormang.

Har quti kodi3 ta alohida to‘liq yo‘riqnoma beradi. Ipli ko‘rinish bepul, bajarish yo‘li ochishgacha yopiq. Avval ochilgan ishni qayta ochish, boshqa qurilmada davom etish yana kredit olmaydi. Sayt va APK bir production HTTPSAPIga ulanganda bir hisob/loyiha bilan ishlaydi. Yangi hisoblash internet/serverni talab qiladi; avval ochilgan yig‘ishni offline davom ettirish mumkin. Tayyor qora-oq hisoblash rasmi serverga yuborilishi oynada tushuntiriladi; asl suratning hisob zaxirasi alohida rozilik bilan.

741 ta unit,348 joriy desktop/mobil holat, alohida7himoyalangan oqim, offline davom etish, Admin/dastavka va APK fayl/imzosi tekshirildi.1 000 000 ta yopiq3yig‘ishli kod tayyor; GitHub/APKga kirmaydi. Mayda burun detali hali ochiq;100% foto tengligi yoki haqiqiy telefon/taxta qabul sinovi da’vo qilinmaydi. Batafsil:[AGENT/FINAL_REPORT.md](AGENT/FINAL_REPORT.md).

## Yangi kompyuterda development sinovi

Node.js24 LTS kerak. GitHub’da [feat/full-roadmap](https://github.com/sabdur4hmonov/ipdanid/tree/feat/full-roadmap)ni tanlab Code → Download ZIP qiling, yoki:

```powershell
git clone --branch feat/full-roadmap --single-branch https://github.com/sabdur4hmonov/ipdanid.git
cd ipdanid
npm ci
npm run build -- --outDir output/phase15-dist
node scripts/start-testable-web.mjs --name release-candidate
```

Terminaldagi yangi manzilni oching, terminalni ochiq qoldiring. Launcher bo‘sh port/alohida testbazasi va3 test kodini yaratadi; manzil hamda kodlar terminal ko‘rsatgan lokal manual-testing.txtda. Mavjud nusxani qayta yozmaydi. Bu developmentning mahalliy moslik rejimi; production uchun pastdagi himoyalangan yo‘l ishlatiladi. Clone shaxsiy suratlarni, millionlik baza yoki kalitlarni olmaydi.

Tekshirish:

```powershell
npm test -- --testTimeout=30000
npm run check:locales
npm run build -- --outDir output/phase15-dist
```

Ochiq CI brauzer testlari uchun Playwright brauzeri oldindan tayyor bo‘lsin; builddan keyin IP_RASM_TEST_WEB_DIR=output/phase15-dist bilan npm run test:e2e:ci ishlaydi. To‘liq ichki foto regressiyasi mahalliy maxfiy test rasmlariga ham tayanadi; ular ZIPga kiritilmagan. Oddiy surat yuklash uchun bu fayllar kerak emas.

## Production server va Android

[DEPLOY_VPS_UZ.md](docs/DEPLOY_VPS_UZ.md):domen→DNS→VPS→.env→scripts/deploy.sh yoki docker compose up -d. Docker web VITE_SERVER_GENERATION=1/API SERVER_GENERATION=1 rejimini birga yoqadi; SQLite volume, Caddy HTTPS, backup va parol xeshi bilan Admin tayyor. [PROTECTED_GENERATION_UZ.md](docs/PROTECTED_GENERATION_UZ.md)maxfiy yo‘l va offline chegarasini tushuntiradi. BrauzerJavaScriptini butunlay yashirib bo‘lmaydi; server kalitlarini VITE_*ga yozmang.

Millionlik ishlatilmagan toza zaxira va uning ayni pepper/imzosini ko‘chirish/chop etish:[KIT_MILLION_UZ.md](docs/KIT_MILLION_UZ.md). Seed qilingan sinov bazasini real savdoga ko‘chirmang, mavjud mijozlar bazasini almashtirmang.

Android:[APK_SERVER_AND_SIGNING_UZ.md](docs/APK_SERVER_AND_SIGNING_UZ.md). Lokal4657 API uchun keyingi USB sinovda adb reverse tcp:4657 tcp:4657 yoki Admin’dagi Server manzili orqali o‘z HTTPSAPI ishlatiladi. Egasi release keystore yaratgach scripts/build-release.ps1 uni ishlatadi; kalit Gitga kirmaydi. iOS:[IOS_UZ.md](docs/IOS_UZ.md).

## Admin va buyurtmalar

Menyu → Hisob/Admin → Boshqaruv. Lokal token shaxsiy manual-testing.txtda; productionda o‘z parolingiz bilan kirasiz.

- Kit kodlari:100 tagacha onlayn batch, PDF/QR, kreditlar; millionlik zaxiraning chiqarilgan/reja/holati, maxfiy kodlar ro‘yxatisiz. Telefon jadvalini yoniga surish mumkin.
- Narxlar va Buyurtmalar:haqiqiy narx/ombor, buyurtma holati, mijozga ko‘rinadigan ma’lumotlar.
- Dostavka:olib ketish/kuryer, faol hududlar, narx va kuzatuv ma’lumoti. Telegram/telefoningizni keyin o‘zingiz kiritasiz; aloqa ma’lumoti o‘ylab topilmagan.
- E’lonlar/push:ilova ichidagi e’lonlar ishlaydi; haqiqiy FCM uchun [PUSH_NOTIFICATIONS_UZ.md](docs/PUSH_NOTIFICATIONS_UZ.md).

Hozir to‘lovlar sandbox:haqiqiy pul yechilmaydi. Merchant kalitlari:[PAYMENTS_UZ.md](docs/PAYMENTS_UZ.md). Naqd/olib ketish oqimi saqlangan. Instagram obunachilari sinov kampaniyasi:[INSTAGRAM_TRIAL_UZ.md](docs/INSTAGRAM_TRIAL_UZ.md); jo‘natish egasi tomonidan, keyin faollashtiriladi.

## Yig‘ish va fizik kit

Standart500 × 500 mm oq taxta, Doira460 mm, har shaklda240 mix, qora0.12 mm ip. Aynan tanlangan profil andozasini100%chiqaring,50 mm kalibrni o‘lchang. [PHYSICAL_BOARD_UZ.md](docs/PHYSICAL_BOARD_UZ.md),[BUILD_TODAY_UZ.md](docs/BUILD_TODAY_UZ.md).

Yig‘ishda katta sektor yo‘li, oldingi/keyingi, tasdiq, Dam olish va saqlangan joydan davom etish mavjud. Qurilma TTS ishlaydi; haqiqiy kliplar qo‘shilganda avtomatik o‘tadi:[VOICE_RECORDING_UZ.md](docs/VOICE_RECORDING_UZ.md),[VOICE_RECORDING_LIST.csv](docs/VOICE_RECORDING_LIST.csv). Qurilmagagina tegishli taxta rasmlari avtomatik serverga ko‘chmaydi.

Origin’da main yo‘q, PR ochilmagan. Egasi bazani tanlagach feature→main PR mumkin:[PR_BASE_UZ.md](docs/PR_BASE_UZ.md). Agent main yaratmaydi, push yoki merge qilmaydi.
