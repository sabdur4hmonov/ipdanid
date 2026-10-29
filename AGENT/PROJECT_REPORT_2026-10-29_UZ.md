# Ip Rasm — barcha rejalar, bajarilgan ishlar va qolganlar

**Holat: 29.10.2026.** Hisobot MASTER_PLAN, PROGRESS, C01–C28 ishlar ro‘yxati va saqlangan sinov dalillaridan tuzildi. Tekshirilgan funksional nusxa manbasi: `a612625`, `feat/full-roadmap`.

## 1. Hozirgi holat

**Sayt va Androidning funksional sinov nusxasi tayyor. Haqiqiy savdo uchun ommaviy xizmat hali ishga tushirilmagan. Mayda burun/o‘xshashlik masalasi ochiq.**

| Narsa | Hozirgi holati |
| --- | --- |
| Sayt | [http://127.0.0.1:4217/](http://127.0.0.1:4217/) — shu kompyuterdagi saqlangan sinov nusxasi |
| API | `http://127.0.0.1:4657/api`; sayt va hozirgi APK shu xizmatga mo‘ljallangan |
| Android | [Debug APK](../output/mobile/ip-rasm-phase16-20261029-be6e489bff81-debug.apk), taxminan 36,3 MiB |
| Test kodlari | [Mahalliy yo‘riqnoma](../output/phase16/manual-testing.txt): 3 ta kod, har biri 3 ta yangi ish uchun. Admin ma’lumoti ham shu shaxsiy faylda |
| Manba | [GitHub — feat/full-roadmap](https://github.com/sabdur4hmonov/ipdanid/tree/feat/full-roadmap) |
| Millionlik zaxira | Haqiqiy 1 000 000 ta kod chiqarilgan, har biri 3 ta ish uchun; yopiq baza va shifrlangan eksportda |
| Production | Domen/VPS, haqiqiy merchant kalitlari va egasining faollashtirishi hali kerak |
| Sifat | Eng yaxshi tekshirilgan natija saqlangan; P16.1 — mayda burun detali — yopilmagan |

`127.0.0.1` internetdagi ommaviy domen emas. APKni boshqa telefonga ko‘chirishning o‘zi yangi hisoblash uchun yetmaydi: USB sinovida `adb reverse tcp:4657 tcp:4657` yoki o‘z HTTPS API manzili kerak. Ochilgan, qurilmaga saqlangan yig‘ish yo‘riqnomasi bilan offline davom etish mumkin; yangi ipli natijani hisoblash serverni talab qiladi.

## 2. Asosiy mijoz oqimi

1. **Rasm tanlash:** galereya yoki kamera.
2. **Moslash:** Doira/Kvadrat/Yurak; fonni oq qilish, rasmni surish, zoom, burish, qaytarish, oldin/keyin ko‘rish. Hayvon, buyum va yozuv uchun ham yo‘llar bor.
3. **Natija:** haqiqiy iplar bilan qanday chiqishini bepul ko‘rish; ulanishlar va taxminiy vaqtni ko‘rish; qayta moslash.
4. **Yig‘ish:** quti kodini kiritish, aynan shu ishning to‘liq yo‘riqnomasini ochish. Parol majburiy emas.
5. **Davom etish:** katta sektor belgisi, oldingi/keyingi, bajarilgan qadamni tasdiqlash, ovoz, dam olish, saqlangan joydan qaytish.

Ko‘rinishni bepul ko‘rish bilan tartibli bajarish yo‘lini ochish alohida. O‘sha ochilgan ishga qayta kirish yangi kredit sarflamaydi. PDF/TXT/JSON va tartibli animatsiya ham ochish huquqiga bog‘langan.

Sayt va keyingi Android bir production API/bazaga ulanganda hisob va ochilgan ishlar umumiy bo‘ladi. Shaxsiy suratning hisobdagi zaxirasi alohida rozilik bilan; qurilmadagi barcha fayllar avtomatik ko‘chadi degan va’da yo‘q.

## 3. Standart fizik kit

| Parametr | Hozirgi standart |
| --- | --- |
| Taxta | 500 × 500 mm, ya’ni 50 × 50 sm; oq MDF standart profili |
| Doira | Diametri 460 mm, ya’ni 46 sm |
| Shakllar | Doira, Kvadrat, Yurak |
| Mix | Har tanlangan shakl uchun 240 ta |
| Umumiy andoza | Uch shaklning 720 ta alohida teshik nuqtasi bitta bazada hisoblangan; bitta ishda tanlangan naqshning 240 ta mixi ishlatiladi |
| Ip | Qora, 0,12 mm monofilament standart profili |
| Belgilar | A1–A60, B1–B60, C1–C60, D1–D60; playerda masalan `B-17 → C-42` |
| Asosiy ulanishlar | 3000; Batafsilda 2500/3000/3500 |
| Vaqt | 8 soniya/ulanish hisobida 3000 ulanish taxminan 6,7 soat; haqiqiy odam tezligi alohida |
| Chop etish | Bitta 500 × 500 mm PDF, A4 bo‘laklar, 50 mm kalibr chizig‘i, mos sektor stikerlari |

Teshiklar to‘qnashmasligi dasturda tekshirilgan. Bu haqiqiy taxtani teshib, ip tortib sinash o‘rnini bosmaydi. Taxta qalinligi, mix diametri, ipning haqiqiy qalinligi/tarangligi va kerakli uzunligi amalda o‘lchanadi. [Taxta yo‘riqnomasi](../docs/PHYSICAL_BOARD_UZ.md), [yasash paketi](../docs/BUILD_TODAY_UZ.md).

## 4. Rejaning bosqichlari

| Bosqich | Reja va natija |
| --- | --- |
| R1/R2 va 0 | Manbani saqlash, testlar uchun alohida bazalar/portlar, rasm turini va odamlarni ko‘rib tuzatish mexanizmlari yaratildi |
| 1 | QBRIX va boshqa usullar/bozorlar o‘rganildi. Marketing bilan isbotlangan algoritm ajratildi |
| 2–3 | Turli ip optimizatorlari, yagona uzluksiz yo‘l, umumiy rasm rejimlari, aniq ko‘rinish/eksport va qayta tiklash kontraktlari qilindi. Bir necha sifat tajribasi rad etildi; hammasi yaxshilanish deb olinmadi |
| 4 | Ism/sana, lotin/kirill/arabcha va aralash yozuvlarni rasmga kiritish, shriftlar va eksportlar |
| 5 | Quti kodi, kreditlar, bir egaga bog‘lash, bepul qayta ochish, batch/QR/PDF, tarix/bekor qilish |
| 6 | QBRIX taqqoslash usuli va fayl yig‘ish yo‘riqnomasi. To‘liq bir xil kirishdagi real QBRIX natijasi bilan ustunlik isbotlanmagan |
| 7 | Interfeys, ovoz mexanizmi, Android/iOS loyihalari va APKlar. Haqiqiy instruktor kliplari hali yo‘q |
| 8 | Klassik hisob, oq fon, yuz joylashtirish va kit profili. 96 px tajribasining sifati qabul qilinmadi |
| 9 | Standart uch shakl, umumiy teshish andozasi, sektorlar/stikerlar, 3 yig‘ishli kodlar |
| 10 | Referens asosidagi `classic-greedy/2`, 500 px tayyorlov, oddiy JPG yuklash/preview tuzatildi |
| 11 | Kattaroq yuz, iyakdan pastni oqartirish, yurakda ikki boshni joylashtirish, pan/zoom va vaqt bahosi |
| 12 | Oddiy uch bosqichli yaratish, to‘g‘ridan-to‘g‘ri moslash, natijadan joylashuvni yo‘qotmay qaytish |
| 13 | `classic-greedy/3`, yangi baholash, kvadrat o‘q chiziqlari uchun guardlar, SSIM taqqoslashlari |
| 14 | Uzoq yig‘ish, server/deploy, native API, sandbox to‘lov, Admin/dastavka va hujjatlar |
| 15 | Quyidagi C01–C28 qo‘shimcha mahsulot/biznes/xavfsizlik kodlari va keng regressiya yopildi |
| 16 | Haqiqiy millionlik kod, serverda himoyalangan hisoblash, qotirilgan server nusxasi, Admin/dastavka va yangi Android tayyor. Faqat P16.1 sifat masalasi agent tomonda ochiq |

Eski rejalarda saqlangan `no/partial/OPEN` satrlarining ayrimlari tarixiy holatdir. Joriy baho PROGRESS boshidagi yozuv, C01–C28 ro‘yxati va Phase16ning sanali dalillariga asoslangan.

## 5. Phase15dagi barcha qo‘shimcha ishlar — C01–C28

Bu jadvaldagi “tayyor” kod va qayd etilgan dasturiy sinovni bildiradi. Haqiqiy mahsulot materiali, telefon yoki tashqi xizmatning qabulini alohida belgilaymiz.

| ID | Rejalashtirilgan ish | Qilingan ish / chegara |
| --- | --- | --- |
| C01 | Portret ostida ism/sana | Uch shaklda matnni o‘sha target va ip ketma-ketligiga kiritish tayyor |
| C02 | Aralash arabcha + lotin/kirill | RTL/LTR yo‘nalish, arabcha shakllanish, raqam/tinish belgilari va shriftlar tayyor |
| C03 | Push xabarlari | FCM adapteri, qurilma tokeni, rozilik, Admin jo‘natishi/retry tayyor; haqiqiy Firebase/APNs ulanishi kerak |
| C04 | Mozaika | Palitra, zaxira/dona, asos qismlari, ko‘rsatma va eksport tayyor; haqiqiy material kalibri alohida |
| C05 | Diamond va bo‘yash | Katak/qadam, palitra, hisob, bo‘yash hududlari/yorliq, progress/PDF tayyor |
| C06 | QR string-art | Haqiqiy dekoderda o‘qilgan QR naqsh/andoza/yo‘l tayyor; maxsus yassi ip materiali, fizik skan hali tekshiriladi |
| C07 | Kitob buklash | Sahifa bo‘yicha mm belgilari, matn/sana/shakl, progress, ovoz va eksport tayyor |
| C08 | Time-lapse/video/GIF | Manba suratini ustiga qo‘yish emas, aynan iplarning tartibli paydo bo‘lishidan eksport tayyor; telefon kodeki alohida |
| C09 | 3D ramka/model/qatlam | O‘zimizning geometriya, aylantirib ko‘rish, STL/SVG/JSON/PDF tayyor; fizik moslik sinovi kerak |
| C10 | Bolalar/karton/Ebru darslari | Original chizmalar, bosqichlar, andozalar, saqlash va ovoz tayyor; professional foto/video ixtiyoriy keyin qo‘shiladi |
| C11 | Mijoz galereyasi/sharh/moderatsiya | Rozilik, tayyor natijani yuborish, tasdiqlash/rad etish, o‘chirish va maxfiylik tayyor |
| C12 | Promo/referral va hisob | Limit/muddat, server narxi, takror ishlatishdan himoya, tavsiya va hissa hisoblash tayyor; avtomatik real pul tarqatish yo‘q |
| C13 | B2B | Hamkor portali, alohida huquqlar, katta partiya kodlari, qabul qilish havolalari va QR tayyor |
| C14 | Katalog va hududlar | Variant/refill/bundle, material/davlat/valyuta, ombor va serverda buyurtma/dastavka narxi tayyor |
| C15 | Sovg‘a/maxsus buyurtma/app mahsuloti | Sovg‘a huquqi, qabul qilish, buyurtma ko‘rib chiqish/narx tasdig‘i/to‘lovdan keyingi holatlar tayyor |
| C16 | Xabar va to‘lovni moslashtirish | Outbox/inbox, qayta urinish, holat/audit, provider interfeysi tayyor; real xabar/real bank oqimi yoqilmagan |
| C17 | Rozilikli statistika | Belgilangan metrikalar, owner agregati, eksport/o‘chirish tayyor; foto mazmuni yig‘ilmaydi, odamning fizik ishini avtomatik isbotlamaydi |
| C18 | Fon/qulf ekranidagi yig‘ish ovozi | Android foreground/media boshqaruvi, sessiya himoyasi tayyor; ixtiyoriy, haqiqiy telefonda hali tekshiriladi |
| C19 | Mahalliy ovozli buyruqlar | Ruxsatlar, cheklangan buyruqlar, bekor qilish/manual fallback tayyor; tajribaviy, shovqindagi aniqlik isbotlanmagan |
| C20 | Kamera bilan checkpoint | Qurilmada surat, ayni qo‘llanma/qadam bilan bog‘lash, qo‘lda taqqoslash/o‘chirish tayyor; mix to‘g‘riligini avtomatik tekshiruvchi tizim emas |
| C21 | Sync/tiklash/saqlash | Konfliktli qadam, hisob/rasm zaxirasi, o‘chirish/TTL, backup/jurnal va tiklash kodlari tayyor |
| C22 | To‘rtta til | UZ lotin, UZ kirill, RU, EN; yo‘q kalitda CI yiqiladigan tekshiruv tayyor. Oxirgi tekshiruv: 80 lug‘at, 1812 kalit |
| C23 | Mobil tezlik | Asosiy sahifa sekinlashtirilgan sinovlar, progress/responsivlik va yengilroq boshlang‘ich yuklash tayyor. Workerning haqiqiy 4×/telefon ishlashi qabul qilinmagan |
| C24 | Xavfsizlik | Auth/huquq/rate/body limitlari, imzo/idempotency, CSP, fayl maxfiyligi, disk/retention va auditlar tayyor |
| C25 | Kodni tozalash | Oddiy oqimdan og‘ir maxsus oynalar ajratilgan; eski qo‘llanmalar uchun kerakli engine saqlangan; bitta fontkit chunk ogohlantirishi qolgan |
| C26 | Qo‘llanma/release/CI/PR | Runbook, build/release scriptlari, sinovlar, APK va sayt tayyor; PR uchun `main` bazasi yo‘q |
| C27 | Sinovlarni ajratish | Eski port/nusxa/bazalarni saqlash, yangi test bazalari, dalillar va commit protokoli qo‘llangan |
| C28 | Instagram sinovi va checkout | Budjet/limitli trial kodi, alohida raqamli ochish, Shop/Orders va sandbox checkout tayyor; kampaniya o‘chiq, follow scraping/avtomatik DM jo‘natish yo‘q |

Bu qo‘shimcha craft mahsulotlari asosiy 0,12 mm portret kitining o‘zi bilan bir xil material talab qiladi degani emas. Har birining o‘z andoza/material parametri va fizik sinovi bor. Maxsus/tajribaviy vositalar Menu/Mutaxassis rejimida saqlangan. Rangli/maxsus engine va eski yo‘riqnomalar ham saqlangan; asosiy himoyalangan standart portret oqimi qora ip bilan ishlaydi. Rangli ishning fizik sifati alohida qabul talab qiladi.

## 6. Phase16da yana nimalar qilindi?

### Million kod va uchta yig‘ish

- 1 000 000 ta kod haqiqatan yaratildi; faqat ekranga raqam yozilmadi.
- Har biri kriptografik tasodifiy 24 bayt, ya’ni 192 bit. Taxmin bilan topish ehtimoli juda kichik; mutlaq imkonsizlik va’da qilinmaydi.
- Bazada ochiq kod o‘rniga HMAC xesh bor; chop etish eksporti AES-256-GCM bilan shifrlangan.
- Har bir eksport qatori bazadagi xeshga tekshirildi; sinovlar qaytarilgani uchun asosiy millionlik zaxira ishlatilmagan.
- Quti kodi bilan kirish, uchta boshqa ishni ochish, to‘rtinchisini rad etish va qayta ochishda yana kredit olmaslik tekshirildi.
- Oddiy Admin bir millionlik ochiq ro‘yxatni brauzerga yuklamaydi. Internetdagi batch chegarasi 100; millionlik chiqarish offline owner vositasi bilan.
- Yangi 4217 sayti asosiy bazaning alohida sandbox nusxasida. Uchta qo‘lga beriladigan test kodi alohida; avtomatik tekshiruvda to‘rtinchi kod ishlatilgan.

[Zaxira va chop etish yo‘li](../docs/KIT_MILLION_UZ.md). Kalitlar, kodlar, baza va suratlar GitHub/APK tarkibiga qo‘shilmagan.

### Himoyalangan hisoblash

- Oddiy production oqimining ip hisoblash ishi serverga ko‘chirildi; oldin faqat statik PNG beriladi.
- Tayyor qora-oq hisoblash rasmi serverga yuborilishi foydalanuvchiga tushuntiriladi. Asl surat zaxirasi boshqa, alohida rozilikli amal.
- Ochilgan yo‘riqnoma imzo/egalik bilan bog‘langan; bir ishni ikki marta kreditdan yechmaslik himoyasi bor.
- Navbat, vaqt, xotira, saqlash va so‘rov limitlari qo‘yilgan.
- Server manbasi va o‘rnatilgan kutubxonalar alohida nusxaga olindi: 20 769 fayl, taxminan 381 MB. Keyingi repo tahriri shu owner nusxasining yangi hisobini o‘zgartirmaydi.
- Brauzerga berilgan JavaScriptni butunlay yashirib bo‘lmaydi. Oldin berilgan client algoritmlarini ham qaytarib olib bo‘lmaydi; maxfiy kalitlar va ochilmagan yo‘riqnomalar serverda himoyalanadi.

### Admin, savdo va Android

- Kodlar/kreditlar, buyurtmalar, narxlar, hudud/dastavka, e’lonlar va maxfiy zaxira holati oynalari bor.
- Olib ketish/kuryer tanlovi, ombor, narx, takror urinishda ayni buyurtma, to‘lov callback/imzo/idempotency tekshirildi.
- Click/Payme hozir **sandbox**. Haqiqiy pul yechilmaydi va real kuryer jo‘natmasi bajarilgan deb ko‘rsatilmaydi.
- Android APK aynan tekshirilgan 122 ta web fayli bilan yig‘ildi; oldingi imzo saqlandi.
- 98 ta oldingi arxiv yozuvi o‘zgarmagani va uchta haqiqiy shaxsiy kalit qiymati APKda yo‘qligi tekshirildi.
- Release imzosi uchun egasining kelajak keystore fayliga mo‘ljallangan script bor; egasining release kaliti yaratilmagan.

## 7. Saqlangan haqiqiy natijalar

| Tekshiruv | Natija va chegarasi |
| --- | --- |
| To‘liq unit | 741/741 o‘tgan, failed/pending 0 |
| Joriy desktop/mobil moslik matritsasi | 81 fayl, 161 yangi API ishi, 348 qabul qilingan holat; yakuniy qabulda skip/flaky/unexpected 0 |
| Himoyalangan oddiy oqim | Alohida 7 ta desktop/mobil/native-bridge holati; bular 348ning production rejimidagi nusxasi deb aytilmaydi |
| Owner nusxasi | Haqiqiy millionlik Admin, rasm → natija → kod → ochish → 1-qadamni saqlash → qayta kirib o‘sha hash/qadamdan davom etish o‘tgan |
| Rasm/server tengligi | 12 ta oldingi qabul qilingan nazoratda butun ip ketma-ketligi/xeshi va 1000 px RGBAning har bir bayti teng |
| Server hisoblash vaqti | Tayyor targetdan 12 nazoratda 3,020–5,710 soniya; bu rasm tanlash/tahlilning butun vaqti emas |
| Oddiy himoyalangan UI vaqti | Alohida sinovda tayyorlashdan keyingi Yaratish → natija: desktop 10,494 s, mobil 11,131 s |
| Mobil sekinlashtirish | 4 ta sahifa-CPU holatida 4,29–5,60 s; Worker o‘zi 4× sekinlashtirilmagan, haqiqiy telefon deb olinmaydi |
| Oxirgi build | TypeScript/Vite o‘tgan, 2145 modul, Vite 18,62 s; alohida tekshiruv katalogi ishlatilgan |
| Android | Offline Gradle 2 daqiqa 28 soniya; 122 fayl va eski sertifikat mos |
| npm audit | 0 zaiflik |
| a612625 topshirish skani | 97 commitlik export farqlari va 5399 mavjud Git obyektida tekshiruv; taqiqlangan yo‘l/tanilgan maxfiy pattern topilmagan. Bu har qanday noma’lum sirni matematik istisno qiladi degani emas |

Dastlabki xatolar, diagnostika va qayta sinovlar saqlangan; barcha ish birinchi urinishda xatosiz bo‘lgan deb ko‘rsatilmaydi. Eski bosqichlardagi test sonlari yangilariga qayta qo‘shilmagan.

Dalillar: [runtime](../docs/validation/phase16-runtime-snapshot-20261028.json), [348 holat](../docs/validation/phase16-matrix-20261029.json), [APK](../docs/validation/phase16-apk-20261029.json), [owner nusxasi](../docs/validation/phase16-handoff-20261029.json).

### Ko‘rish uchun rasm natijalari — faqat mahalliy

- [12 ta tayyor target / oldingi natija / server natijasi yonma-yon](../output/phase16-private/runtime-parity-complete/report.html).
- [Oxirgi original surat taqqoslashlari](../output/quality-original-20261026/final-review.html).
- Alohida saqlangan natijalar: [Doira](../output/phase16-private/runtime-parity-complete/original-circle/protected.png), [Kvadrat](../output/phase16-private/runtime-parity-complete/original-square/protected.png), [Yurak](../output/phase16-private/runtime-parity-complete/original-heart/protected.png).

Bu suratlar GitHubga yuklanmagan. Serverga ko‘chirishdagi tenglik yangi burun yaxshilanishi degani emas.

Texnik sifat qaydi: joriy original Doira nazoratida yuz SSIM ≈ 0,61585, burun ≈ 0,49653. Bu “61,6% o‘xshaydi” degani emas; bir xil target/materialdagi tajribalarni solishtirish uchun metrika. Kvadrat va yurakning alohida natijalari yuqoridagi mahalliy hisobotda.

## 8. Nimalar chindan ochiq qoldi?

### Agent tomonda — P16.1

**Mayda burun va umumiy fotografik o‘xshashlikni yana yaxshilash.** Hozir bu yopilgan deb aytilmaydi. Tashqi kalit yoki sizdan yangi surat kelishini kutayotgan CODE bandi sifatida yashirilmaydi.

Klassik v3 va joriy tayyorlov eng yaxshi tekshirilgan holatda saqlangan. Qator yangi algoritm/kernel/yo‘l/material/Radon sinovlari yomonroq yoki bir xil chiqib, rad etilgan. Ularni yana bir xil parametr aylantirish bilan takrorlash yangi yechim hisoblanmaydi. Keyingi urinishdan oldin boshqacha usulning fizik renderer bilan mosligi mustaqil sinovda isbotlanishi, keyin bir xil sharoitdagi surat taqqoslanishi kerak.

QBRIX, Xitoy bozoridagi tizimlar, GitHub, YouTube ma’lumotlari va Play Marketning ochiq manbalari o‘rganildi. Bir xil kit/suratda isbotlangan yaxshiroq almashtiruvchi topilmadi; yopiq QBRIX algoritmi aniqlangan yoki APKlar dekompilyatsiya qilingan deb aytilmaydi. [Tadqiqot](../docs/PLAY_MARKET_RESEARCH_20261028.md).

### Production/haqiqiy qabul — tashqi ishlar

| Band | Nima kerak? | Tayyor yo‘l |
| --- | --- | --- |
| O01 | Domen, VPS, DNS, HTTPS va doimiy production baza | [DEPLOY_VPS_UZ.md](../docs/DEPLOY_VPS_UZ.md) |
| O02 | Android release keystore va do‘kon hisoblari | [APK_SERVER_AND_SIGNING_UZ.md](../docs/APK_SERVER_AND_SIGNING_UZ.md), `scripts/build-release.ps1` |
| O03 | Click/Payme merchant kalitlari va haqiqiy savdo/qaytarish siyosati | [PAYMENTS_UZ.md](../docs/PAYMENTS_UZ.md) |
| O04 | Haqiqiy instruktor ovozlari va talaffuz tekshiruvi | [VOICE_RECORDING_UZ.md](../docs/VOICE_RECORDING_UZ.md), [yozuvlar ro‘yxati](../docs/VOICE_RECORDING_LIST.csv) |
| O05 | Real QBRIX natijasi bilan bir xil kirishda taqqoslash istalsa, ruxsatli fayllar | [QBRIX_COMPARE_HOWTO_UZ.md](../docs/QBRIX_COMPARE_HOWTO_UZ.md); bu P16.1ni egaga topshirish emas |
| O06 | Taxta/mix/ip, bosma kalibr, taranglik va oxirigacha fizik yig‘ish | [PHYSICAL_BOARD_UZ.md](../docs/PHYSICAL_BOARD_UZ.md); qo‘shimcha craft materiallari ham alohida sinaladi |
| O07 | Eng so‘nggi APKni haqiqiy Androidda kamera/ovoz/offline/batareya/tezlik bo‘yicha sinash | [APK yo‘riqnomasi](../docs/APK_SERVER_AND_SIGNING_UZ.md) |
| O08 | Mac/Xcode, iPhone va iOS imzosi/buildi | [IOS_UZ.md](../docs/IOS_UZ.md) |
| O09 | Haqiqiy push kerak bo‘lsa Firebase/APNs va ruxsatli qurilma tokenlari | [PUSH_NOTIFICATIONS_UZ.md](../docs/PUSH_NOTIFICATIONS_UZ.md) |
| O10 | Ixtiyoriy professional original video/media va real xabar-provider ma’lumotlari | Kod/slotlar bor; [qisqa owner ro‘yxati](FINAL_REPORT.md) |
| O11 | PR uchun haqiqiy `main` bazasini egasi tanlashi | [PR_BASE_UZ.md](../docs/PR_BASE_UZ.md). `main` yo‘q, shuning uchun PR ochilmagan; main push/merge qilinmagan |
| Savdo ma’lumotlari | Narxlar, yetkazish hududi/to‘lovi, ombor va keyin Telegram/telefon | Admin va [README_UZ.md](../README_UZ.md) |
| Instagram starti | Kampaniyani faollashtirish, kimga kod berishni va jo‘natishni boshqarish | [INSTAGRAM_TRIAL_UZ.md](../docs/INSTAGRAM_TRIAL_UZ.md). Avtomatik follow scraping/DM mavjud deb ko‘rsatilmaydi |

Oldingi prototiplarning ayrim real Android dalillari bor, lekin ularni yangi APKning real qurilma qabuli deb ko‘rsatmaymiz. Hozirgi APK o‘rnatilmagan; joriy fizik taxta va iOS qabuli ham yopilmagan.

### Qayd etilgan kichik cheklovlar

- PDF uchun kech yuklanadigan `fontkit`ning katta chunk ogohlantirishi saqlangan; build xatosi emas.
- Telefonda millionlik Admin jadvalining o‘ng ustunlarini yoniga surib ko‘rish mumkin.
- Barcha rasmlar bir xil sifat/vaqtda chiqishi va fotografiyaga 100% tenglik kafolatlanmagan.
- Mahalliy sandbox bazasini real savdoga ko‘chirish tavsiya qilinmaydi. Toza millionlik zaxira, o‘sha pepper va imzo birga ko‘chiriladi; mavjud real mijozlar bazasi almashtirilmaydi.

## 9. Qayerda qoldik va keyin nima?

1. Funksional sayt/APK, million kod, himoyalangan server va Admin/dastavka topshirilgan. Ularning qabul sinovlarini o‘zgarishsiz qayta aylantirish kerak emas.
2. Agentning qolgan sifat vazifasi — P16.1: o‘lchanadigan yangi burun/o‘xshashlik yaxshilanishi. Hozirgi saqlangan nusxa faqat tekshirilgan yangi versiya chiqqanda almashtiriladi.
3. Haqiqiy savdo uchun owner yuqoridagi tashqi narsalarni kiritadi; sayt/APK ayni HTTPS API/baza bilan ishlaydi.
4. Taxta va hozirgi APK real sinovdan o‘tgach fizik/telefon qabulini alohida qayd etamiz.
5. `main` bazasi tayyor bo‘lsa ruxsat etilgan feature → main PR ochilishi mumkin; avtomatik merge yo‘q.

**Aniq yakun:** dasturiy funksional topshirish tayyor; production va fizik qabul hali alohida; mayda burun sifati hali ochiq. Butun loyihaga “100% tugadi” deb baho berilmagan.

## Manba rejalari

- [MASTER_PLAN](MASTER_PLAN.md), [PROGRESS](PROGRESS.md), [LOG](LOG.md).
- [C01–C28 va OWNER auditi](../docs/REMAINING_WORK.md).
- [Asl keng roadmap](../docs/ROADMAP.md), [feature matrix](../docs/FEATURE_MATRIX.md), [blockerlar](../docs/BLOCKERS.md).
- [Phase16 rejasi](../docs/PHASE16_PRODUCT_PLAN.md), [qisqa yakuniy hisobot](FINAL_REPORT.md), [owner sinovlari](OWNER_TESTS.md).
