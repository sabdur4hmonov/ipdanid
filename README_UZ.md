# Ip Rasm — yuklab olish va sinash

Node.js **24 LTS** kerak. GitHub’da `feat/full-roadmap` branchini tanlab **Code → Download ZIP** bosing va arxivni alohida papkaga oching. Yoki:

```powershell
git clone --branch feat/full-roadmap --single-branch https://github.com/sabdur4hmonov/ipdanid.git
cd ipdanid
npm ci
npm run build -- --outDir output/phase15-dist
node scripts/start-testable-web.mjs --name release-candidate
```

Terminalda chiqqan manzilni brauzerda oching. Terminalni ochiq qoldiring. Bu yangi mahalliy sinov bazasi; eski server yoki hisoblar ko‘chirilmaydi. Uchta test kit kodi va mahalliy Admin tokeni faqat kompyuteringizdagi `output/phase15/manual-testing.txt` faylida bo‘ladi. Uni boshqalarga yubormang. Launcher mavjud sinov nusxasini qayta yozmaydi va eski serverlarni qayta ishlatmaydi.

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
- Macdagi iPhone build/imzo/TestFlight: [iOS yo‘riqnomasi](docs/IOS_UZ.md).
- Fizik taxta: [o‘lcham va teshik sinovi](docs/PHYSICAL_BOARD_UZ.md).

Web va keyingi app bir HTTPS API va bazaga ulanganda bir hisobdan foydalanadi. GitHub ZIP ichida shaxsiy suratlar, bazalar, parollar, tayyor `node_modules` yoki lokal APKlar yo‘q; build kompyuteringizda yaratiladi.

## Joriy holat

Bu ishlayotgan rivojlantirish nusxasi. Qolgan CODE vazifalari [auditda](docs/REMAINING_WORK.md), aniq keyingi qadam [progressda](AGENT/PROGRESS.md). Barcha roadmap bandlari tugagan yoki har bir suratning o‘xshashligi qabul qilingan deb hisoblamang. Hozirgi asosiy surat oqimi va hisob sinovlari bo‘yicha bajarilgan tekshiruvlar progressda yozilgan.

Tekshirish: `npm test -- --testTimeout=30000`, `npm run build -- --outDir output/phase15-dist`. To‘liq joriy mahsulot brauzer matritsasi: `node scripts/run-release-e2e.mjs`; bu kompyuterda o‘rnatilgan Chrome, yetarli RAM va bo‘sh ajratilgan portlar kerak. Har fayl/platforma yangi server oladi, eski hisobotlar saqlanadi. Xato bo‘lsa yangi natija papkasidagi `matrix.json` va oxirgi job hisobotini ko‘ring. Davom ettirish: `node scripts/run-release-e2e.mjs --resume=TEST_RESULTS_PAPKASI`; web build o‘zgargan bo‘lsa yangi to‘liq matritsa kerak.

To‘liq lokal qabul matritsasidagi ayrim suratlar GitHub ZIPga ataylab kirmaydi. Yangi nusxaning faqat repodagi ochiq sinov rasmlari bilan tekshiruvi: builddan keyin `IP_RASM_TEST_WEB_DIR=output/phase15-dist` muhitini sozlab `npm run test:e2e:ci` bajaring. Playwright brauzeri oldindan tayyor bo‘lsin. Surat yuklash va ilovani oddiy ishlatish uchun bu lokal qabul rasmlari kerak emas.

Yig‘ishda oddiy ovozli yo‘riqnoma va Dam olish mavjud. Mutaxassis rejimidagi mahalliy ovozli buyruqlar Android13+ uchun ixtiyoriy, rasm bilan qadam solishtirish esa qo‘lda: [ovozli buyruqlar](docs/ASSEMBLY_COMMANDS_CHECKPOINT.md), [taxta rasmlari](docs/ASSEMBLY_PHOTOS_CHECKPOINT.md). Qurilmagagina tegishli taxta rasmlari serverga/hisob tiklashga kirmaydi. Android ilovasi o‘z ma’lumotini Auto Backupga qo‘shishni o‘chiradi; bu telefon/OSning barcha nusxa yoki qo‘lda ko‘chirishlarini boshqaradi degan da’vo emas.


Instagram sinov kodi va do‘kon/dostavka: [INSTAGRAM_TRIAL_UZ.md](docs/INSTAGRAM_TRIAL_UZ.md). Kod faqat raqamli yig‘ish huquqi; jismoniy kit/dostavka alohida. Kampaniya o‘chiq, jo‘natish egasi tomonidan.
