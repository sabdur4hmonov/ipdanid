# Ip Rasm — yakuniy hisobot, 2026-10-15

Branch: `feat/full-roadmap`, boshlang‘ich branch `feat/r1-r2-subjects`. Rejadagi mustaqil dasturlash, sinov va APK ishlari bajarildi. Surat sifati bo‘yicha v17 tajribasi rad etildi: o‘xshashlik yaxshilandi deb aytilmaydi, asosiy algoritm almashtirilmadi. Haqiqiy surat/taxta, QBRIX, ovoz yozuvlari va ishlab chiqarish serveriga bog‘liq ishlar quyida ochiq ko‘rsatilgan.

## Bosqichlar holati

| Bosqich | Bajarilgan va tekshirilgan | Qolgan yoki rad etilgan |
| --- | --- | --- |
| 0. Sinov xavfsizligi | Yangi alohida DB/portlar, himoyalangan yo‘llar, “Yana” navigatsiyasi testlari. Yakuniy to‘liq brauzer 176/176 va unit 232/232 o‘tdi. | Mustaqil ish qolmadi. Egasining `tmp/data`, DB va 4194-serveriga tegilmadi. |
| 1. Ochiq tadqiqot | `docs/COMPETITOR_WORKFLOW.md`, `docs/ALGORITHM_SURVEY.md`: ochiq kit jarayonlari, noma’lum/qarama-qarshi SKU ma’lumotlari, maqola/usul/litsenziya va gipotezalar. | Raqib kodi/rasmi ko‘chirilmadi, yopiq kit chetlab o‘tilmadi. Sifat ustunligi haqida dalilsiz xulosa yo‘q. |
| 2. Ip sifati | Muzlatilgan R 4 tashxis, hududiy xato, fit/routing, teri teksturasi; v17 va nazorat bir xil 55,440 fitting baholash bilan tekshirildi. Recovery va aniq eksport ishlaydi. | **v17 rad etildi**: teri tusi/coarse xatosi yomonlashgan. Yangi asosiy usul yo‘q. Qabul qilingan usul bo‘lmagani sabab unga bog‘liq samarali ip soni egri chizig‘i/soddalashtirish bajarilmadi. Burun/lab/o‘xshashlikning yangi yaxshilanishi tasdiqlanmagan. |
| 3. Umumiy yadro | Alohida yoqiladigan 18:1–3 odam, hayvon, buyum; tekshirilgan qismlar, har bir obyekt vazni, eng yomon obyekt tekshiruvi,320 aniqlik, haqiqiy Worker/checkpoint/player/eksport. Noto‘g‘ri holat ochiq rad etiladi. | Haqiqiy 2/3 odam, hayvon va buyum suratlaridagi o‘xshashlik hamda taxta qabulini egasi tekshiradi. Asosiy usul o‘zgarmagan. |
| 4. Matn va andozalar | Lotin/kirill/arab, offline OFL shrift va haqiqiy arab qo‘shilishi. To‘ldirilgan matn 18 va kontur mixlari 19, barcha ulovchi iplar, fizik koordinata, player/PDF/TXT/JSON, to‘rt til va hayvon/buyum andozalari tekshirildi. | Bir o‘tishli ingichka kontur xira bo‘lishi mumkin; o‘qilish/taxta hali qabul qilinmagan. Arab+lotin/kirill aralash bitta qator qo‘llanmaydi. Ism+portret ixtiyoriy kompozitsiyasi alohida tekshiriladigan koordinata tahrirchisi bo‘lmagani uchun qo‘shilmadi. Boshqa noma’lum material/taxta kitlari ko‘chirilmadi. |
| 5. Kit va kredit | Bitta hisobga kod, odatda 4 yig‘ish/muddatsiz; ixtiyoriy muddat/chegara, audit/huquq/rate limit, mahalliy QR/CSV. Bepul ko‘rinish; qadam/player/eksport bir kreditga. Imzolangan hisob+hash+qurilma ruxsati offline muddatsiz, qayta urinish/qayta berish ortiqcha olmaydi. HTTP 38/38 va UI o‘tdi. | Bu mijoz tarafidagi to‘siq, buzib bo‘lmas DRM emas. Keyingi server-generatsiya yo‘li hujjatlangan, hozir ishlamaydi. “30 kun” sarflanmagan kredit muddati, avtomatik oylik to‘ldirish emas. Jonli server/to‘lov yoqilmagan. |
| 6. QBRIX | Maxfiy input papkasi va `docs/QBRIX_COMPARE_HOWTO_UZ.md` tayyor. | **Egasi fayllari kutilmoqda**: asl surat/QBRIX natijasi yo‘q. `output/qbrix-compare/report.html` yaratilmagan; raqibdan yaxshiroq degan xulosa yo‘q. |
| 7. Ekran, ovoz, APK | `App.tsx` 337 qatorga ajratildi, haqiqiy ekranlar va bitta controller. Mobil qulf/tugmalar, offline va eski oqimlar tekshirildi. Ikki instruktor sloti, WAV/hash/ro‘yxat, audio/rate/cancel/kesh, TTS/matn fallback ishlaydi. APK/40 fayl/imzo tekshirildi,67 eski APK saqlandi. | **Haqiqiy ovozlar 0**,590 yozuv kerak. Sun’iy test tovushlari nutq emas, APKda yo‘q. Telefon/jismoniy chop sinovi bajarilmagan. Yangi pullik native kit uchun HTTPS backend/ishonch sozlanmagan. |

## Yakuniy tekshiruv dalillari

| Tekshiruv | Haqiqiy natija | Hisobot |
| --- | --- | --- |
| To‘liq unit |232/232 o‘tdi | `test-results/final-full-unit.json` |
| To‘liq Chrome desktop+mobile |176/176:88+88,26.6 daqiqa;0 skip/flaky/xato | `test-results/final-full-e2e/report.json` |
| Oxirgi matn tuzatishidan keyin |4/4 desktop+mobile,39.2 soniya; haqiqiy arab outline/target, review/player/offline, optik PDF, barcha mix nuqtalari, JSON/TXT | `test-results/final-lettering-controls/report.json` |
| Customer HTTP |37/37, restart/egalik | `output/product-evidence/customer-http.json`; alohida DB `test-results/customer-http-cEqyvP/` |
| Staff HTTP |67/67,6 rol/huquq/bekor qilish | `output/completion/staff-http.json`; alohida DB `test-results/staff-http-q0sj67/` |
| Kit HTTP |38/38, retry/kredit/imzo/restart | `test-results/kit-http-Fy4z00/report.json` |
| Production veb build | TypeScript+Vite 1955 modul o‘tdi; avvalgi chunk/dynamic-import ogohlantirishlari qolgan | `npm run build`; `dist/` |
| Android sync/offline assembly |2 daqiqa 8 soniyada muvaffaqiyatli;176 task:21 bajarildi,155 up-to-date | `docs/MOBILE_ROADMAP_CHECKPOINT.md` |
| APK tekshiruvi |40/40 dist fayl, aniq kompilyatsiya tarkibi, shrift/litsenziya, yangi usullar/manifest, eski imzo va 67 eski APK hash o‘tdi | `output/mobile/ip-rasm-full-roadmap-20261014-87d130777145-evidence.json` |

To‘liq 176 va 232 sinov oxirgi kichik interfeys tuzatishidan **oldin** o‘tdi. Keyin konturda ta’sir qilmaydigan iplar chegarasi yashirildi, to‘ldirilgan matnda qoldi. Algoritm/ketma-ketlik/hash o‘zgarmadi. Shu yakuniy buildda tegishli 4 brauzer holati alohida o‘tdi; ularni 180 noyob test yoki oxirgi kodda qayta bajarilgan to‘liq 176 deb ko‘rsatmaymiz. Mobil skrinshotda ortiqcha sozlama yo‘qligi, haqiqiy xira ip yo‘li nishondan alohidaligi va ko‘rinish sig‘ishi tekshirildi.

## Sifat tajribasi

`output/quality-r4/report.html` — tashxis. Muzlatilgan root24:1,852 ulanish,643.1466 m,247.6 taxminiy daqiqa. `output/local-texture-v17/report.html` — nazorat va nomzod; nomzod 1,863 ulanish/647.2598 m/249.07 daqiqa, nazorat 1,850/643.9969 m. Routing baholashlari alohida, barcha ulovchi iplar ko‘rinishda va hisobda bor.

Nomzod ortiqcha teksturani 4.66% kamaytirgan, ammo teri tusi 5.96% va coarse xatoni 8.92% yomonlashtirgan. Hududiy chegaradan o‘tmadi. Ko‘proq ip sarfi sifat yutug‘i deb ko‘rsatilmadi. Natija **REJECTED**, asosiy usulga o‘tmagan. Qabul mezonlari va shartli keyingi ish nega bajarilmagani `docs/QUALITY_CHECKPOINT.md` da. Eski rad etilgan tajribalar takrorlanmadi.

## APK

- App: `output/mobile/ip-rasm-full-roadmap-20261014-87d130777145-debug.apk`,35,976,072 bayt.
- SHA-256: `87d13077714591e342ad63e371936934a1266c0caa7f960c4baefc1c5c6cf2f5`.
- Instrumentation: `output/mobile/ip-rasm-full-roadmap-20261014-87d130777145-debug-androidTest.apk`; native kodi o‘zgarmagani sabab up-to-date chiqish, qurilmada bajarilmagan.
- Eski/yangi app/test sertifikati: `8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90`.
-67 tarixiy APK `output/mobile/roadmap-20261014-old-apks.json` bo‘yicha o‘zgarmagan; avvalgi Gradle APKlari oldindan arxivlangan. Nomdagi 14-oktabr turkum boshlangan sana, yakuniy app 15-oktabrda yig‘ilgan.

Bu debug APK. Telefonga o‘rnatilmadi, instrumentation ishga tushirilmadi, release/push/to‘lov/jonli savdo bajarilmadi. Public build konfiguratsiyasida `VITE_NATIVE_API_BASE` ulanmagan. Yangi pullik native unlock uchun HTTPS backend, doimiy imzo boshqaruvi va oldindan ishonilgan public key kerak; APKda jonli savdo tayyor deb aytilmaydi. Mahalliy brauzer kit oqimi tekshirilgan; bepul lokal generatsiya va eski qo‘llanmalar alohida ishlaydi.

## Egasi tekshiradigan qadamlar

Loyiha papkasida `npm run local` → http://127.0.0.1:4194. Mavjud serverni agent to‘xtatmagan; ishlayotgan bo‘lsa shu manzilni oching. Batafsil `AGENT/OWNER_TESTS.md` da.

1. Avvalgi loyihani oching: ketma-ketlik va yig‘ish qadami saqlansin.
2. Yangi suratni hisoblang: PNG/ko‘rinish/ip uzunligi/vaqt bepul. Qadam/player/PDF/TXT/JSON kit bilan ochilguncha yashirilsin. Bir natijani ochish bir kredit olsin, yangilash/offline/retry qayta olmasin. Maxfiy kod/parolni yubormang.
3. “Yana” → “Mozaika” → “Ip bilan yozuv”: `SALOM`, `МИР`, `سلام`; ikkala rejimda tekshirib tasdiqlang. Nishon va haqiqiy ipni alohida ko‘ring. Saqlash → Yig‘ish/eksport bir ketma-ketlikni saqlasin. Konturdagi ulovchi iplar ham yig‘iladi.
4. Hayvon/buyum andozasida haqiqiy chegara/ko‘z/tumshuqni belgilang; o‘zgarish tasdiqni bekor qilsin.2/3 odamning har birini tekshiring. Oddiy/kattalashtirilgan o‘xshashlik inson qabulini talab qiladi.
5. PDFni 100% hajmda chop etib 50 mm belgini o‘lchang, mixlarni taxtada tekshiring. QRni telefon bilan o‘qing. Bular jismoniy qabul, avtomatik brauzer testi emas.
6. Ovozda real instruktorlar yo‘qligi ochiq ko‘rinsin; qurilma ovozi yoki matn ishlasin. Yozuvlar kelgach haqiqiy offline/telefon ovozi tekshiriladi.

## Kutilayotgan materiallar va qarorlar

- Haqiqiy 2/3 odam, hayvon va buyum suratlari hamda taxta qabul natijalari. Suratlar tashqi saytga avtomatik yuborilmaydi.
- QBRIX: bir xil asl surat/kesish, ruxsat etilgan preview/guide va taxta/mix/material sozlamalari `comparison/qbrix/` ga. `docs/QBRIX_COMPARE_HOWTO_UZ.md` bo‘yicha; hisob yoki kit kodi kerak emas.
- Ikki alohida instruktorning rozilikli WAV yozuvlari: har biridaUZ 97/RU 101/EN 97, jami 590 PCM 16 mono 24 kHz. Hozir 0. Aniq matn/path `docs/VOICE_RECORDING_LIST.csv`, yo‘riqnoma `docs/VOICE_RECORDING_UZ.md`.
- Haqiqiy 1:1 chop, matn o‘qilishi, mix/QR va keyingi telefon qabul natijalari.
- Ishlab chiqarish HTTPS endpoint/domain, imzoga ishonch/backup/rotation va release/savdo qarorlari. Hozir credential yoki joylashtirish ishlatilmagan.

Qolgan mustaqil build/test ishlari tugagan. Aniq keyingi ish kelgan materialga bog‘liq; yo‘q ovoz/QBRIX/o‘xshashlik natijasini to‘qib bo‘lmaydi.

## Mahalliy commitlar

| Bosqich | Commitlar |
| --- | --- |
| 0 | `f7fab35`, `44b9f74`, `ec21ec3` |
| 1 | `3d914c0` |
| 2 | `c8c72b9`, `3d1c433`, `ed368e2` |
| 3 | `cb9b4a7`, `86feef4` |
| 4 | `0c362e6`, `9df4f9a`, `9dc9a4e` |
| 5 | `fa69c07`, `e42b84f` |
| 6 | `7caa381` |
| 7 ekran/ovoz | `8224221`, `cf38df2` |
| Yakuniy sinov/saqlash | `d93f364`, `218e572` |
| Oxirgi matn tuzatishi | `a385978` |
| APK dalillari | `b1dd7ea` |

Hisobot, oxirgi PROGRESS/LOG va RESUME alohida yakuniy mahalliy commitda saqlanadi; haqiqiy hashi `git log -1 --oneline` da. Push/tarixni qayta yozish yo‘q. `tmp/`, `output/`, suratlar, maxfiy kalitlar va DB fayllari commitga kirmagan.
