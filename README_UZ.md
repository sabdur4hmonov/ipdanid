## Phase16 — 28.10.2026, yakuniy tekshiruv davom etmoqda

Haqiqiy1000000ta yopiq3yig‘ishli quti kodi alohida shaxsiy bazada tayyor; GitHub/APKga kiritilmaydi. Oddiy oqimning himoyalangan server hisobi,Admin zaxira oynasi va buyurtma/dastavka avtomatik tekshirildi.733ta to‘liq sozlangan unit va yangi qo‘shimcha tekshiruvlar bilan738ta takrorlanmagan natija o‘tdi; yakuniy brauzer matritsasi/APK/yangi URLhali davom etadi. Burun sifati yaxshilandi yoki100%foto tengligi deyilmaydi. Eski4216sayt/APK o‘zgarmagan.

Production uchun [DEPLOY_VPS_UZ.md](docs/DEPLOY_VPS_UZ.md) yo‘lidan foydalaning: Docker web va API birga himoyalangan1rejimda ishlaydi. [PROTECTED_GENERATION_UZ.md](docs/PROTECTED_GENERATION_UZ.md) tayyor qora-oq rasmning rozilik bilan serverga yuborilishini va offline cheklovini tushuntiradi. [KIT_MILLION_UZ.md](docs/KIT_MILLION_UZ.md) haqiqiy yopiq bazani kalitlari bilan ko‘chirish/chop etish yo‘lini beradi. Yangi clone bu mahalliy maxfiy zaxirani olmaydi. Quyidagi oddiy yuklab-ochish yo‘li development uchun eski mahalliy moslik rejimidir; uni production himoyasi deb tushunmang. Yangilangan holat doim AGENT/PROGRESS.md birinchi Exact next step qismida.
## Sinovga tayyor nusxa — 27.10.2026

Sayt: **http://127.0.0.1:4216/**. Yangi quti kodi faqat shu kompyuterdagi `output/phase15/final-review/manual-testing.txt` faylida. Parol shart emas: bitta kod 3 ta alohida to‘liq yo‘riqnomani ochadi. Ipli ko‘rinishni ko‘rish bepul; avval ochilgan loyihaga qaytish yana kredit olmaydi.

APK: `output/mobile/ip-rasm-phase15-final-20261027-dbdc474e6f68-debug.apk`. Uning 121 ta fayli aynan yangi saytga teng. Avvalgi imzo va 95 ta eski APK saqlandi. Mahalliy API 4656; keyin telefon/HTTPSserverga ulash uchun `docs/APK_SERVER_AND_SIGNING_UZ.md`ni bajaring. Haqiqiy telefon hali sinalmagan.

687 ta kod sinovi,18 ta ochiq CI va38 ta joriy mahalliy brauzer holati o‘tdi. Dastlab 3 ta holat 15 soniyadan oshdi; kvadratning 4 ta holati aynan shu kod bilan qayta 9.3–9.9soniyada o‘tdi. Oldingi xatolar hisobotda saqlangan. Eski 346 ta sinov oldingi buildga tegishli. Surat bilan 100% tenglik va’da qilinmaydi; haqiqiy taxta va telefon qabul sinovi hali bor.

Manba: https://github.com/sabdur4hmonov/ipdanid/tree/feat/full-roadmap . Natijalar: `docs/PORTRAIT_SCORE_WINDOW_CHECKPOINT.md` va `docs/validation/phase15-20261027-followup.json`. Original suratlar faqat shu kompyuterda. Mahalliy taqqoslash: `output/quality-original-20261026/final-review.html`. PR yaratilmagan: repoda main bazasi yo‘q; egasi uchun aniq yo‘l `docs/PR_BASE_UZ.md`da. Domen/kalit/ovoz/taxta kabi tashqi ishlar ro‘yxati quyidagi yakuniy hisobotda. Boshqa sayt va APK haqidagi sanali yozuvlar tarixiy.

## Shu kompyuterdagi tayyor nusxa —2026-10-27

Sayt: http://127.0.0.1:4215/ . Quti kodi faqat mahalliy `output/phase15/portrait-review/manual-testing.txt`da. APK `output/mobile/ip-rasm-phase15-20261027-83b3e7b659b0-debug.apk`.679unit va346to‘liq desktop/mobil holat o‘tdi; CI dagi18ochiq brauzer sinovi lokal matritsaga ham kiradi. Dalil: [yakuniy software tekshiruvi](docs/RELEASE_CANDIDATE_CHECKPOINT.md), [sanitizatsiya qilingan JSON](docs/validation/phase15-20261027.json). Mayda detallar fotografiyaga teng emas, real telefon/taxta/public xizmatlar hali alohida tekshiriladi.

Yangi yuklangan kompyuter uchun pastdagi ishga tushirish yo‘lidan foydalaning; lokal preview kodlari GitHubga qo‘yilmagan. PR uchun repo main bazasi yo‘q: [egasi bajaradigan repo qadami](docs/PR_BASE_UZ.md).

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

Kompyuterda build uchun RAM yetmasa: GitHub → Actions → **Verify Ip Rasm** → ikkala tekshiruvi yashil bo‘lgan ayni manba commitining runini oching. **ip-rasm-web-sandbox** artifactini yuklang; undagi `verification.json` manba SHA sini yuklagan kod bilan solishtiring. Yangi papkada `npm ci`dan keyin artifactdagi `dist`ni hali mavjud bo‘lmagan `output/phase15-dist`ga joylang va yuqoridagi launcher buyrug‘ini bajaring. Oldingi ishlayotgan nusxani qayta yozmang. Artifact faqat sayt buildi va ochiq avtomatik hisobotlardan iborat; kit kodlari/rasmlar/baza berilmaydi. Joriy tekshirilgan nusxa dalili: [sayt topshirig‘i](docs/WEB_HANDOFF_CHECKPOINT.md).

## Rasm bilan sinash

Taxtani hozir yasash uchun aniq500mm/A4/sektor paketini chiqarish va birinchi ipgacha yo'l: [Birinchi taxtani yasash](docs/BUILD_TODAY_UZ.md). Har bir andozada50mm masshtab tekshiruvi bor.

1. Galereyadan rasm tanlang. Doira, Kvadrat yoki Yurakni bosing.
2. Oq fondagi rasmni suring, kattalashtiring yoki aylantiring. Zarur bo‘lsa fon qirqimini tuzating. Yuz va yelkani qayerda qoldirishni o‘zingiz tanlaysiz.
3. **Yaratish** bosing va haqiqiy ip yo‘nalishidan chizilgan natijani ko‘ring.
4. **Yig‘ishni boshlash** orqali test kit kodini kiriting. Keyingi/oldingi qadam, ovoz va dam olishdan keyin davom ettirishni sinang.
5. Hisobga kirib loyihani sinxronlang. Suratni boshqa qurilmada tahrirlash uchun uning shaxsiy zaxirasiga alohida rozilik kerak. Faqat yo‘riqnomani saqlash asl suratni saqlamaydi.

Menyu → **Hisob / Admin** orqali hisob, do‘kon, buyurtmalar va boshqaruv ochiladi. Admin uchun mahalliy fayldagi tokenni kiriting; kit kodlari, narxlar, buyurtmalar va e’lonlarni shu yerda boshqarasiz. Mahalliy to‘lov/dostavka — sandbox, haqiqiy pul olinmaydi yoki jo‘natma yaratilmaydi.

Har bir jismoniy qutiga alohida kit kodi beriladi. Parol/email shart emas; standart huquq3ta yangi to‘liq yo‘riqnoma. Ayni ishni qayta ochish kredit olmaydi. Natija rasmi bepul, ip yo‘li/qadamlar/ketma-ket video esa kit bilan ochiladi. Telegram va telefon buyurtma kontaktlari egasi keyin ma’lumot berganda qo‘shiladi.

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
