# Egasi uchun sinovlar (agent shu yerga yozadi, o'zbekcha)

Har bir yozuv: sana, nima ochish kerak, nimani bosish kerak, nima bo'lishi kerak, natijani qayerga yozish kerak.

## 2026-10-19 — Phase15 promo/referral asosi (hozir sinash shart emas)

Server hisobi avtomatik sinaldi: chegirma faqat mahsulotga qo‘llanadi, dostavkaga emas; bir buyurtmani qaytarish ikkinchi to‘lov yoki kredit yaratmaydi. Referral o‘z hisobida va avval to‘lagan xaridorda ishlamaydi; haqiqiy to‘lovdan keyin hisoblanadi, qaytarilganda bekor bo‘ladi. Hozir interfeys ulanishi davom etmoqda; eski4200sahifasida bu funksiyani izlamang. Avtomatik mukofot/pul berilmaydi. Admin xarajatlarni kiritmaguncha foyda o‘ylab topilmaydi. Yakuniy Phase15manzili va ekran yo‘riqnomasi keyingi checkpointda qo‘shiladi.

## 2026-10-18 — Phase15 bildirishnomalar (egasi hozir sinashi shart emas)

Mozaika ham avtomatik sinaldi: yangi Phase15 da Menyu → Mutaxassis rejimi → Mozaika, haqiqiy rang/dona/zaxira va taglik o‘lchamlarini kiriting. “Tagliklar rejasi” har qadamning tagligi va mahalliy koordinatasini ko‘rsatadi. Saqlab, oflayn qayta ochish hamda JSON/PDF/SVG ishlaydi. PDF chizmasi masshtabli emas; SVGdagi 50 mm belgini 100% bosmada tekshirish egasiga qoladi. Batafsil: [MOSAIC_UZ.md](../docs/MOSAIC_UZ.md). Hozir qo‘lda sinashni kutmaymiz.

Avtomatik tekshiruv faqat soxta FCM bilan bajariladi; haqiqiy xabar yuborilmaydi. Yakuniy Phase15 manzili keyin `output/phase15/manual-testing.txt` da bo‘ladi;4194–4200 eski sahifalarini bu sinov uchun ishlatmang.

Firebase ulash kerak bo‘lganda [PUSH_NOTIFICATIONS_UZ.md](../docs/PUSH_NOTIFICATIONS_UZ.md) ga amal qiling. Hisob → Bildirishnomalar → “Shu qurilmada yoqish”; tizim ruxsatini bering. Reklama roziligini alohida tanlang. Admin → E’lonlar → e’lonni chop eting → “Bildirishnoma yuborish”. Sozlanmagan serverda tugma o‘chiq va ilova ichidagi e’lonlar ishlashi kerak. Soxta muhit haqiqiy yetkazildi deb ko‘rsatmaydi. O‘chirish yoki hisobdan chiqish tokenni bekor qiladi; keyingi kirishda qayta rozilik talab qilinadi. Android/iPhone haqiqiy yetkazilishi Firebase/APNs va egasining telefoni ulanishidan keyin tekshiriladi.

## 2026-10-16 — Phase10, yangi reference usuli

Yangi sinov manzili: **http://127.0.0.1:4196/**. Uchta yig‘ishga mo‘ljallangan kit kodi `output/phase10/manual-testing.txt` faylida. Eski4195 sahifasi oldingi talqin; yangi usulni4196da sinang.

1. “Standart kit”da Circle46, Square yoki Heart tanlang. “Galereyadan yuklash” orqali o‘z JPG suratingizni tanlang. Yuklangan surat darhol ko‘rinsin; oq fonli, qora-oq tayyor nishon avtomatik paydo bo‘lsin.
2. Har bir yuz, soch va kesishni tekshiring. Yuz topilmasa, yuz chegaralari bo‘limini ochib haqiqiy yuzni qo‘lda belgilang. Heart uchun ko‘pi bilan ikki kishi. Nishon suratning o‘zi; ip natijasi alohida chiqadi.
3. “Har bir yuz, oq fon va kesishni tekshirdim”ni belgilang, hisoblashni bosing. Standart hisob500px/240mix/2500ulanish; natija1000px bo‘lsin. Hisoblash15soniyadan kam bo‘lishi tekshiriladi; fon/yuz tayyorlash vaqti alohida.
4. “Saqlash va yig‘ish”ni bosing, lokal sinov kodini kiriting va bitta yig‘ishni oching. Birinchi qadamdan boshlang. Player, ovoz, PDF va TXTda bir xil sektor belgisi chiqsin (masalan B-17); JSONda raqamli mix indekslari ham saqlansin.
5. Shu kitning andozasini100%/Actual size holatida chop eting. “Fit to page”ni o‘chiring.50mm nazorat belgisini chizg‘ich bilan tekshiring; keyin teshiklarni belgilang/parmalang, mos sektor stikerlarini mix yoniga yopishtiring. To‘g‘ri naqshni tanlaganingizni tekshirib, birinchi qadamdan ipni torting.
6. Bekor qilish tugmasini ham sinang. Eski yo‘riqnomangizni ochib avvalgi qadam saqlanganini tekshiring. Yangi surat tanlanganda yana classic-greedy/2 va2500ulanish tanlansin; oldingi usullar “Tafsilotlar” ichida.

Natijani, vaqtni va yuz o‘xshashligini yozib qo‘ying. Yangi APK: `output/mobile/ip-rasm-phase10-20261016-a3f7b2d756f7-debug.apk`. Hisobot: `output/phase10/report.html`.248unit va36ta oxirgi brauzer holati o‘tdi;12ta haqiqiy JPG sinovida eng sekin hisob9,45soniya.12PDFning rasmlari va2500qadami ham bir xil. APK imzosi/43fayli/76eski APK saqlanishi tekshirildi. Telefon/taxtada hali sinov qilinmadi; APKdagi ishlab chiqarish serveri hali sozlanmagan.4194/4195 va asl ma’lumotlar saqlandi, push qilinmadi.

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

## 2026-10-15 — 8-bosqich standart kit

Yangi buildda Yaratish oynasi “Standart kit”dan boshlanadi; oldingi vositalarga alohida tugma bor. Surat yuklang: oq fon avtomatik tayyorlanadi, ishlamasa xato va asl surat ochiq qoladi. Haqiqiy yuzlarni tekshiring yoki chegarasini qo‘shing, yuzni to‘ldirib joylang va kesish/oq fonni tasdiqlang. Tayyor nishon va haqiqiy ip natijasi alohida. Saqlash odatdagi kit qulfini ochadi; qadam0 dan boshlanadi. Hozir ochiq4194 ilova eski buildda qoldirilgan; agent yangi buildni boshqa portlarda tekshiryapti.

Classic A/B umumiy xatoni kamaytirdi, ammo eski egasi nishonida burun hududini yomonlashtirdi; sifat g‘olibi tasdiqlanmagan. O‘lchangan tizza1500 ulanish,2000–3000 hali qabul qilingan tavsiya emas. Haqiqiy yangi kesish va ikki odamli yurak uchun egasi qabul sinovi kerak.

## 2026-10-15 — umumiy taxta va sektor andozalari

`output/phase9/templates/` da uchta PDF bor: to‘liq500×500mm varaq,6ta A4 teshik andozasi va18ta A4 sektor yorliq sahifasi. Printerda100%/Actual size tanlang, Fit/Scale o‘chsin. Avval50mm belgini chizg‘ich bilan o‘lchang; mos kelmasa teshmang. A4 sahifalarni koordinata krestlari va10mm ustma-ust joy orqali ulang. C=doira, S=kvadrat, H=yurak; tanlangan naqshni adashtirmang. Har birida240 mix, jami720 alohida teshik nuqtasi bor. Kvadrat470mm, doira460mm, yurakning chegaraviy maydoni390mm; bir taxtada to‘qnashuvsiz joylash uchun o‘lchamlar farq qiladi.

Haqiqiy mix/teshik diametrini o‘lchab admin sozlamasiga kiriting: hozir1.5mm teshik,3mm markaz oralig‘i va10mm chet masofasi taxmin. MDF mustahkamligi va teshish chuqurligi avtomatik tekshirilmagan. Oldin kichik sinov taxtasida tekshiring. Keyin nuqtalarni belgilang/teshing. Tanlangan naqshning sektor yorlig‘ini100% chop eting, egri kesish chiziqlari bo‘yicha kesib, har tickni aynan shu mix nuqtasiga tekislab yopishtiring; chizg‘ichni tekislab cho‘zmang. Andoza/profil versiyasi va hash mos bo‘lsin.

Yangi kitlar odatda3 natija beradi; admin4 ham tanlaydi. Avvalgi sarflanmagan kredit va ochilgan qo‘llanma o‘zgarmaydi. Agent hali sektor/player/ovoz va yakuniy hisobot/APK ishini davom ettiryapti; joriy4194 server yangilanmagan.

## 2026-10-15 — sektorlar, qizil ip va hisoblangan vaqt

Yangi ilovada mixlar A-1…D-60 ko‘rinadi; masalan B-17ning raqamli indeksi76 JSONda ham qoladi. Admin8×30 tanlasa A…H bo‘ladi. Player, qidiruv, ovoz, PDF va TXT shu belgini ishlatsin. B-17 ovozda “B, o‘n yetti” deyiladi. A–Z yozuvlari qo‘shilgani uchun ikki haqiqiy instruktorning to‘liq ro‘yxati endi746 fayl; hozir yozuv0, qurilma ovozi yoki matn ishlaydi.

Yurakda ixtiyoriy ikkinchi rangni hisoblashdan oldin tanlash mumkin. Qizil chegaraning hamma haqiqiy ulanishi, ichki ko‘prigi va tuguni sanaladi; ko‘rinish kosmetik chiziq emas. Ikkinchi ip ham ko‘rsatilgan diametr/shaffoflikka mos bo‘lsin. Haqiqiy natijani tekshiring. Ip soni/metr/soat qizil yo‘lni ham qo‘shsin; tizza tavsiyasi qora asos uchun. Saqlash → kit bilan bir marta ochish → birinchi qadamdan boshlash. Kalibrlash/teshik/yorliq sinovini oldingi bo‘limga ko‘ra bajaring.

A/Bda egasi suratining uch shaklida ham ayrim yuz hududi chegaradan o‘tmadi.2000–3000 ulanish sifat g‘olibi yoki eng samarali son deb tasdiqlanmagan; o‘lchangan tizza1500. Haqiqiy ikki odamli yurak taqqoslashiga ikki odamli asl surat kerak. Agent yakuniy sinov/APKni davom ettiradi,4194 avvalgidek qoladi.

## 2026-10-16 — chop etilgan kit versiyasini saqlash

Admin o‘lchamlarni o‘zgartirsa ham eski kit versiyasi serverda qoladi. Yaratish → “Kitda chop etilgan versiya”da qog‘oz/kitdagi r1/r2 raqamini tanlab ishlating. Bir marta olingan shu versiya offline ham keshlanadi. Topilmagan versiya boshqa taxta bilan yashirincha almashtirilmasin. Admin o‘zgartirgan, ammo saqlamagan sozlamadan PDF yuklash o‘chiq; avval saqlang, keyin shu versiya/hashli andozani chiqaring.

Yangi versiya uchun alohida `Start-Standard-Kit.cmd` tayyorlandi:4195, eski4194ga tegmaydi. Yakuniy sinovdan keyin agent ishga tushiradi. Alohida sinov kodi va admin kirishi `output/phase9/manual-testing.txt`da bo‘ladi; bu haqiqiy do‘kon/kredit bazangiz emas. Surat → kitdagi to‘g‘ri versiya/shakl → yuz/fon/kesishni tekshirish → hisoblash → bepul metr/soat → saqlash → sinov kodi bilan ochish → birinchi qadamdan boshlash. Qo‘lda sinov natijasini shu faylga yozing.

## 2026-10-16 — yorliqlarning yakuniy kesilishi

Faqat oxirgi qayta yaratilgan PDFlarni ishlating: kvadrat yorliqlari tashqariga, yurakning pastki yarmi tashqariga qaraydi; yuqori yarmi ichkarida. Sektorlar alohida kesiladi, ticklar avvalgi720 nuqtaga aynan mos. Qog'ozni joylashtirib50mmni qayta o'lchang; yorliqning qaysi tomonga qaraganidan qat'i nazar, doirachani aynan o'z mixiga tenglang. Boshqa naqsh yorlig'ini bir vaqtda yopishtirmang. Yakuniy sinov tugaguncha yangi4195 oynasi hali ishga tushirilmagan.

## 2026-10-16 — standart kit APK tayyor

Yangi APK: `output/mobile/ip-rasm-standard-kit-20261015-5f6c68918c50-debug.apk`.43 veb fayl/imzo tekshirildi,70 eski APK saqlangan. Telefonga agent o'rnatmadi; Android test paketi faqat yig'ildi. APKda jonli kit serveri hali sozlanmagan; to'liq kit-kredit sinovini keyin ochiladigan4195 brauzer oynasida bajaring.4194 o'z holida qoldi. Chop/qadam/ovoz va haqiqiy telefon sinovi egasi tomonidan alohida tekshiriladi.

## 2026-10-16 — yangi standart kit oynasi ochishga yuborildi

**http://127.0.0.1:4195/** hozir ishlaydi. Brauzerga ochish yuborildi;4194ga tegilmadi. Ishga tushgan serverni yana qayta ochmang. Bir mahalliy ishlatilmagan3-kreditli sinov kodi va admin kirishi `output/phase9/manual-testing.txt`da; kod/tokensni chatga yubormang. Bu alohida hisob/baza, eski4194 loyihalari u yerda qolgan.

1.500mm varaq yoki6 A4 andozani100%/Actual size chop eting. Fit o'chiq bo'lsin,50mmni o'lchang; keyin nuqtalarni belgilang/teshing. Tanlangan shaklning6 sektor sahifasini chop etib/kesib, ticklarni mixlarga tekislab yopishtiring. Avval sinov taxtasida haqiqiy mix/MDFni tekshiring.
2.Ilovada qog'ozdagi r1/shaklni tanlang. Surat/yuzlar/oq fon/kesishni tekshirib tasdiqlang(max2 Heart), hisoblang. Bepul metr/soatni ko'ring.2500 boshlang'ich limit sifat tavsiyasi qabul qilingan degani emas.
3.Saqlash → sinov kodi bilan kirish →1 kredit sarflab ochish → ko'rsatilgan birinchi mixdan boshlash. Tasdiqlamaguncha progress0. Qayta kirish/offline qadam saqlansin; bir natijani qayta ochish kredit olmaydi.
4.B-17 va uning76raqamli IDsi, PDF/TXT/JSON/ovozdagi mosligini ko'ring. Qizil tanlansa haqiqiy ikkinchi segment/jami vaqt/metrni tekshiring. Qurilma ovozi yoki matn ishlaydi;746 haqiqiy yozuv hali yo'q.

APK `output/mobile/ip-rasm-standard-kit-20261015-5f6c68918c50-debug.apk`; agent telefonga o'rnatmadi. Native kit uchun ishlab chiqarish serveri hali sozlanmagan, shu sabab to'liq kod-kredit sinovini4195da bajaring. O'xshashlik/QBRIX sifati o'tdi deb belgilanmagan: hozir burun/lab hududlari o'tmadi, tizza1500. Haqiqiy ikki kishilik asl surat va chop/yig'ish natijangiz keyingi qabul uchun kerak.

## 2026-10-16 — yuklangan suratning darhol ko'rinishi

Standart kitda surat yopiq yuz/fon bo'limlari ichida yashiringan edi. Tuzatishda galereyadan tanlash yoki kameradan olish bilanoq “Yuklangan surat” rasmi ko'rinadi; fon tayyorlanish holati ham ochiq. Rasmni ko'rish uchun yuz/qo'lda tuzatish bo'limini ochish kerak emas. Boshqa surat tanlasangiz yangi rasm chiqsin. Yuz va kesishni tasdiqlash → haqiqiy ip natijasi alohida qoladi.

Agent4195dagi tuzatishni tekshirib qo'ygach sahifani yangilang va suratni yana bir marta tanlang. Eski sahifadagi tanlangan surat faqat xotirada bo'lgani uchun yangilashda qayta tanlash kerak. Kit hisobi/kredit/server qayta yaratilmaydi,4194 o'z holida. Oldingi interfeys kerak bo'lsa “Maxsus / oldingi vositalar” tugmasi bor.

Tuzatish4195ga qo'yildi va yangi fayllar tekshirildi. Sahifani yangilang, suratni yana bir marta tanlang: “Yuklangan surat” yopiq bo'limlarsiz ko'rinsin; boshqa suratni tanlash ham ishlasin. Fon yuklanishi/xatosi rasm yonida ochiq ko'rinadi. Server, hisob va kreditlar qayta yaratilmagan.4194 o'z holida. APKning tuzatilgan nusxasi alohida yig'ilmoqda.

## 2026-10-16 — surat ko'rinishi tuzatilgan APK ham tayyor

`output/mobile/ip-rasm-photo-preview-20261016-f6cb7ddf0eea-debug.apk` — surat darhol ko'rinishini o'z ichiga olgan yangi APK.43 fayl/imzo/73 eski APK saqlangani tekshirildi, telefonga o'rnatilmadi. Native kit serveri hali sozlanmagan; to'liq kit sinovi4195da.

4195ni yangilang, rasmingizni yana tanlang: “Yuklangan surat” darhol ko'rinsin, yopiq yuz/fon bo'limlarini ochish shart bo'lmasin. Boshqa rasmga almashtirish va to'rt til tekshirilgan. Fon tayyorlash holati ochiq; yuz/kesishni tasdiqlash va haqiqiy ip natijasi alohida. Kit hisobi/kreditlar, server va4194 qayta yaratilmagan. Avvalgi ko'rinish uchun “Maxsus / oldingi vositalar” mavjud.


## Phase11 — kattaroq bosh joylashuvi tayyor
Yangi ilova: http://127.0.0.1:4197/ Kod: output/phase11/manual-testing.txt (3ta natija). Surat yuklang: tayyor nishonda bosh kattaroq, iyak osti oq bo‘lishi kerak. “Yelkani qoldirish”ni yoqib/o‘chirib solishtiring; har bir yuzni kattalashtirish va chap/o‘ng, yuqori/past surish mumkin. Heart juftligida yuzlar ikki yuqori bo‘lakda bo‘lsin. “Ip soni”2000/2500/3000: taxmin4.4/5.6/6.7soat. Har o‘zgarishdan keyin nishonni qayta tasdiqlang.

### Phase11 — egasi uchun tekshirish tartibi

1. `output/phase11/manual-testing.txt` dagi **yangi** manzilni oching. Shu fayldagi3-yig‘ish kodi yangi alohida sinov hisobi uchun. Eski4194/4195/4196 sahifalarini yangilash shart emas.
2. “Galereyadan yuklash” orqali yuz va soch to‘liq ko‘ringan portret tanlang. Yuklangan surat darhol ko‘rinsin. Oq fon tayyor bo‘lgach, tayyor nishonni tekshiring: Circle/Square’da bosh katta, markazdan sal yuqorida bo‘lsin. Asl suratdagi kesilgan soch qayta yaratilmaydi.
3. “Yelkani qoldirish” dastlab o‘chiq: belgilangan iyak osti silliq oqarsin. Uni yoqib/o‘chirib solishtiring. Har yuzning “Kattalashtirish”, “Chap / o‘ng”, “Yuqori / past” boshqaruvi bor. Iyak noto‘g‘ri aniqlansa asl suratdagi yuz chegarasini ham tuzating; tayyor nishon tasdiqlashdan oldin ko‘rinadi.
4. Heart’da ikki kishilik surat tanlang: har bosh bittadan yuqori bo‘lakda, iyaklar o‘rta chiziqqa yaqin bo‘lsin. Har yuzni alohida surish/kattalashtirish mumkin. Bitta odamda bosh yuqori2/3 qismini egallasin. Haqiqiy iplar shakl bo‘ylab tortilgani uchun nishondagi oq joyda ham ayrim uzun chiziqlar bo‘lishi mumkin.
5. “Ip soni”:2000≈4.4soat,2500≈5.6soat,3000≈6.7soat (har ulanishga8soniya taxmin). Dastlab2500. Yuz/fon/kesishni tasdiqlang, hisoblang. Ko‘rsatilgan natija haqiqiy0.12mm ip ketma-ketligi; tayyor surat ustiga chizilgan bezak emas.
6. Saqlash → yangi sinov kodi bilan kirish → bitta natijani ochish. Yo‘riqnoma ko‘rsatgan birinchi mixdan boshlang. Keyingi qadamni bosmaguncha progress0 bo‘lsin. Sektor belgisi, masalanB-17, player/PDF/TXT/JSON’da bir xil bo‘lsin. PDF muqovasi ilovadagi natijaga mos kelsin.
7. `output/phase11/report.html` da eski/yangi nishon va ip natijasini teng o‘lchamda solishtiring. APK ham alohida beriladi; agent telefonga o‘rnatmagan. Native kit serveri sozlanmaguncha to‘liq kod/kredit sinovini yangi brauzer manzilida bajaring. Chop qilishda oldingi50mm o‘lchov/andaza/mix-sektor tekshiruvi o‘z kuchida.


Phase11 APK: `output/mobile/ip-rasm-phase11-20261016-46bc061bd5c2-debug.apk`.35.99MB, imzo va43fayl tekshirildi;79oldingi APK o‘z holida. Telefonga agent o‘rnatmagan. To‘liq kod/kredit sinovi uchun yangi http://127.0.0.1:4197/ manzilidan foydalaning.


## Phase12 — sodda uch ekran

Yangi ilova: **http://127.0.0.1:4198/**. Uchta yig‘ish kodi: `output/phase12/manual-testing.txt`. Oldingi4194–4197 sahifalari o‘z holida qoladi.

1. Bosh ekranda faqat **Galereyadan tanlash**, **Rasmga olish**, **Doira / Kvadrat / Yurak** bo‘lsin. Doira dastlab tanlangan. Kit o‘lchamlari yoki murakkab sozlamalarni ochish shart emas.
2. Portret tanlang: **Moslash** o‘zi ochiladi. Surat darhol ko‘rinsin, keyin fon oqartirilsin. Sochdan iyakkacha bosh katta bo‘lsin. Yurakdagi ikki odam bittadan yuqori bo‘lakka joylashsin. Aniqlanmagan yuz uchun tiniqroq surat tanlang; ilova yuzni o‘zi to‘qimaydi.
3. Surat ustida barmoq/sichqoncha bilan suring. Ikki barmoq, g‘ildirak yoki pastdagi kattalashtirish bilan o‘lchamini o‘zgartiring. **Burish**90° aylantirsin, **Qaytarish** avtomatik joylashuvni qaytarsin. Yurak juftligida kerakli boshni bosib alohida suring.
4. **Oldin / Keyin** asl rangli surat va tayyor qora-oq nishonni shu joylashuvda ko‘rsatsin. **Yelkani ko‘rsatish** dastlab o‘chiq: iyak osti oq, eski katta qora uchburchaklar bo‘lmasin. Soch/iyak chegarasini tekshiring, kerak bo‘lsa joylashuvni moslang.
5. **Yaratish**ni bosing. Hech narsa moslamasangiz, galereya tugmasi + fayl tanlash + yaratish bilan natijaga yeting. Natijada katta ip rasmi va **3000 ip · ~6.7 soat** ko‘rinsin. Bu8soniya/ulanish taxmini; haqiqiy yig‘ish tezligi farq qiladi.2500/3000 solishtirishda3000 aniqroq topildi. Faqat kerak bo‘lsa kichik **Batafsil**da2000/2500/3000ni tanlash mumkin.
6. **Qayta moslash** oldingi surish/kattalashtirish/burishni saqlasin. O‘zgartirmay qayta yaratsangiz aynan o‘sha ip natijasi chiqsin. Tilni Menyuda UZ lotin / UZ kirill / RU / EN orasida almashtirib ko‘ring. Eski vositalar **Menyu → Mutaxassis rejimi**da.
7. **PDF yuklab olish** yoki **Yig‘ishni boshlash**ni bosing. Yangi mahalliy kit kodi bilan kiring, bitta natijani oching. PDF va player bir xil mix/sektor/qadamni ko‘rsatsin (masalanB-17), birinchi qadamdan boshlang. Bitta natijani qayta ochish yana kredit sarflamasin. Ruxsat olingach player shu qurilmada oflayn ishlasin.
8. Natijalarni `output/phase12/report.html`da teng o‘lchamda solishtiring; ekranlar `output/phase12/screens/`da. Egasi surati avvalgi lokal320px ishlov berilgan nusxa; haqiqiy telefon, yangi asl surat va taxtada o‘zingiz tekshiring. Chop etishda100%/Actual size va50mm belgini tekshirish, mix/sektor andozasi avvalgidek.3000ip uchun haqiqiy kerakli ip uzunligini PDFdan tekshiring; kit zaxirasi yetishini tasdiqlang.

APK: `output/mobile/ip-rasm-phase12-20261017-29f469aec06e-debug.apk`.261unit va38ta oxirgi brauzer holati o‘tdi;2PDFning1000px rasmi va barcha3000qadami tekshirildi.43fayl/imzo va82oldingi APK saqlangani tasdiqlandi. Kompyuterda10.08s, mobil brauzerda11.78s hisoblash qayd etildi. Telefonga agent o‘rnatmagan va haqiqiy telefonda hali sinamagan. Native ishlab chiqarish serveri hali sozlanmagan; to‘liq kod/kredit sinovini yangi brauzer manzilida bajaring. Eski4194–4197ga tegilmagan; endi4198ham alohida saqlanadi, push qilinmagan.

## Phase13 — tiniqroq portret

Yangi ilova: **http://127.0.0.1:4199/**. Uchta natija uchun kod `output/phase13/manual-testing.txt`da. Eski4194–4198 o‘z holida qoladi.

1. Yangi manzilda Doira/Kvadrat/Yurak tanlang, galereyadan portret yuklang. Uch ekranli yo‘l avvalgidek: surat → Moslash → Natija. Suratni surish, ikki barmoq/g‘ildirak/slider, Burish/Qaytarish, Oldin/Keyin va yelka tugmasi ishlasin.
2. Joylashuv ma’qul bo‘lsa **Yaratish**ni bosing. Yangi usul avtomatik ishlaydi; biror murakkab parametr kiritmang. Ko‘z, burun, lab va sochni avvalgi natija bilan teng o‘lchamda solishtiring. Bu haqiqiy0.12mm ip ketma-ketligi; tayyor surat ustiga bezak qo‘yilmaydi.
3. Kvadrat markazidagi oldingi tekis “+” yo‘qolsin. Egasi sinovida avval ikkita shunday ip bor edi, endi0. Mixlar va andoza siljimagan. Boshqa qiya iplar va to‘qima izi tabiiy qoladi.
4. Kichik **Batafsil**:2500≈5.6soat /3000≈6.7soat /3500≈7.8soat. Standart3000. Ayrim suratlarda3500 aniqroq, ammo bir soatcha qo‘shimcha yig‘ish talab qiladi; Yurak juftligi sinovida3000 yaxshiroq chiqdi. Har bir variant haqiqatan qayta hisoblansin.
5. **Qayta moslash** joylashuvni saqlasin; o‘zgartirmay qayta yaratsangiz bir xil natija chiqsin. **PDF yuklab olish** yoki **Yig‘ishni boshlash**da yangi kit kodi bilan bitta natijani oching, birinchi mix/qadamdan boshlang. Player/PDF/TXT/JSONdagi sektorlar (masalanB-17) mos bo‘lsin. Ruxsat olingach shu qurilmada player oflayn ishlasin.
6. `output/phase13/report.html`da bir xil tayyor nishon, v2 va v3 natijalarini ko‘ring. Egasi Kvadratida yuz ko‘rsatkichi0.512→0.574, Doirada0.545→0.612 bo‘ldi. Bular avvalgi320px ishlov berilgan lokal nusxa; yangi asl surat va haqiqiy telefon/taxtada o‘zingiz ham sinang. Hech qanday surat Gitga yoki tashqi saytga yuborilmagan.
7. Eski saqlangan yo‘riqnomani ham oching: oldingi usuli, natijasi va progressi saqlansin. Chop etishda100%/Actual size,50mm belgini tekshirish va mix/sektor andozasi avvalgidek. Kerakli ip uzunligi va zaxira yetishini PDFdan tekshiring.

APK: `output/mobile/ip-rasm-phase13-20261017-7b42969cd9ba-debug.apk`.268unit va41ta brauzer holati o‘tdi;11PDFning rasmlari va barcha3000qadami bir xil.43fayl/imzo/85eski APK saqlangani tekshirildi. Eng sekin sifat hisob9.22soniya; haqiqiy telefon emas, mobil brauzer emulyatsiyasi ham sinalgan. Kvadratdagi3000ip sinovi taxmin1546m ip talab qildi, vaqtinchalik1200m zaxira yetmaydi; haqiqiy kitdagi ip uzunligini tekshiring. Native kit serveri hali sozlanmagan; kod/kreditni yangi brauzerda sinang. Agent telefonga o‘rnatmagan. Eski4194–4198 va tmp/data saqlangan, push qilinmagan.

## Phase14 — avtomatik tekshiruvlar

Hozir qo‘lda sinash talab qilinmaydi. Menyu → Rasm turi orqali Odam/Hayvon/Avtomobil/Buyum/Yozuv tanlanadi. Lotin, kirill va arab yozuvi mahalliy shrift bilan ishlaydi. Foto moslashda eski suratlardagi joylashuv buzilmaydi. Yakuniy yangi manzil va qolgan ulash ishlari Phase14 tugaganda quyida yoziladi.

## Phase14 — yig‘ish rejimi avtomatik tekshirildi

Qo‘lda tekshirishingizni kutmayman. Qayta ochilganda oxirgi loyiha va qadam tiklanadi. Pastdagi katta tugma qadamni tasdiqlaydi; oldingi/keyingi tugmalar faqat ko‘rsatilayotgan qadamni almashtiradi. Foiz va qolgan vaqt tasdiqlangan ishlardan olinadi. Offline qayta ochish va davom etish desktop/mobile testlarda o‘tdi. Ilova ekranni yoqib turadi; qurilmada kerakli TTS ovozi bo‘lmasa matn ishlaydi. Yozib olingan ovozlar uchun docs/VOICE_RECORDING_UZ.md va docs/VOICE_RECORDING_LIST.csv ga amal qilinadi; haqiqiy yozuvlar hozircha qo‘shilmagan.

## Phase14 — to‘lov va Admin (avtomatik tekshirildi)

Egadan hozir qo‘lda test talab qilinmaydi. Yangi manzil yakuniy manual-testing.txt da bo‘ladi. Menyu → Hisob / Admin → Admin: bir sahifada kit kodlari, kredit sarfi, buyurtma, narx, dostavka va e’lonlar. Kit to‘plamini yaratib PDF / QR ni yuklash mumkin. Narx so‘mda kiritiladi. Shopdagi Click/Payme faqat sinov; haqiqiy pul olinmaydi. Kalitlarni ulash uchun docs/PAYMENTS_UZ.md ni o‘qing. Production Admin paroli qayta tasdiqdan so‘ng lokal HTTP va Docker HTTPSda sinaldi. Push manzili tasdig‘i hali kutilmoqda.

## Phase14 — VPS va APK ulash

Hozir egadan qo‘lda sinov talab qilinmaydi: Dockerning desktop/mobil HTTPS oqimi va bazani qayta ochish tekshirildi. Domen/VPSni docs/DEPLOY_VPS_UZ.md bilan, release kalitini docs/APK_SERVER_AND_SIGNING_UZ.md bilan ulang. Debug APKning lokal manzili http://127.0.0.1:4482/api; haqiqiy telefonda kompyuterga USB ulab `adb reverse tcp:4482 tcp:4482` kerak yoki Admin → Server manzili orqali o‘z HTTPS domeningizni kiriting. Agent telefonga o‘rnatmagan.


Phase14 APK tayyor: `output/mobile/ip-rasm-phase14-20261017-04f92e0d8c1d-debug.apk`.46fayl, imzo va88eski APK saqlangani tekshirildi; Android yangi ekran-yoqish qismi kompilyatsiya qilindi. Agent telefonga o‘rnatmagan.295unit va300ta oxirgi desktop/mobil holat o‘tdi; dastlabki16test xatosi tuzatilgan46ta qayta sinov bilan yopildi. Yangi sayt va uchta natija kodi yakuniy ko‘rsatmada beriladi; hozir qo‘lda test kutmaymiz.


## Phase14 yakuniy manzil — hozir qo‘lda test kutmaymiz

Yangi ilova **http://127.0.0.1:4200/**; uchta natija uchun ishlatilmagan kit kodi va lokal Admin kirishi `output/phase14/manual-testing.txt`da. Eski4194–4199ni to‘xtatmang. APK `output/mobile/ip-rasm-phase14-20261017-04f92e0d8c1d-debug.apk`;46fayl/imzo/88eski APK va barcha yangi funksiyalar tekshirildi.

Keyin vaqt bo‘lganda: shakl → galereya → suratni surish/kattalashtirish/Burish/Oldin-Keyin → Yaratish. Qayta moslash joylashuvni saqlaydi.3000ip≈6.7soat, boshqa variant Batafsilda. Yig‘ishni boshlash → yangi kit kodi → bitta natijani ochish → katta sektorlar bo‘yicha birinchi qadam. Tasdiq bajarilgan ishni saqlaydi, oldingi/keyingi faqat ko‘rsatadi. Internet o‘chganda qayta ochib davom etish avtomatik tekshirildi.

Admin → kit → PDF/QR, narx/stock/dostavka/e’lonlar bir sahifada. To‘lovlar sinov, haqiqiy pul olinmaydi. Chop etish100%/Actual size,50mm ni tekshirish, mix/sektor stikerlarini moslash va birinchi qadam uchun docs/PHYSICAL_BOARD_UZ.md. Hozir taxta/telefon sinovi bajarilgan deb da’vo qilinmaydi. Faqat egasi keyin ulaydigan besh narsa va aniq yo‘riqnomalar AGENT/FINAL_REPORT.mdda.


## Phase15 — ism/sana (avtomatik sinov, qo‘lda kutmaymiz)

Yakuniy yangi manzil Phase15 tugaganda beriladi;4200eski holida saqlanadi. Odam surati → Moslash → Ism/sana maydoniga qisqa matn. Yozuv nishonda va haqiqiy ip ketma-ketligida bo‘lsin; bo‘sh maydon avvalgi joylashuvni saqlaydi. Doira/lotin, Kvadrat/kirill, Yurak/arab desktop va mobilda kit orqali ochish/qayta yaratish/eksport bilan6/6o‘tdi. Batafsil docs/CAPTION_UZ.md; aralash yozuv/raqam tartibi C02da davom etadi. Agent qo‘lda sinov kutmaydi.


## Phase15 — aralash yozuv (avtomatik tekshirildi)

Ism/sana yoki Menyu → Rasm turi → Yozuvda `Ali سلام Мир 2026` kabi bitta qatorda aralash yozish mumkin. Arab harflari qo‘shiladi, raqamlar teskarilanmaydi; matnni o‘zingiz teskari yozmang. Mutaxassis rejimidagi kontur ham aralash matn bilan ishlaydi, mix oralig‘i sig‘masa kattaroq taxta/kamroq mix so‘raydi.23unit va16ta oxirgi desktop/mobil holat o‘tdi. Eski saqlangan matnli yo‘riqnomalar saqlanadi. Agent qo‘lda test kutmaydi.


## Phase15 — olmos materiali va yopiq bo‘yash chegaralari

Menyu → Mutaxassis rejimi → Menyu → donali hunarmandchilik. Olmos turida dumaloq/kvadrat, dona eni, taglik rangi va tajriba magnit+po‘lat variantini tanlash mumkin. Dona eni qadamdan katta bo‘lsa reja rad etiladi. Yaratish → saqlash → birinchi donani tasdiqlash → internetni uzib qayta ochish: material va jarayon saqlansin. SVG haqiqiy mm; PDFdagi kataklar tartib chizmasi.

Raqamli bo‘yashda hududni belgilaganda bo‘yalgan maydon foizi ham o‘zgarsin. Yopiq chegaralar SVG va JSONni yuklash mumkin; SVGdagi 50 mm chiziqni 100% chop etib keyin o‘lchang. Ichki bo‘shliqlar saqlanadi, raqam sig‘magan kichik hududning markazi JSONda bor. Batafsil docs/CRAFT_POLISH_UZ.md. Agent avtomatik tekshiradi, hozir egasining qo‘lda sinovini kutmaydi.


## Phase15 — QR lenta naqshi (avtomatik tekshirildi)

Menyu → Mutaxassis rejimi → Menyu → donali hunarmandchilik → QR ip naqshi. Qisqa matn/havola → yaratish. Old tasvir skanerlanadi; orqa ko‘rinish o‘tishlarni ko‘rsatadi. Qadamni tasdiqlab, oflayn qayta ochganda keyingi qadam saqlansin. JSON/CSV/SVG/PDF bir xil reja bo‘lsin. Bu oddiy 240 mixli kit uchun emas: alohida oq teshikli varaq va 1.4 mm yassi qora lenta kerak, dumaloq ip almashtirmaydi. Fizik teshik/lenta mosligi va tayyor buyumni telefon bilan skanerlash keyingi egasi sinovi. Andozada 50 mm belgini o‘lchang. Aniq yo‘l: docs/QR_CRAFT_UZ.md.6unit va4desktop/mobil holat o‘tdi; agent hozir qo‘lda sinovni kutmaydi.

## Phase15 — kitob buklash (avtomatik tekshirildi)

Mutaxassis rejimi → Menyu → donali hunarmandchilik → Kitob buklash. Yurak yoki ism/sana tanlang; haqiqiy varaq o‘lchami va sonini kiriting. Bitta varaqning ikki tomoni bor. Reja → kit kodi → 1 kredit bilan belgilarni ochish → shu varaqqacha tasdiqlash → internetsiz qayta ochish. PDF/SVGdagi50mmni100%chop etib o‘lchang; yuqori/pastki belgi varaq tepasidan, ikkinchi belgi tashqi chet bo‘ylab o‘lchanadi. Kesish kerak emas; burchak doim45°emas. Avval keraksiz qog‘ozda sinang. Aniq qadamlar docs/BOOK_FOLDING_UZ.md.9unit/4desktop-mobil tekshiruv o‘tdi; fizik sinovni kutmay keyingi kod ishlari davom etadi.

## Phase15 — ipdan video/GIF (avtomatik tekshirildi)

Natija → Batafsil → Ipdan video → Video yuklab olish yoki GIF yuklab olish. Shu oynani ochiq qoldiring; bekor qilish darhol to‘xtatsin. Yig‘ish oynasidagi Animatsiya orqali ham olinadi. Video ovozsiz, haqiqiy ip tartibidan; original surat qo‘shilmaydi. GIF kichikroq, ranglari soddalashtiriladi; video yo‘q qurilmada shu tugma ishlaydi. Internet uzilganda oldingi qo‘llanmaning GIFini ham olish mumkin. Aniq cheklovlar docs/SEQUENCE_VIDEO_UZ.md.9unit va4desktop/mobil test o‘tdi, haqiqiy fayllar mustaqil dekoderda ochildi; telefon kodek/ulashish sinovi keyin, agent uni kutmaydi.

## Phase15 — 3D geometriya oraliq holat

Ramka, qatlamli shakl va yozuvning STL geometriyasi5avtomatik testdan o‘tdi; fayllar mustaqil tekshirildi. Bo‘lim hali menyuga ulanmagan, PDF va yig‘ish oynasi keyingi ish. Hozir egasidan qo‘lda sinov kerak emas; agent davom etadi. Haqiqiy printer o‘lchami, material, ramka yelimi va tayoqcha mosligi keyin alohida tekshiriladi.

## Phase15 — 3D ramka, qatlamli haykal va yozuv (avtomatik tekshirildi)

Mutaxassis rejimi → Menyu → katakli ishlar → 3D shakllar. O‘lchamlarni kiriting, yarating, barmoq bilan aylantiring; slayder/qaytarish/bitta detal ko‘rinishi ishlasin. Kit kodi → 1 kredit aynan shu rejaning hamma detalini ochadi. STL bitta detal, PDF/SVG 100% va 50 mm belgili; yozuv/ramka uchun umumiy yig‘ish joylashuvi ham bor. Jarayonni tasdiqlab, oflayn qayta oching. Boshqa oynada o‘zgarsa rad etilsin, keyin Ochish eng yangi jarayonni olsin. Kitob/3D Qadamni aytish mahalliy UZ/RU/EN ovoziga mos; qadam yoki til almashganda eski ovoz to‘xtasin. Aniq qadamlar docs/SOLID_MODELS_UZ.md va BOOK_FOLDING_UZ.md.22unit/16so‘nggi desktop-mobil holat,176PDFsahifa va haqiqiySTLfayllar tekshirildi. Hozir egasining qo‘lda sinovi kutilmaydi; printer maydoni/material/rod/telefon keyingi shaxsiy tekshiruv.

## Phase15 — bepul ustaxona (keyinroq amaliy tekshiruv)

Kod sinovlari avtomatik bajarildi; hozir sizdan javob kerak emas. Yakuniy yangi preview tayyor bo‘lgach: Menyu → Mutaxassis rejimi → To‘rli ishlar → Bepul ustaxona. Uchala qo‘llanma kit kodisiz ochiladi. Kerakli materialni tayyorlang, Boshlash yoki davom etish tugmasini bosing. Qadamni bajarib Bajardim deb belgilang. Chizmani ko‘rish yoki avtomatik ko‘rsatish ishni bajarilgan deb belgilamasin. Ilovani qayta ochganda saqlangan joydan davom etsin. Qog‘oz/karton modelini barmoq bilan aylantiring. PDF oxiridagi andozani 100% chop etib 50 mm belgini o‘lchang; keyin qog‘oz/kartonda sinang. Ebru uchun mos tayyor material ko‘rsatmasiga amal qiling. O‘z foto/videongizni keyin qo‘shish tartibi: docs/FREE_WORKSHOPS_UZ.md. Haqiqiy kesish/buklash/bo‘yoq va telefon ovozi hali amalda tekshirilmagan.

## Phase15 — mijozlar galereyasi (keyinroq)

Avtomatik sinovlar alohida bazada, o‘zimiz chizgan rasm bilan bajarildi. Hozir haqiqiy fotosurat yuborishingiz kerak emas. Yakuniy yangi ilovada Menyu → Hisob va do‘kon → Mijozlar galereyasi. Kit kodi yoki ro‘yxatdan o‘tgan hisob bilan kiring, tayyor buyum rasmini tanlang, nom/taxallus/fikrni yozing va uchta rozilikni belgilang. Dastlab Tekshirilmoqda bo‘lsin; boshqaga ko‘rinmasin. Admin → Galereyani tekshirish orqali kattalashtirib ko‘ring va ruxsat bering; keyin ommaviy ro‘yxatda chiqsin. Mening yuborgan ishlarim ichidan o‘chiring: ommadan yo‘qolsin. Ilovaning dastlabki portretini bu yerga yubormang. To‘liq yo‘l, huquqlar, o‘chirish va saqlash muddatlari: docs/GALLERY_UZ.md. Eski4194–4200versiyalarda yangi galereya yo‘q; yakuniy yangi preview/APKni kutib tekshiriladi.

## 2026-10-20 — Phase15 chegirma va do‘st kodi tayyor

Hozir qo‘lda sinash shart emas:42unit,14brauzer va2HTTP holati avtomatik o‘tdi. Yakuniy Phase15manzilida Menyu → Hisob va do‘kon → Do‘kon: mahsulot qo‘shing, kod yozing, “Qo‘llash”ni bosing va chegirma/jami narxni ko‘ring. Savat o‘zgarsa qayta qo‘llash kerak. Javob yo‘qolsa avvalgi buyurtma ayni kalit bilan davom etadi.

Admin → “Chegirmalar va xarajatlar”da yangi kod/foiz/summa/muddat/limitni saqlang. Do‘st dasturi dastlab o‘chiq; yoqqach Hisob → “Do‘stni taklif qilish”dan kod oling. O‘z hisobingizda ishlamaydi, avtomatik mukofot yo‘q. Haqiqiy xarajatlar kiritilmaguncha qolgan summa o‘ylab topilmaydi. Aniq yo‘riqnoma: [OFFERS_UZ.md](../docs/OFFERS_UZ.md). Hisobot: `output/phase15/offers/report.html`. Eski4200sahifasi o‘zgarmagan; yangi manzil yakuniy qo‘llanmada beriladi.
