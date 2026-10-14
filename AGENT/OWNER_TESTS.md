# Egasi uchun sinovlar (agent shu yerga yozadi, o'zbekcha)

Har bir yozuv: sana, nima ochish kerak, nimani bosish kerak, nima bo'lishi kerak, natijani qayerga yozish kerak.

Saytni ochish: `Start-Ip-Rasm.cmd` → http://127.0.0.1:4194

---

## 2026-10-14 — 0-bosqich, sinovlar xavfsizligi

Hozircha egasidan qo‘lda tekshiruv talab qilinmaydi: bu bosqich test sozlamalarini o‘zgartiradi. Saytdagi eski loyihalar va yig‘ish qadamlari saqlanadi. To‘liq brauzer sinovi tugagach natija shu faylga yoziladi.

Keyingi ilova o‘zgarishlari uchun: loyiha papkasida `npm run local` orqali http://127.0.0.1:4194 ni oching. Mavjud 4194-serverni to‘xtatmang. Yangi tekshiruv ko‘rsatmalari quyida bosqichma-bosqich qo‘shiladi.

0-bosqich tugadi: 186 ta unit test va 154 ta kompyuter/mobil brauzer holati tekshirildi. Ilova ko‘rinishi va algoritmlari o‘zgarmadi; qo‘lda qo‘shimcha sinov talab qilinmaydi. Keyingi bosqichlar uchun quyida yangi ko‘rsatmalar yoziladi.

## 2026-10-14 — 1-bosqich, ochiq tadqiqot

Natijalar `docs/COMPETITOR_WORKFLOW.md` va `docs/ALGORITHM_SURVEY.md` da. Qo‘lda brauzer sinovi kerak emas. QBRIX bilan haqiqiy surat bo‘yicha taqqoslash 6-bosqichda alohida yoziladi.

## 2026-10-14 — R4 sifat tashxisi

`output/quality-r4/report.html` ni oching. Asl surat, maqsad, eski to‘liq ip ketma-ketligi va v16 ni bir xil o‘lchamda ko‘ring; pastdagi kattalashtirilgan ko‘z, burun, lab, jag‘ va sochni solishtiring. “Fit graph” yig‘ish qo‘llanmasi emas. Qaysi joy tanib bo‘lmasligini shu faylga yozing. Hozircha yangi usul qabul qilinmagan; oldingi loyihalar o‘zgarmadi. Bu ko‘rish uchun agent ishini kutish shart emas.

## 2026-10-14 — v17 tajribasi rad etildi

`output/local-texture-v17/report.html` ni ochib asl surat, eski natija, nazorat va yangi tajribani ko‘ring. Yangi usul ayrim ip teksturasini kamaytirdi, ammo teri tusini yomonlashtirdi va ip sonini oshirdi; shu sabab asosiy usulga qo‘shilmadi. Eski guide va qadamlarga o‘zgarish yo‘q. `candidate.json` faqat tajriba uchun: “Loyihalarim” orqali import qilsangiz qadami 0 dan boshlanishi, PDF/TXT/JSON shu ketma-ketlikni saqlashi kerak. Ish boshqa bosqichlarda davom etadi.

## 2026-10-14 — umumiy hisoblash yadrosi

1–3 odam, hayvon va buyum uchun yangi tajriba yadrosi tayyor; qo‘lda tanlash oynasi keyingi qadamda qo‘shiladi. Hozir asosiy tugmalar o‘zgarmadi. Keyin sifatni baholash uchun 2/3 odam tushgan, hayvon va buyumning aniq suratlari kerak bo‘ladi; sintetik sinovlar faqat ishlash mexanikasini tekshiradi. Agent bunga kutmasdan interfeys va keyingi bosqichlarni davom ettiradi.

## 2026-10-14 — 3-bosqich qo‘lda belgilash oynasi

`npm run local` → http://127.0.0.1:4194. Surat yuklang, turini “Hayvon” yoki “Buyum” tanlang. “Obyekt qismlari” ichida “Tajriba obyekt usulini ishlatish” ni yoqing. Suratning batafsil sozlamalarida obyekt va qismlar oynasini oching. Chegarani suring, tutqichdan kattalashtiring yoki foizlarini kiriting. “Qism qo‘shish” orqali ko‘z/tumshuq kabi haqiqiy joyni belgilang; har bir obyektni alohida tekshirganingizni belgilang. Ko‘pi bilan uchta obyekt bor.

Belgi o‘zgarsa tasdiq o‘chishi kerak. Kesish, fon, shakl yoki aniqlik o‘zgarsa yangi holat qayta tekshiriladi; eski suratga qaytsangiz faqat uning belgilari qaytadi. 1/2/3 odam uchun ham yangi usulni alohida yoqish mumkin; 320 aniqlik yashirincha 192 ga tushmasligi kerak. Hisoblang, har bir obyektni oddiy va kattalashtirilgan ko‘rinishda tekshiring. Oldingi hisobdan davom ettirilsa eng yomon obyekt tekshiruvi natijasi ko‘rsatiladi; bu o‘xshashlik tasdig‘i emas. PDF/TXT/JSON va yig‘ish oynasi aynan bitta ketma-ketlikni saqlashi kerak.

Asosiy usul o‘zgarmagan. Haqiqiy 2/3 odam, hayvon va buyum suratlaridagi o‘xshashlik hamda taxtada yig‘ish hali egasi tomonidan tekshirilmagan. Natijani shu faylga yozing; agent boshqa bosqichlarda davom etadi.

## 2026-10-14 — matn uchun aniq yo‘l yadrosi

Lotin, kirill va arab matnining haqiqiy shakli va mix koordinatalari tayyor. Kontur yo‘li har bir yopiq harf qismi orasidagi ulovchi ipni ham hisoblaydi; bu ip ko‘rinishda yashirilmaydi. Interfeys keyingi qadamda ulanadi. Arab harflarining qo‘shilishi avtomatik tekshirildi; jismoniy taxtada o‘qilishi hali egasi tekshiruvi hisoblanadi. Agent kutmay davom etadi.

## 2026-10-14 — yozuv va andozalarni tekshirish

`npm run local` → http://127.0.0.1:4194 → “Yana” → “Mozaika” → “Ip bilan yozuv”. `SALOM`, `МИР`, `سلام` ni alohida kiriting. “Harf konturida mixlar” yoki “To‘ldirilgan matn nishoni” tanlang. Batafsilda taxta o‘lchami va mix sonini belgilang, matnni tayyorlang, harflarni tekshiring va tasdiqlang. Bir qatorda arab va lotin/kirillni aralashtirish hozir qo‘llanmaydi. Mayda nuqtalar sig‘masa taxtani kattalashtiring yoki mixni kamaytiring.

Hisoblangan haqiqiy ip ko‘rinishini tayyor nishondan alohida solishtiring. Konturdagi ulovchi iplar ham yig‘iladi; bir martalik ingichka kontur xira ko‘rinishi mumkin. “Saqlash va yig‘ish” orqali qadamlar 0 dan boshlansin. PDF/TXT/JSON oling. PDFni 100% hajmda chiqaring, 50 mm chizg‘ichni o‘lchang va mix nuqtalarini taxtada tekshiring. Internetni o‘chirib saqlangan loyihani va yangi arab yozuvini tayyorlashni tekshiring. Oddiy/kattalashtirilgan o‘qilishi va haqiqiy taxtadagi natijani shu faylga yozing; avtomatik sinovlar buni tasdiqlamaydi.

“Hayvon andozasi” / “Buyum andozasi” Yaratish oynasida yangi umumiy usulni alohida yoqadi. Surat va barcha haqiqiy qismlar yana tekshiriladi. Ism+portret aralashmasi hali qo‘shilmagan; agent keyingi bosqichlarda davom etadi.

## 2026-10-14 — kit server yadrosi

Yangi kit kodi bitta hisobga bog‘lanadi, odatda to‘rtta natijani ochadi va muddatsiz. Qayta bosish bir natija uchun yana kredit sarflamaydi. Ochilgan natija muddatsiz qoladi; ixtiyoriy muddat faqat ishlatilmagan kreditga taalluqli. Hozir server sinovlari tugadi; qulf, kod oynasi va chop etiladigan QR keyingi qadamda ulanadi. Egasi hozir hech narsa yuborishi shart emas; agent davom etadi.
