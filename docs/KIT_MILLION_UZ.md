# Bir million quti kodi

Har bir kod **3 ta alohida ishning to‘liq yo‘riqnomasini** ochadi. O‘sha ishni qayta ochish, damdan keyin davom ettirish yoki boshqa qurilmada ochish yana kredit sarflamaydi. To‘rtinchi yangi ish uchun boshqa quti kodi kerak. Rasmning ipli ko‘rinishini ko‘rish bepul.

## Shaxsiy zaxira

Zaxira: `output/phase16-private/million-kit-20261027/`. Bu papka GitHub, sayt va APK tarkibiga kirmaydi.

- `database.sqlite`: kodlarning HMAC xeshlari, huquqlar va server imzolash kaliti;
- `kit-codes.encrypted`: AES-256-GCM bilan shifrlangan kodlar ro‘yxati;
- `private-keys.json`: shaxsiy kod pepperi va eksportni ochish kaliti; ommaga yubormang;
- `manifest.json`: tekshiruv sonlari va holati; kod yoki kalitning o‘zi yo‘q.

Manifestda `count=1000000`, `unusedAfterTests=1000000`, `allExportRowsMatchDatabase=true` va `statuses="ready"` bo‘lishi kerak. Manifest bo‘lmasa, tayyor deb hisoblamang. `staging` va `failed` zaxiralar kirish uchun ishlamaydi. Zaxira eski 4216 sinov serveriga avtomatik ulanmaydi: `productionActivated=false` shu ma’noda.

Kalitning ikkinchi nusxasini shifrlangan kodlar faylidan alohida yopiq joyda saqlang. Kalit yo‘qolsa, kodni xeshdan tiklab bo‘lmaydi. Windowsda `0600` fayl rejimi Windows ruxsatlarini almashtirmaydi: papkani faqat egasi kira oladigan disk yoki shifrlangan zaxirada saqlang.

## Chop etish

Faqat yopiq kompyuteringizda, loyiha papkasida:

```powershell
node --import tsx scripts/decrypt-private-kit-codes.ts --bundle=output/phase16-private/million-kit-20261027 --file=print-codes.csv
```

Buyruq avval butun faylning yaxlitligini tekshiradi, keyin CSV yaratadi. Mavjud faylni almashtirmaydi. Ustunlar: `ordinal,code,full_builds`. CSV **ochiq kodlarni** saqlaydi: uni sayt, Telegram guruhi yoki GitHubga qo‘ymang. Har qutiga bittadan kod bering; bir kodni ikki qutiga bermang. Bosmaxonaga faqat kerakli qismini yopiq kanal orqali bering.

Adminning oddiy onlayn chiqarishi 100 tadan oshmaydi. Bir million kod HTTP so‘rovida chiqarilmaydi. Admin eski ochiq kodlarni bazadan qaytara olmaydi.

## Yangi zaxira chiqarish

```powershell
node --max-old-space-size=512 --import tsx scripts/issue-private-kit-inventory.ts --count=1000000 --out=output/phase16-private/another-private-inventory
```

Manzil yangi bo‘lishi shart. Mavjud zaxirani o‘chirmang yoki ustiga yozmang. Buyruq alohida baza yaratadi; avvalgi mijozlar bazasiga birlashtirmaydi. `tmp/data` yoki ishlab turgan server bazasini almashtirmang. Eksport tayyor bo‘lmaguncha kodlar faollashmaydi. Tekshiruv har bir eksport kodini bazadagi xeshga aniq solishtiradi. Uchta namunada kirish, uch ish, to‘rtinchisini rad etish va bepul qayta ochish sinovi tranzaksiyada qaytariladi: yetkaziladigan kodlar ishlatilmagan qoladi.

## VPSga ulash

Avval [DEPLOY_VPS_UZ.md](DEPLOY_VPS_UZ.md) bo‘yicha yopiq serverni tayyorlang. Yangi, hali mijoz ma’lumoti bo‘lmagan o‘rnatishda bazani, unga tegishli aynan o‘sha `CODE_PEPPER`ni va bazadagi imzolash kalitini bir butun zaxira sifatida ko‘chiring. Qiymatlarni buyruq satri, terminal tarixi yoki skrinshotga chiqarmang. `EXPORT_KEY` veb-serverga kerak emas: yopiq chop etish joyida saqlang. Sandbox kaliti haqiqiy Click/Payme kaliti emas.

Mijozlari bor ishlab turgan bazani yangi baza bilan **almashtirmang**. Bunday holatda nazoratli ko‘chirish va zaxira talab qilinadi; akkauntlar, imzolar va ochilgan ishlar saqlanishi kerak. Bir million kod chiqarish bir million bir vaqtdagi foydalanuvchining yuklama sinovi degani emas.

## Xavfsizlik chegarasi

Har kod kriptografik tasodifiy 24 bayt, ya’ni 192 bitdan iborat. Bazada ochiq kod yo‘q; topishga urinishlar serverda cheklanadi. Taxmin bilan topish ehtimoli juda kichik, “mutlaqo imkonsiz” degan va’da berilmaydi. Kodni bilgan odam undan kirishi mumkin: uni parol kabi shaxsiy tuting. Bekor qilish yangi kirishlarni to‘xtatadi; avvalgi doimiy yo‘riqnomalar saqlanadi.
