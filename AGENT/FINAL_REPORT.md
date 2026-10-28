# Ip Rasm — 29.10.2026

Sayt va Androidning Phase16 funksional nusxasi tayyor. **Burun detali bo‘yicha yangi yaxshilanish tasdiqlanmagan: P16.1 ochiq.** Bu suratga100%tenglik yoki haqiqiy taxta/telefon qabul sinovi degani emas.

- Sayt: **http://127.0.0.1:4217/**. API4657. Eski saytlar va hisoblar saqlangan.
- APK: [ip-rasm-phase16-20261029-be6e489bff81-debug.apk](../output/mobile/ip-rasm-phase16-20261029-be6e489bff81-debug.apk). Bu debug nusxa; telefon o‘rnatilmadi.
- Uchta shaxsiy test quti kodi va lokal Admin ma’lumoti faqat shu kompyuterdagi [manual-testing.txt](../output/phase16/manual-testing.txt)da. Har kod3 ta yangi to‘liq ish uchun; parol shart emas. Bepul ipli ko‘rinishda bajarish yo‘li berilmaydi; o‘sha ochilgan ishga qaytish bepul.
- Manba: [GitHub feat/full-roadmap](https://github.com/sabdur4hmonov/ipdanid/tree/feat/full-roadmap). Maxfiy zaxira, suratlar, baza, kalitlar va APK Gitga qo‘shilmagan.

## Nima tekshirildi

741/741 ta unit sinovi, 348 ta joriy desktop/mobil holat(81 fayl/161 yangi API ishi), alohida7 ta himoyalangan oqim va8 ta qayta bajarilgan xavfsizlik testi o‘tdi. Yakuniy qabul qilingan matritsada skip/flaky/xato yo‘q. Dastlabki Chrome ochilish xatosi, mobil login kutish xatosi va 3 ta ishga tushirish selektor/navigatsiya xatosi saqlangan; toza birinchi urinish deb ko‘rsatilmaydi.

Haqiqiy 1 000 000 ta ishlatilmagan, har biri 3 ta yig‘ish uchun kodning yopiq zaxirasi yaratilib, har bir eksport qatori bazaga solishtirilgan. Yangi sayt uning **alohida sandbox nusxasi** bilan ishlaydi; Admin haqiqiy1 000 000 chiqarilgan/tayyor holatini ko‘rsatdi. Telefon ekranida bu jadvalni yoniga surish mumkin. Kodlar ro‘yxati brauzerga ochilmaydi. Alohida to‘rtinchi kodda rasm yaratish, ochish, saqlash, qayta ochib ayni yo‘riqnoma va 1-qadamdan davom etish amalda o‘tdi; uchta beriladigan kodning huquqi sarflanmadi.

Server manba/dependency nusxasi 20769 fayl bilan xeshlangan; keyingi repo tahriri bu nusxadagi yangi hisobni o‘zgartirmaydi. APK 122 fayl bilan aynan mos, eski imzo va 98 arxiv yozuvi saqlangan; 3 haqiqiy shaxsiy kalit qiymati paketda yo‘q. Noto‘g‘ri API manzili rad etildi. npm audit:0 zaiflik.

Sekinlashtirilgan mobil sahifa sinovlarida yaratish 4,29–5,60 soniya; Worker amalda 4 marta sekinlashtirilmagan, haqiqiy telefon deb ko‘rsatilmaydi. Serverga ko‘chirishdagi 12 ta runtime taqqoslashida ip yo‘li va fizik PNGning har bir pikseli oldingi qabul qilingan natijaga teng. Bu o‘xshashlik oshgani emas. Mayda burun detali hali zaif; mos ravishda P16.1 ochiq qoladi. Brauzerga berilgan JavaScriptni butunlay yashirib bo‘lmaydi; server kalitlari va ochilmagan tartibli yo‘riqnomalar serverda saqlanadi.

Dalillar: [runtime](../docs/validation/phase16-runtime-snapshot-20261028.json),[matritsa](../docs/validation/phase16-matrix-20261029.json),[APK](../docs/validation/phase16-apk-20261029.json),[yangi sayt](../docs/validation/phase16-handoff-20261029.json).

## Egasi bajaradigan tashqi ishlar

| Ish | Aniq yo‘l |
| --- | --- |
| Domen/VPS, DNS, HTTPS va doimiy production API | [DEPLOY_VPS_UZ.md](../docs/DEPLOY_VPS_UZ.md) |
| Yopiq millionlik zaxira/kalitlarni alohida saqlash, qutiga bittadan kod chiqarish | [KIT_MILLION_UZ.md](../docs/KIT_MILLION_UZ.md). Sandbox nusxani savdoga ko‘chirmang; toza zaxira va ayni pepper/imzodan boshlang, mavjud mijozlarni almashtirmang. |
| Haqiqiy narxlar, dastavka hududi va keyin Telegram/telefon aloqa ma’lumotlarini Admin’da kiritish | [README_UZ.md](../README_UZ.md),[INSTAGRAM_TRIAL_UZ.md](../docs/INSTAGRAM_TRIAL_UZ.md) |
| Click/Payme merchant kalitlari va haqiqiy to‘lov faollashtirish | [PAYMENTS_UZ.md](../docs/PAYMENTS_UZ.md). Hozir sandbox, pul yechilmaydi. |
| Android release keystore va haqiqiy telefonda kamera/ovoz/offline sinovi | [APK_SERVER_AND_SIGNING_UZ.md](../docs/APK_SERVER_AND_SIGNING_UZ.md); scripts/build-release.ps1 |
| O‘z instruktor ovozlarini yozish | [VOICE_RECORDING_UZ.md](../docs/VOICE_RECORDING_UZ.md);[ro‘yxat](../docs/VOICE_RECORDING_LIST.csv). Hozir qurilma TTS ishlaydi. |
| Taxta/50 mm kalibr/mix/ip va fizik yig‘ish | [PHYSICAL_BOARD_UZ.md](../docs/PHYSICAL_BOARD_UZ.md),[BUILD_TODAY_UZ.md](../docs/BUILD_TODAY_UZ.md) |
| FCM uchun haqiqiy Firebase/APNs sozlamalari, kerak bo‘lsa | [PUSH_NOTIFICATIONS_UZ.md](../docs/PUSH_NOTIFICATIONS_UZ.md) |
| iOSni Mac/Xcode va haqiqiy qurilmada yig‘ish | [IOS_UZ.md](../docs/IOS_UZ.md) |
| PR uchun qonuniy main bazasini tanlash | [PR_BASE_UZ.md](../docs/PR_BASE_UZ.md). Origin’da main yo‘q; agent main yaratmagan, push yoki merge qilmagan. |
| Haqiqiy QBRIX natijasi bilan solishtirish istalsa, fayllarni berish | [QBRIX_COMPARE_HOWTO_UZ.md](../docs/QBRIX_COMPARE_HOWTO_UZ.md) |

Bu tashqi ro‘yxat P16.1sifat ishini egaga yuklamaydi:aniq yangi usul va o‘lchangan yaxshilanish hali agent tomonida ochiq. Play Market/GitHub tekshiruvi isbotlangan almashtiruvchi algoritm bermadi:[tadqiqot](../docs/PLAY_MARKET_RESEARCH_20261028.md).
