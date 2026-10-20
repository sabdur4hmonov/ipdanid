# Phase15 davom etmoqda — 2026-10-20

C01–C15 bajarildi. C16–C26, umumiy yakuniy sinovlar va yangi APK hali qolgan; quyidagi Phase14 hisobotini Phase15 tayyor degan ma’noda qabul qilmang. Eng oxirgi holat: AGENT/PROGRESS.md va docs/REMAINING_WORK.md. Oxirgi AGENTS ko‘rsatmasiga ko‘ra yangi commitlar lokalda qoladi, push qilinmaydi.

# Tarixiy Phase14 — mahsulot kodi tayyor, 2026-10-17

Ilova: **http://127.0.0.1:4200/**. Uchta yig‘ish uchun yangi, ishlatilmagan kod va lokal Admin kirishi: `output/phase14/manual-testing.txt`. APK: `output/mobile/ip-rasm-phase14-20261017-04f92e0d8c1d-debug.apk`. Kod `feat/full-roadmap` branchiga oddiy push qilindi; main/force/merge/PR yo‘q.

Surat → Moslash → Natija yo‘li saqlangan. Yangi portret kesishi, iyak ostini oq qilish va Kvadratning ko‘z yonidagi gorizontal to‘qimasini kamaytirish qo‘shildi. Odam, Hayvon, Avtomobil, Buyum va lotin/kirill/arab yozuvi uchala shaklda v3dan foydalanadi. Standart3000ip≈6.7soat. Natija haqiqiy ip ketma-ketligidan chiziladi; tabiiy vertikal va yelpig‘ich izlari qolishi mumkin. Sifat hisobotida52haqiqiy UI holati bor, eng sekin hisob9.433soniya: `output/phase14/quality.html`. Hayvon/buyum namunalari sun’iy mexanik sinov; egasining surati avvalgi ishlov berilgan lokal nusxa. Haqiqiy taxta o‘xshashligi avtomatik test bilan tasdiqlanmaydi.

Yig‘ishda katta sektorlar, oldingi/keyingi qadam, alohida tasdiqlash, foiz/qolgan vaqt, avtomatik saqlash va oflayn qayta ochib davom etish ishlaydi. Ekranni yoqib turish browserda sinaldi, Android qismi kompilyatsiya qilindi. Qurilmada o‘rnatilgan mos UZ/RU/EN TTS ishlatiladi; haqiqiy ovoz fayllari keyin qo‘shilsa yozilgan instruktor avtomatik tanlanadi. Hozir746haqiqiy WAVning birortasi yo‘q.

API+SQLite+Caddy va kundalik tekshirilgan zaxira uchun Docker tayyor. Lokal HTTPSda desktop/mobil Admin paroli, kit yaratish, chiqishda sessiyani bekor qilish, haqiqiy v3 yaratish va imzolangan ochish2/2o‘tdi. API qayta ochilganda baza saqlandi; ikki zaxira quick_checkdan o‘tdi. Admin bir sahifada kodlar/PDF/QR, kreditlar, buyurtma, narx, dostavka va e’lonlarni boshqaradi. APKning lokal API4482ulanishi browser native-mode sinovida tekshirildi. Release imzolash skripti bor, egasining kaliti yaratilmagan.

Click/Payme **faqat sandbox**: invoice, callback imzosi/auth, takroriy so‘rov, holat va bir martalik kredit berish sinovdan o‘tdi. Mustaqil lokal soxta provayderlar ishlatildi; haqiqiy pul olinmadi. Live checkout/fiskal sertifikatsiya hali ishga tushirilmagan; shunchaki live kalit qo‘yish real to‘lovni yoqmaydi.

295unit testi o‘tdi.300ta desktop/mobil holatning oxirgi natijalari o‘tdi: to‘liq dastlabki run284o‘tgan/16test xatosi bilan tugadi, keyin tegishli46holat toza muhitda46/46o‘tdi; jami150desktop+150mobil, o‘tkazib yuborilgan holat yo‘q. Bu dastlabki run xatosiz bo‘lgan degani emas. TypeScript/build1986o‘tdi. APKning46fayli, eski/yangi funksiyalari, Android ekran plagini va imzosi tekshirildi;88eski APK o‘zgarmadi. Telefon o‘rnatish/instrumentation yoki haqiqiy domen sertifikati sinovi bajarilmadi.

4194–4199serverlariga HTTP so‘rov yuborilmadi yoki o‘zgartirish kiritilmadi. Ularning274saqlangan fayli/assetlari hash bilan tekshirildi, tmp/data ishlatilmadi. Endi4200/API4482va `output/phase14-dist` ham saqlanadi. Tarixiy Phase10hisobotining oldingi testda almashtirilgan qismi to‘liq asl holiga qaytmagan:6skrinshot tiklanmadi,18guide/PDF/TXTda metadata farqi bor; asl ketma-ketliklar saqlangan. Tafsilot va barcha dalillar: [PHASE14_VALIDATION.md](../docs/PHASE14_VALIDATION.md).

## Faqat egasi ulaydigan besh narsa

Hozir qo‘lda test qilish shart emas; kod ishi bularni kutib qolmadi.

| Ish | Aniq yo‘riqnoma |
| --- | --- |
| Domen/VPS: DNS, SSH, Docker va o‘z Admin paroli | [DEPLOY_VPS_UZ.md](../docs/DEPLOY_VPS_UZ.md), bitta buyruq: `bash scripts/deploy.sh` |
| Shaxsiy release keystore, HTTPS APK manzili va imzolash | [APK_SERVER_AND_SIGNING_UZ.md](../docs/APK_SERVER_AND_SIGNING_UZ.md) |
| Click/Payme test merchant kalitlari va keyingi live shartnoma/sertifikatsiya | [PAYMENTS_UZ.md](../docs/PAYMENTS_UZ.md) |
| Ikki rozilik bergan instruktorning746WAV yozuvi | [VOICE_RECORDING_UZ.md](../docs/VOICE_RECORDING_UZ.md), [aniq CSV](../docs/VOICE_RECORDING_LIST.csv) |
| Haqiqiy taxta:100%print,50mm, teshik/mix, sektor stikeri, ip uzunligi va birinchi qadam | [PHYSICAL_BOARD_UZ.md](../docs/PHYSICAL_BOARD_UZ.md) |

---

Quyidagi hisobotlar tarixiy; joriy yakun Phase14yuqorida.

# Phase13 — tiniqroq portret tayyor, 2026-10-17

Yangi ilova: **http://127.0.0.1:4199/**. Uchta natija uchun kod: `output/phase13/manual-testing.txt`. Doira/Kvadrat/Yurakda yangi v3 avtomatik ishlaydi; uch ekran va suratni bevosita moslash saqlangan. Standart3000ip≈6.7soat, Batafsil2500/3000/3500 va vaqtni ko‘rsatadi. Eski v2 yo‘riqnomalari o‘zgarmagan.

Egasi Kvadratida yuz SSIM0.512→0.574, Doirada0.545→0.612. Kvadratda “+”ni hosil qilgan ikkita tekis ip v3da yo‘q, mixlar/andoza siljimagan.3sun’iy portret va Yurakdagi har ikki yuzda ko‘rsatkich yaxshilandi. Hisobot: `output/phase13/report.html` — teng o‘lchamda nishon/v2/v3 va2500/3000/3500 raqamlari. Bir sun’iy portretda3500 aniqroq(.587→.606), Yurak juftligida3000 yaxshiroq; vaqt uchun3000 standart qoladi. Egasi manbasi avvalgi320px ishlov berilgan nusxa, asl surat emas. Namuna SSIM porti ham Python bilan0.539→0.622 mos tushdi; turli kesishlar raqamlarini bir-biriga tenglashtirmaymiz.

268unit testi va41brauzer holati o‘tdi.9sifat holatida27haqiqiy hisob, eng sekin9.22soniya;32oddiy/eski oqim sinovi ham o‘tdi.11PDFning rasmi ilovaga pikselma-piksel,3000qadami JSON/sektorlarga mos. APK: `output/mobile/ip-rasm-phase13-20261017-7b42969cd9ba-debug.apk` — offline yig‘ish3m41s,43fayl/imzo va85eski APK saqlangani tekshirildi. Native kit serveri hali sozlanmagan; kodni yangi brauzerda sinang. Telefon/taxtada hali sinov qilinmadi; Kvadrat sinovida1546m ip kerak bo‘ldi, kit zaxirasini tekshiring.

4194–4198 serverlari/tmp/data tegilmagan, yangi4199 alohida bazada. Kit kodlari va suratlar Gitga kirmagan, push/o‘rnatish yo‘q. Sinov tartibi `AGENT/OWNER_TESTS.md`da.

---

Quyidagi hisobotlar tarixiy; joriy yo‘l yuqoridagi Phase13.

# Phase12 — uch ekran tayyor, 2026-10-17

Yangi ilova: **http://127.0.0.1:4198/**. Uchta yig‘ish kodi: `output/phase12/manual-testing.txt`. Endi: surat tanlash → Moslash → Natija. Suratni bevosita surish, ikki barmoq/g‘ildirak/slider bilan kattalashtirish,90°burish, qaytarish va Oldin/Keyin bor. Iyak osti oq; yelkani ko‘rsatish ixtiyoriy. Qayta moslash joylashuvni saqlaydi. Murakkab vositalar Menyu → Mutaxassis rejimida. To‘rt til bor.

Egasi lokal nusxasi,3sun’iy portret, Kvadrat va Yurak juftligida2500/3000 teng o‘lchamda solishtirildi;3000 aniqroq topilib yagona standart bo‘ldi, taxmin6.7soat. Oddiy yo‘l3bosish: galereya + surat tanlash + yaratish. Hisobot va3ekranning kompyuter/mobil rasmlari: `output/phase12/report.html`, `output/phase12/screens/`. Egasi surati avvalgi320px ishlov berilgan nusxa; asl surat emas. Katta qora yelka uchburchaklari olib tashlandi; haqiqiy ipda ayrim uzun chiziqlar qolishi mumkin.

261unit testi,38ta brauzer holatining oxirgi natijalari va1974modulli build o‘tdi.2PDFning rasmi ilovaga pikselma-piksel, barcha3000qadami JSON/sektorlarga mos. Kompyuter/mobil asosiy hisob10.084/11.780soniya,15dan kam. Haqiqiy kit bilan ochish, PDF, player/oflayn va eski yo‘riqnomalar tekshirildi; avvalgi diagnostik xatolar yashirilmagan.

APK: `output/mobile/ip-rasm-phase12-20261017-29f469aec06e-debug.apk`. Offline yig‘ish5m21s,43fayl/imzo va82eski APK saqlangani tekshirildi. Telefonga o‘rnatilmadi; native kit serveri hali sozlanmagan, kod/kreditni yangi brauzerda sinang.4194–4197 serverlari va tmp/data tegilmadi; yangi4198 alohida bazada. Barcha commitlar mahalliy, push yo‘q. Telefon/taxta/ip zaxirasi sinovi `AGENT/OWNER_TESTS.md` da.

---

Quyidagi hisobotlar tarixiy; joriy yo‘l yuqoridagi Phase12.

# Phase11 — kattaroq yuzlar tayyor, 2026-10-16

Yangi ilova: **http://127.0.0.1:4197/**.3-yig‘ish kodi: `output/phase11/manual-testing.txt`. Circle/Square’da bosh87% atrofida kattalashtirildi; iyak osti18px silliq oqartiriladi. “Yelkani qoldirish”, har yuzni siljitish/kattalashtirish bor. Heart juftligida yuzlar yuqori ikki bo‘lakka joylandi; bitta bosh yuqori qismda. “Ip soni”2000/2500/3000, taxmin4.4/5.6/6.7soat. Classic2 va eski yo‘riqnomalar saqlangan.

253unit testi va38ta brauzer holatining oxirgi natijalari o‘tdi; oxirgi hisoblar eng ko‘pi9.64soniya. Bir yuklama ostidagi sinov29.59s bo‘lgan: to‘liqunit bilan parallel ishga tushirilgan, diagnostika yashirilmagan. Keyin alohida Circle qayta sinovlari5.06/6.58s o‘tdi. Egasi lokal surati/3sun’iy portret/Square/Heart juftligi eski-yangi teng o‘lchamda solishtirildi; yuzlar kattaroq va aniqroq. Hisobot: `output/phase11/report.html`. Egasi manbasi avvalgi ishlov berilgan320px nusxa, asl surat emas.14PDF muqovasi ilovaga pikselma-piksel, barcha2500/3000qadam JSON/sektorlarga aynan mos.

APK: `output/mobile/ip-rasm-phase11-20261016-46bc061bd5c2-debug.apk`. Offline yig‘ish,43fayl, imzo va79eski APK saqlangani tekshirildi. Telefonga o‘rnatilmadi; native ishlab chiqarish serveri hali sozlanmagan. Kod/kreditni yangi brauzerda sinang.4194/4195/4196 serverlari va tmp/data tegilmadi; yangi4197 alohida bazada. Commitlar mahalliy, push yo‘q. Sinov tartibi `AGENT/OWNER_TESTS.md` da; chop/yig‘ish/telefon qabul sinovi sizda qoladi.

---

Quyidagi Phase10 hisobot tarixiy; joriy yo‘l yuqoridagi Phase11.

# Ip Rasm — yakuniy hisobot, 2026-10-16

## Phase10 — reference usuli va oddiy surat oqimi tayyor

Yangi ilova: **http://127.0.0.1:4196/**. Lokal3-yig‘ish kodi: `output/phase10/manual-testing.txt`. Eski4194/4195 va ma’lumotlari o‘zgarmadi. Yangi server alohida bazada; klassik usul2 standart tanlanadi:500px nishon,240mix,2500haqiqiy ulanish,1000px fizik preview,0.12mm ip/0.9shaffoflik. Surat darhol ko‘rinadi, oq fon/CLAHE/kontrast/kesish tayyor nishonda tekshiriladi. Player/PDF/TXT/JSON ayni ketma-ketlik va sektor belgilaridan foydalanadi; eski yo‘riqnomalar saqlanadi.

Uch sun’iy portret va avvalgi lokal egasi surati bilan desktop/mobilda12/12 sinov o‘tdi; eng sekin hisob9,45soniya. Egasi rasmining mavjud ishlov berilgan nusxasi ishlatildi, asl surat deb ko‘rsatilmadi. Natijalar yonma-yon ko‘rildi: yuzlar taniladi; reference bilan kesish farqi va ikki kishilik Heartdagi maydaroq/xiraroq yuzlar hisobotda ochiq yozildi. Hisobot: `output/phase10/report.html`. Suratlar Gitga kirmadi va boshqa saytga yuklanmadi.

To‘liq248unit/81fayl o‘tdi.36ta brauzer holatining oxirgi natijalari o‘tdi: asosiy12, regressiya24dagi22muvaffaqiyat/2qizil-ip xatosi, tuzatishdan keyin4/4qayta sinov. Bu200ta eski holatni to‘liq qayta bajarish degani emas.12PDFning1000px rasmi ilovaga aynan teng, har birining2500qadami JSONga to‘liq mos; muqova ham ko‘rildi. Build1967 o‘tdi.

Yangi debug APK: `output/mobile/ip-rasm-phase10-20261016-a3f7b2d756f7-debug.apk`. SHA256: `a3f7b2d756f7bf244b3821c4e81622667c570d010bf840cbafe7f0252d37ec67`. Offline Android yig‘ilishi3m25s;43veb fayl/reference markerlar/imzo tekshirildi,76eski APK aynan saqlandi. Dalil: shu prefiksdagi `-evidence.json` va `output/phase10/final-verification.json`. Telefon o‘rnatilishi/taxta sinovi qilinmadi; native ishlab chiqarish serveri hali sozlanmagan. Push qilinmadi. Keyingi egasi sinovi — yangi4196manzilida surat yuklash, tayyor nishonni tasdiqlash va kod bilan birinchi qadamdan yig‘ish.

Quyidagi bo‘limlar avvalgi bosqichlarning tarixiy dalilidir; eng yangi ilova4196 va yuqoridagi APK.

## Phase10 — reference usuli va oddiy surat oqimi tayyor

Yangi ilova: **http://127.0.0.1:4196/**. Lokal3-yig‘ish kodi: `output/phase10/manual-testing.txt`. Eski4194/4195 va ma’lumotlari o‘zgarmadi. Yangi server alohida bazada; klassik usul2 standart tanlanadi:500px nishon,240mix,2500haqiqiy ulanish,1000px fizik preview,0.12mm ip/0.9shaffoflik. Surat darhol ko‘rinadi, oq fon/CLAHE/kontrast/kesish tayyor nishonda tekshiriladi. Player/PDF/TXT/JSON ayni ketma-ketlik va sektor belgilaridan foydalanadi; eski yo‘riqnomalar saqlanadi.

Uch sun’iy portret va avvalgi lokal egasi surati bilan desktop/mobilda12/12 sinov o‘tdi; eng sekin hisob9,45soniya. Egasi rasmining mavjud ishlov berilgan nusxasi ishlatildi, asl surat deb ko‘rsatilmadi. Natijalar yonma-yon ko‘rildi: yuzlar taniladi; reference bilan kesish farqi va ikki kishilik Heartdagi maydaroq/xiraroq yuzlar hisobotda ochiq yozildi. Hisobot: `output/phase10/report.html`. Suratlar Gitga kirmadi va boshqa saytga yuklanmadi.

To‘liq248unit/81fayl o‘tdi.36ta brauzer holatining oxirgi natijalari o‘tdi: asosiy12, regressiya24dagi22muvaffaqiyat/2qizil-ip xatosi, tuzatishdan keyin4/4qayta sinov. Bu200ta eski holatni to‘liq qayta bajarish degani emas.12PDFning1000px rasmi ilovaga aynan teng, har birining2500qadami JSONga to‘liq mos; muqova ham ko‘rildi. Build1967 o‘tdi.

Yangi debug APK: `output/mobile/ip-rasm-phase10-20261016-a3f7b2d756f7-debug.apk`. SHA256: `a3f7b2d756f7bf244b3821c4e81622667c570d010bf840cbafe7f0252d37ec67`. Offline Android yig‘ilishi3m25s;43veb fayl/reference markerlar/imzo tekshirildi,76eski APK aynan saqlandi. Dalil: shu prefiksdagi `-evidence.json` va `output/phase10/final-verification.json`. Telefon o‘rnatilishi/taxta sinovi qilinmadi; native ishlab chiqarish serveri hali sozlanmagan. Push qilinmadi. Keyingi egasi sinovi — yangi4196manzilida surat yuklash, tayyor nishonni tasdiqlash va kod bilan birinchi qadamdan yig‘ish.

Quyidagi bo‘limlar avvalgi bosqichlarning tarixiy dalilidir; eng yangi ilova4196 va yuqoridagi APK.

## So'nggi tuzatish — yuklangan surat, 2026-10-16

Egasi surat tanlagan, ammo yangi Standart kit uni yopiq bo'limda yashirgan edi. Tuzatildi: “Yuklangan surat” asl/tayyorlangan rasmni darhol ko'rsatadi, fon holati ham ochiq.4195ni yangilab suratni bir marta qayta tanlang; eski sahifadagi surat faqat xotirada edi. Server/API/hisob/kreditlar o'zgarmadi, eski19 hashed fayl saqlandi. Oldingi vositalar alohida tugmada mavjud.

Yangi APK: `output/mobile/ip-rasm-photo-preview-20261016-f6cb7ddf0eea-debug.apk`. SHA256: `f6cb7ddf0eeadc86767b987c71fc6f13f7c45fb323e27280eee20dd1f399ffa7`. CLEAN output/photo-preview-fix-dist43 fayli va surat markeri APKda tasdiqlandi, imzo o'sha,73 eski APK saqlangan. Offline assembly3m59s; telefon/native production endpoint hali tekshirilmagan/ulanmagan.

Tuzatishdan keyin10/10 desktop/mobile holat3.9min o'tdi: haqiqiyRGB/o'lcham/yopiq bo'limlar/rasm almashtirish/to'rt til hamda eski8 kit oqimi. `test-results/photo-preview-fix-e2e/report.json`. Quyidagi184/unit/HTTP natijalari oldingi bosqich dalili; yangi186 to'liq qayta ishga tushirilgan deyilmaydi. Dalil: `output/photo-preview-fix/final-verification.json`.4194ning40 fayli aynan eski, serveriga so'rov/restart yo'q. Bu ko'rinish tuzatishi; oldingi sifat hukmi o'zgarishsiz.


Branch: `feat/full-roadmap`.8-bosqich talablari va9-bosqich standart kit mexanizmlari tayyor, tekshirildi va APK yig'ildi. Sinash: **http://127.0.0.1:4195/**. Kod/admin kirishi faqat mahalliy `output/phase9/manual-testing.txt` faylida; bitta hali ishlatilmagan3-kreditli kod bor. Bu yangi alohida sinov hisobi.4194-server, uning40 veb fayli va asl ma'lumotlar o'z holida qoldi. Push yo'q.

**QBRIX darajasidagi sifat tasdiqlanmadi.** Egasi suratining uch shaklida burun/lab hududlari mezondan o'tmadi. O'lchangan tizza1500 ulanish;2000–3000 qabul qilingan tavsiya emas. Umumiy MSE kamaygani hududiy sifat yo'qolishini oqlamaydi. Haqiqiy ikki kishilik Heart manbasi hali yo'q; bir kishilik surat ko'paytirilmadi.

## Bosqichlar

| Bosqich | Natija | Ochiq qolgan qabul |
| --- | --- | --- |
|0. Xavfsiz sinov | Alohida DB/portlar, himoyalangan yo'llar, haqiqiy browser regressiyasi. | Mustaqil ish qolmadi. |
|1. Tadqiqot | Ochiq kit jarayonlari/usullar/litsenziyalar hujjatlangan. | Raqib aktivlari/kodi/yopiq kit ko'chirilmagan. |
|2. Sifat | Muzlatilgan tashxis va v17/nazorat; v17 rad etilgan, o'z-o'zidan asosiyga o'tkazilmagan. | O'xshashlik yaxshilanishi tasdiqlanmagan; rad etilgan tajribalar takrorlanmaydi. |
|3. Umumiy yadro | Alohida18:1–3 odam/hayvon/buyum, haqiqiy Worker/recovery/aniq eksport. | Haqiqiy guruh/hayvon/buyum suratlari va taxta qabuli kerak. |
|4. Matn/andoza | Lotin/kirill/arab, OFL shrift/qo'shilish, to'ldirish18 va kontur19, fizik ulanishlar. | Taxtada o'qilish; aralash arab+lotin/kirill bitta qator qo'llanmaydi. Ism+portret kompozitsiyasi alohida koordinata shartnomasi yo'qligi sabab keyinga qolgan. |
|5. Kit/kredit | Bitta hisobga kod, imzolangan offline ruxsat, qayta urinish ortiqcha sarflamaydi, admin QR/CSV. Yangi standart3, admin4ni ham saqlaydi; eski berilgan kreditlar o'zgarmadi. | Jonli savdo/ishlab chiqarish serveri yoqilmagan. |
|6. QBRIX taqqoslash | Ochiq faktlar va mahalliy to'plash yo'riqnomasi tayyor. | Bir xil asl surat/kesish va ruxsat etilgan QBRIX natijasi kerak; raqibdan yaxshiroq degan xulosa yo'q. |
|7. Ekran/ovoz/Android | Bitta controller/ekranlar, offline mexanizm, ikki instruktor sloti, TTS/matn, APK tekshirildi. | Haqiqiy yozuv0/746, telefon sinovi bajarilmagan. |
|8. Classic/fon/kesish | Alohida classic-greedy/1, avtomatik oq fon/xatoni ko'rsatish, haqiqiy yuzlarni ko'rib tasdiqlash, face-fill va qat'iy recovery. Oldingi vositalar saqlangan. | Yangi haqiqiy crop/fonning egasi qabuli; sifat g'olibi yo'q. |
|9. Standart kit | Uch profil, bitta720 nuqtali asos, tarixli admin sozlamalari, haqiqiy PDF/sektorlar, haqiqiy qizil qo'shimcha yo'l20,3-kredit, vaqt/tizza va9-case A/B, build/APK. | Sifat talabi qabul qilinmagan; haqiqiy2-kishilik Heart, fizik chop/teshish/yopish va telefon qabuli kerak. |

## Kit va chop

Vaqtinchalik egasi standartlari: oq500×500mm MDF, doira460mm/240mix, kvadrat470mm/240mix, yurak390mm chegaraviy maydon/240mix, qora0.12mm monofilament. Yurakda ko'pi bilan2 odam va ixtiyoriy haqiqiy ikkinchi rangli chegara bor; ko'priklar ham ulanish/metr/vaqtga qo'shiladi. Bitta asosda720 alohida nuqta, eng yaqin markazlar3.004948mm.1.5mm teshik/3mm markaz oralig'i/10mm chet va material shaffofligi taxmin; haqiqiy MDF/mix mustahkamligi avtomatik qabul qilinmagan.

`output/phase9/templates/`:

- `standard-kit-sheet.pdf`:1:1,500×500mm.
- `standard-kit-tiles.pdf`:6 A4,10mm ustma-ust tekislash.
- `standard-kit-stickers.pdf`:18 A4, tanlangan shaklning6 sahifasi. Kvadrat/pastki yurak tashqariga, yuqori yurak ichkariga qaraydi; alohida sektor tasmalarini kesing.
- `coordinates.json`: aynan shu720 nuqta/tick, r1/config SHA `5c9bc84d400210a1dfa791a5f26d00ff027f47d540d7cce3f7973701b7418041`.

Barcha sahifada50mm belgi.100%/Actual size, Fit o'chiq: avval belgini o'lchang, keyin nuqtalarni belgilang/teshing va faqat tanlangan naqsh yorliqlarini tickdan mixga tekislang. Qog'ozdagi versiyani ilovada tanlang; admin yangi sozlama saqlasa eski versiya ham qoladi. Saqlanmagan admin o'zgarishidan PDF chiqmaydi. Yorliq/player/PDF/TXT/JSON A-1…D-60 yoki8×30; raqamli nail ID ham saqlanadi. B-17 ovozda harf va o'n yetti; hozir qurilma ovozi/matn, yozib olingan instruktor yo'q.

## Tekshiruv dalillari

| Tekshiruv | Yakuniy natija / dalil |
| --- | --- |
| Unit | To'liq241/241: `test-results/phase9-final-full-unit.json`; keyingi PDF tuzatishi5/5: `phase9-ruler-layout-final-unit.json`,4×60/8×30 burchak/uch yorliqlari ham.242 to'liq qayta ishga tushirilgan deb aytilmaydi. |
| Brauzer |184 noyob yakuniy holat,92desktop+92mobile: `test-results/phase9-final/summary.json`. To'liq168o'tdi/16xato(54.66min), tuzatilgan26dan24o'tdi/2admin-tartib xatosi, keyin alohida admin2/2(31.5s). Asl hisobotlar saqlangan; bu bitta toza to'liq184 run emas. |
| Sabab/tuzatish | Ikki test barcha main tugmalarni sanagan; oltita Worker testi eski distdan fayl nomini olgan; admin testi oldingi test4 saqlashiga bog'langan. Aniq yo'l/scoped assertion va adminning o'zi4ni saqlashi bilan tekshirildi; mahsulot cheklovlari yumshatilmadi. |
| HTTP | Mijoz37/37, xodim67/67, kit48/48; yangi alohida DBlar. `output/product-evidence/customer-http.json`, `output/completion/staff-http.json`, `test-results/kit-http-R4NJ0F/report.json`. |
| Build |1965 modul, hozirgi toza build `output/photo-preview-fix-dist`;4195dagi phase9-dist qo'shimcha eski fayllarni ham saqlaydi. Oldingi chunk/dynamic-import ogohlantirishlari bor. |
| Fizik PDF |25 sahifa/50mm/o'lchamlar/720 ko'rinadigan to'qnashmaydigan yorliq tekshirildi. Haqiqiy browser ikki sheet720nuqtasi xatosi≤1.28e-13mm; ikkala sticker720yorliq/to'qnashuv0. `test-results/phase9-final/manufacturer-pdf-verification.json`. Bu haqiqiy chop/teshish qabuli emas. |
| Android | Offline app/test assembly3m56s o'tdi;43 veb fayl, markerlar/shrift/litsenziyalar/maxfiy fayl yo'qligi/imzo/min24/target36 tekshirildi.70 eski APK byte bir xil. `docs/STANDARD_KIT_APK_CHECKPOINT.md`. |
| Jonli eski ilova | Distdagi40 fayl avvalgi dalil SHA bilan aynan bir xil;4194ga so'rov/restart qilinmadi. |

## A/B va cheklovlar

`output/phase8/report.html` va `output/phase9/report.html`: muzlatilgan protokol,96 aniqlik, bir xil nishon/material/koordinata, A eski greedy-optical/4, B classic/1. B2500 hamda3500 chegaralaridan haqiqiy sifat–ulanish egri chizig'i.9 yangi kit holatidan5 sonli hududiy mezondan o'tgan; bu vizual qabul emas. Egasi doira/kvadratda burun, yurakda og'iz mezoni o'tmagan; ikki sintetik yuzli yurak ham barcha hududiy mezondan o'tmagan. Egasi uch shaklida tizza1500, haqiqiy yakuniy qora ip1695–1741 atrofida, taxmin3.77–3.87soat(8soniya/ulanish).2000–3000 majburan tavsiya qilinmadi. Boshlang'ich2500 limit o'lchangan qabul qilingan tavsiya degani emas.

Egasi ishlatilgan manba avvalgi mahalliy tayyorlangan bir kishilik crop; yangi avtomatik fon/kesish qabuli yoki haqiqiy ikki kishilik yurak o'rnini bosmaydi. Raqib rasmi/kodi/qo'llanmasi ko'chirilmagan, surat tashqi saytga yuborilmagan.

## Oldingi Phase9 APK va dastlabki sinov ishga tushishi (tarixiy)

APK: `output/mobile/ip-rasm-standard-kit-20261015-5f6c68918c50-debug.apk`

SHA256: `5f6c68918c503de0e4a94ecde0af85d9ac8fb3040a52ffd5bd326d10d9b8b319`

Dalil/test APK: `output/mobile/ip-rasm-standard-kit-20261015-5f6c68918c50-evidence.json` va shu nomdagi `-debug-androidTest.apk`. Turkum15-oktabrda boshlangan; haqiqiy yig'ilish16-oktabr. Agent telefonga o'rnatmadi va instrumentationni qurilmada bajarmadi. Native ishlab chiqarish HTTPS serveri sozlanmagan; kit-kreditning to'liq sinovi hozir4195 brauzerda. Jonli savdo/release yoqilmagan.

4195/API4465 launcher30700/child25136 ishlaydi; alohida `test-results/owner-standard-k5cJII/database.sqlite`, asl baza emas. HTML va asosiy JS yakuniy buildga aynan mos; r1/240mix/500mm, yangi3 kredit, bitta ishlatilmagan kod va0hisob tekshirildi. Dalil `output/phase9/manual-preview-verification.json`. Kodlar/tokens faqat mahalliy `manual-testing.txt`da; chat/Gitga chiqarilmagan. Codex oynasi so'rovi queued, standart brauzerga ham4195ni ochish yuborildi.

## Egasi bajaradigan ish

1.4195ni oching, `manual-testing.txt`dan sinov kodini oling. Bu alohida sinov hisobi.
2. Kerakli PDFni100% chop eting,50mmni o'lchang. Sinov taxtasida nuqtalarni belgilab/teshib, tanlangan sektor yorlig'ini aniq tekislang; versiyani mos tanlang.
3. Surat → shakl/haqiqiy yuzlar(max2 Heart)/oq fon/kesishni tasdiqlash → hisoblash. Bepul metr/soatni ko'ring; sifatni o'zingiz tekshiring.
4. Saqlash → kod →1 kredit bilan ochish → ko'rsatilgan birinchi mixdan boshlash. Tasdiqlamaguncha progress0; qayta yuklash/offline saqlansin. Bir natijani qayta ochish ortiqcha kredit olmasin.
5. B-17ning qog'oz/player/PDF/raqamli ID/ovozi mosligini, qizil tanlansa haqiqiy ikkinchi segment va jami metr/soatni tekshiring. Natijani `AGENT/OWNER_TESTS.md`ga yozing.

Qolgan kiritmalar: haqiqiy2kishilik Heart va boshqa qabul suratlari; ruxsat etilgan QBRIX bir xil manba/natijasi; ikki instruktor uchun jami746 rozilikli WAV(0 mavjud); fizik/telefon qabul natijalari va keyinchalik ishlab chiqarish endpoint/release qarori. Hisob/parol/kit kodini chatga yuborish kerak emas. Mustaqil kod/build/APK ishlari tugagan; yuqoridagi sifat va qabul natijalari bajarildi deb yozilmaydi.

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


## 8–9-bosqich mahalliy commitlar

`f002552` reja; `b02d516` classic/fon/kesish; `c6d409a` fizik profil/admin/PDF; `2a2afa1` sektor/qizil/ovoz/A-B; `6f6abe5` kit versiyalari; `4ac6460` yorliq burchak/uch tuzatishi; `84f3291` haqiqiy PDF download/sinov protokoli; `c5f5bdf` to'liq run checkpoint; `30cf924`184 yakuniy holat; `e01ac6e` APK dalillari. Yakuniy handoff commitining aniq hashi `git log -1 --oneline`da. Push/reset/force yo'q; surat/DB/output/maxfiy fayllar Gitga kirmagan.

Surat ko'rinishi tuzatishi: `345c0cd` kod/10 sinov; `d6f5fe7`4195ga xavfsiz yangilash; oxirgi APK/handoff commitini `git log -1 --oneline`dan ko'ring.
