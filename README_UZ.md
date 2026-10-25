# Ip Rasm — yuklab olish va sinash

Node.js **24 LTS** kerak. GitHub’da `feat/full-roadmap` branchini tanlab **Code → Download ZIP** bosing va arxivni alohida papkaga oching. Yoki:

```powershell
git clone --branch feat/full-roadmap --single-branch https://github.com/sabdur4hmonov/ipdanid.git
cd ipdanid
npm ci
npm run build -- --outDir output/phase15-dist
node scripts/start-testable-web.mjs
```

Terminalda chiqqan manzilni brauzerda oching. Terminalni ochiq qoldiring. Bu yangi mahalliy sinov bazasi; eski server yoki hisoblar ko‘chirilmaydi. Test kit kodi va mahalliy Admin tokeni faqat kompyuteringizdagi `output/phase15/testable-web/manual-testing.txt` faylida bo‘ladi. Uni boshqalarga yubormang. Launcher birinchi ishga tushirish uchun: mavjud sinov papkasini qayta yozishdan bosh tortadi.

## Rasm bilan sinash

Taxtani hozir yasash uchun aniq500mm/A4/sektor paketini chiqarish va birinchi ipgacha yo'l: [Birinchi taxtani yasash](docs/BUILD_TODAY_UZ.md). Har bir andozada50mm masshtab tekshiruvi bor.

1. Galereyadan rasm tanlang. Doira, Kvadrat yoki Yurakni bosing.
2. Oq fondagi rasmni suring, kattalashtiring yoki aylantiring. Zarur bo‘lsa fon qirqimini tuzating. Yuz va yelkani qayerda qoldirishni o‘zingiz tanlaysiz.
3. **Yaratish** bosing va haqiqiy ip yo‘nalishidan chizilgan natijani ko‘ring.
4. **Yig‘ishni boshlash** orqali test kit kodini kiriting. Keyingi/oldingi qadam, ovoz va dam olishdan keyin davom ettirishni sinang.
5. Hisobga kirib loyihani sinxronlang. Suratni boshqa qurilmada tahrirlash uchun uning shaxsiy zaxirasiga alohida rozilik kerak. Faqat yo‘riqnomani saqlash asl suratni saqlamaydi.

Menyu → **Hisob / Admin** orqali hisob, do‘kon, buyurtmalar va boshqaruv ochiladi. Admin uchun mahalliy fayldagi tokenni kiriting; kit kodlari, narxlar, buyurtmalar va e’lonlarni shu yerda boshqarasiz. Mahalliy to‘lov/dostavka — sandbox, haqiqiy pul olinmaydi yoki jo‘natma yaratilmaydi.

## Server va keyingi app

- Domen, VPS, HTTPS va zaxira: [VPS yo‘riqnomasi](docs/DEPLOY_VPS_UZ.md).
- Click/Payme merchant kalitlari: [to‘lovlar](docs/PAYMENTS_UZ.md). Kalitlar faqat serverda; `VITE_*` ichiga yozmang.
- Ovoz fayllari: [ovoz yozish](docs/VOICE_RECORDING_UZ.md), [fayllar ro‘yxati](docs/VOICE_RECORDING_LIST.csv).
- APK, server manzili va egasining imzo kaliti: [Android yo‘riqnomasi](docs/APK_SERVER_AND_SIGNING_UZ.md).
- Fizik taxta: [o‘lcham va teshik sinovi](docs/PHYSICAL_BOARD_UZ.md).

Web va keyingi app bir HTTPS API va bazaga ulanganda bir hisobdan foydalanadi. GitHub ZIP ichida shaxsiy suratlar, bazalar, parollar, tayyor `node_modules` yoki lokal APKlar yo‘q; build kompyuteringizda yaratiladi.

## Joriy holat

Bu ishlayotgan rivojlantirish nusxasi. Qolgan CODE vazifalari [auditda](docs/REMAINING_WORK.md), aniq keyingi qadam [progressda](AGENT/PROGRESS.md). Barcha roadmap bandlari tugagan yoki har bir suratning o‘xshashligi qabul qilingan deb hisoblamang. Hozirgi asosiy surat oqimi va hisob sinovlari bo‘yicha bajarilgan tekshiruvlar progressda yozilgan.

Tekshirish: `npm test`, `npm run build`. Brauzer testlari uchun Playwright/Chrome va bo‘sh ajratilgan portlar kerak; mavjud serverga test yubormang.


Instagram sinov kodi va do‘kon/dostavka: [INSTAGRAM_TRIAL_UZ.md](docs/INSTAGRAM_TRIAL_UZ.md). Kod faqat raqamli yig‘ish huquqi; jismoniy kit/dostavka alohida. Kampaniya o‘chiq, jo‘natish egasi tomonidan.
