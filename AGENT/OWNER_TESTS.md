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

## 2026-10-14 — kit qulfini va QR ni tekshirish

Yangi versiyada `npm run local` orqali yangi natija hisoblang va saqlang. Oldindan ko‘rish, PNG, ip uzunligi va vaqt bepul; qadamlar/PDF/TXT/JSON kit krediti ochilguncha ko‘rinmasin. Avvalgi saqlangan/import qilingan eski qo‘llanmalar va qadamlari saqlanadi.

Hisob → Boshqaruvda kodlar huquqi bilan “Kit kodlari to‘plami” ni oching. Odatda 4 yig‘ish, muddatlar 0 bo‘lsin. Ixtiyoriy chegara va muddatni saqlang, to‘plam yarating, QR varaqalar va maxfiy CSV ni oling. Kodlar bir marta ko‘rsatiladi; haqiqiy kodlarni hech kimga yubormang. QR ni 100% chop etib telefon bilan o‘qing: matndagi aynan shu kod chiqishi kerak. Telefonda skaner/haqiqiy chop sifati hali avtomatik tasdiqlanmagan.

Qulf oynasida kit kodi bilan kiring, “1 kredit sarflab ochish” ni bosing. Faqat bir kredit kamaysin. Sahifani yangilang va internetni o‘chiring: shu qurilmada ochilgan qo‘llanma, qadamlar va eksportlar ishlasin. O‘sha hisobda o‘sha natijani boshqa qurilmada ochish qayta kredit olmasin. Yangi boshqa ketma-ketlik yangi kredit sarflaydi. Eski hisobga kit qo‘shishda boshqa hisobga bog‘langan kod rad etilsin. Serverga saqlash ochilgan yangi natija uchun qo‘shimcha kredit olmasin.

Qurilma ma’lumotini o‘chirsangiz kesh ruxsati yo‘qoladi; asl kit/hisob bilan o‘sha natijani qayta ochish uchun server kerak, qayta kredit olinmaydi. Server imzo kaliti o‘zgarsa eski qurilma ma’lumotlarini o‘chirmang. Jonli do‘kon/to‘lov yoki telefonga APK o‘rnatish bu sinovga kirmaydi; agent qolgan bosqichlarda davom etadi.

## 2026-10-14 — QBRIX uchun kutilayotgan fayllar

`docs/QBRIX_COMPARE_HOWTO_UZ.md` bo‘yicha aynan bitta asl surat, QBRIX oldindan ko‘rinishi, ruxsat etilgan qo‘llanma va taxta/mix/kesish sozlamalarini `comparison/qbrix/` ga qo‘ying. Kit kodi/parol kerak emas. Hozir fayllar yo‘qligi sabab haqiqiy taqqoslash bajarilmadi. Agent kutmasdan dizayn, ovoz va APK bosqichiga o‘tadi.

## 2026-10-14 — ekranlar va mobil qulaylik

Yaratish → surat → hisoblash → kit bilan ochish → Yig‘ish → Loyihalarim → Yana bo‘ylab yuring. Avvalgi loyiha qadami, kesish va davom ettirish saqlansin. Batafsil sozlamalar yig‘ilgan bo‘lsin. Telefon kengligida yangi qulf ko‘rinishi yon tomonga chiqmasin, tugmalar oson bosilsin. Klaviaturada Tab/Enter va qaytish, internetsiz saqlangan qo‘llanma hamda xato bo‘lsa tuzatish oynasini tekshiring. Agent ovoz va APK bosqichlarini davom ettiradi.

## 2026-10-14 — haqiqiy ovozlar kutilmoqda

Hozir yozib olingan instruktor ovozi yo‘q; ilova buni aytishi va mavjud qurilma ovozi yoki matnni ishlatishi kerak. `docs/VOICE_RECORDING_UZ.md` va aniq `docs/VOICE_RECORDING_LIST.csv` bo‘yicha ikki alohida instruktorning rozilik berilgan WAV yozuvlari kerak. Har birida UZ97/RU101/EN97, jami ikkala instruktor uchun590 fayl. Sinovdagi qisqa tovushlar nutq emas va ilovaga qo‘shilmagan.

Yozuvlar kelgach ro‘yxatdagi papkalarga qo‘yib indeks/build ko‘rsatmasini bajaring. Har ikki ovozda sonlar,0-mix,235-qadam va20000 kabi sonlarni tinglang. Keyingi qadam, til, pauza va fon holatida oldingi gap to‘xtasin; internet o‘chiq holatda ham tekshiring. Hozir agent yozuvlarni kutmay APK va yakuniy sinovlarni davom ettiradi.

## 2026-10-15 — matn sozlamasidagi aniqlik

“Yana” → “Mozaika” → “Ip bilan yozuv” oynasida “Harf konturida mixlar” tanlang. Bu rejimda ip ulanishlari soni harf konturlari va ularning orasidagi haqiqiy ulanishlardan keladi, shuning uchun ta’sir qilmaydigan “iplar soni” sozlamasi yashirildi. “To‘ldirilgan matn nishoni” rejimida iplar chegarasi qoladi. Kontur PDF/TXT/JSON dagi barcha haqiqiy ulanishlar va mix koordinatalari saqlanishi kerak.

## 2026-10-15 — APK tayyor, jismoniy va telefon sinovlari hali kutiladi

Yangi debug APK: `output/mobile/ip-rasm-full-roadmap-20261014-87d130777145-debug.apk`. Nomdagi sana arxiv turkumi boshlangan14-oktabr; yangi ilova15-oktabrda yig‘ildi. Avvalgi67 APK saqlangan, imzo bir xil, barcha40 veb fayl mos. Telefonga o‘rnatilmadi va unda sinov bajarilmadi. Android test APK ham arxivlangan, qurilmada ishga tushirilmagan.

Brauzerda loyiha papkasidan `npm run local` → http://127.0.0.1:4194. Mavjud serverni to‘xtatmang. Avval saqlangan loyihani ochib qadami saqlanganini, yangi surat → bepul oldindan ko‘rish → kit bilan bir marta ochish → offline qadam/PDF/TXT/JSON ni tekshiring. Matnning ikki rejimini lotin/kirill/arabda, hayvon/buyum andozalarini va mobil tugmalarni tekshiring. PDFni100% hajmda chop etib50mm belgini o‘lchang; mixlar va QRni haqiqiy taxtada/telefon bilan tekshirish alohida qoladi. Natijalarni shu faylga yozing.

APKda yangi pullik kitni ochish uchun ishlab chiqarish HTTPS serveri va ishonchli imzo sozlamasi hali ulanmagan. Mahalliy brauzer kit jarayoni tekshirilgan; APK tayyorligi jonli savdo yoki telefon sinovi o‘tdi degani emas. Haqiqiy yozib olingan ovozlar0; qurilma ovozi/matn ishlatiladi. QBRIX fayllari,2/3 odam/hayvon/buyum suratlari va590 rozilikli ovoz yozuvi oldingi ko‘rsatmalar bo‘yicha kutilmoqda. Hisob/parol yoki maxfiy kit kodini yubormang.

## 2026-10-15 — sinash uchun ilova ochildi

http://127.0.0.1:4194/ brauzerda ochildi, hozirgi build ishlayapti. Eski bazangizga tegmaslik uchun bu ishga tushirishda alohida sinov bazasi ishlatildi: serverdagi hisob va kit kreditlari oldingi bazangizdan olinmagan. Yaratish → surat yuklashdan boshlang. Kod bilan ochish uchun keyin shu sinov bazasiga tegishli kit kodi kerak bo‘ladi. Avvalgi qurilmaga saqlangan loyihalarni ko‘rish uchun o‘sha eski brauzer profilidan foydalaning.
