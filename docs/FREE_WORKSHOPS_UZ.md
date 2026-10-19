# Bepul ustaxona

Menyu → Mutaxassis rejimi → To‘rli ishlar → Bepul ustaxona. Bu uchta qo‘llanma bepul: kit kodi ham, hisobga kirish ham kerak emas. Materiallarni alohida tayyorlang. Ko‘rsatilgan vaqt taxminiy; yelim yoki bo‘yoqning qurish vaqti mahsulot yo‘riqnomasiga bog‘liq.

- **Bolalar uchun qog‘oz garmon:** 150 × 210 mm qog‘oz, 15 mm oraliqda 13 buklama va 14 bo‘lak. Har buklamani navbatma-navbat teskari yo‘nalishda bosing. Ochilgan qog‘ozni stol ustiga zigzag qilib qo‘ying. Oldindan kesilgan qog‘oz ishlatiladi.
- **Karton quticha:** 50 × 50 mm taglik, 20 mm devorlar va to‘rtta 6 mm yelim qulog‘i. To‘liq yoyilma 90 × 90 mm. Tashqi qora chiziqdan kesing, ko‘k uzilgan chiziqdan buklang. Bolaga kesishda katta kishi yordam beradi. Qalin karton ichki o‘lchamni biroz kichraytiradi; avval ortiqcha bo‘lakda buklash va yelimni sinang.
- **Ebru: rang tomchilari:** bir-biriga mos tayyor vanna, bo‘yoq va tavsiya qilingan qog‘oz kerak. Suyultirish nisbatini ilova belgilamaydi: material ko‘rsatmasiga amal qiling. Sinov tomchisi yuzada yoyilsin. Alohida tomchilar, keyin ikkinchi rang, qog‘ozni tekkizish, ko‘tarish va quritish tartibi ko‘rsatiladi. Chizma joylashuv misoli; haqiqiy bo‘yoqning yoyilishini hisoblamaydi.

`Boshlash yoki davom etish` oxirgi saqlangan qadamni ochadi. `Oldingi`/`Keyingi` chizmalarni almashtiradi. Faqat `Bajardim` bajarilgan qadamni saqlaydi; qadam tashlab tasdiqlash mumkin emas. `Qadamlarni ko‘rsatish` har 8 soniyada keyingi chizmaga o‘tadi, lekin ishni bajarilgan deb belgilamaydi. Ilova yashirilganda ko‘rsatish to‘xtaydi. Telefon ovozi mavjud bo‘lsa, `Qadamni aytish` shu qadamni o‘qiydi; yo‘q bo‘lsa matn bilan davom eting.

Qog‘oz va karton modelini barmoq/sichqoncha bilan aylantirish mumkin. Bular ko‘rsatilgan o‘lchamlardagi panellarning chizmalari. 3D printer fayli sifatida ishlatilmaydi. Qog‘oz qalinligi, buklama va yelimning haqiqiy holati materialda tekshiriladi.

`Qo‘llanma PDF` barcha qadamlarni va saqlangan holatni chiqaradi. Qog‘oz/karton PDF oxiridagi A4 landshaft sahifa 1:1 andoza. Printerda **100% / Actual size** tanlang, sahifaga sig‘dirishni o‘chiring va **50 mm** chiziqni chizg‘ich bilan o‘lchang. SVG ham haqiqiy mm o‘lchamida. Ebru chizmasi faqat mashq tartibi; uning 50 mm belgisi bosma masshtabni tekshiradi, material retseptini belgilamaydi.

`Loyiha JSON` qurilmadan zaxira nusxa oladi. `Loyihani ochish` tekshirilgan fayldan yangi nusxa yaratadi. Qurilmada ko‘pi bilan beshta ish saqlanadi; `Saqlangan ishlar` ichidan eski ishni o‘chirish mumkin. Boshqa oynadagi yangi holat ustiga yozilmaydi: xabar chiqsa, qayta ochib davom eting. Ilova bir marta to‘liq ochilib, oflayn fayllari saqlangach, qo‘llanmalar va PDF internetsiz ishlaydi. Androidda shu jarayon qurilmaning mahalliy xotirasida saqlanadi; haqiqiy telefon sinovi egasi tomonidan keyin bajariladi.

## O‘zingizning foto/video namunangizni qo‘shish

Asosiy qo‘llanmalar tayyor chizmalar bilan ishlaydi. Qo‘shimcha media ixtiyoriy. Faqat o‘zingiz yaratgan yoki tarqatish huquqi aniq berilgan materialdan foydalaning. Mijozning asl fotosuratini yoki begona qo‘llanmani qo‘shmang.

1. Faylni `public/tutorials/owned/` ichiga yozing. Nom faqat kichik lotin harfi, raqam va `-` dan iborat bo‘lsin. Format: PNG, JPG, MP4 yoki WebM. Bitta fayl ko‘pi bilan 10 MB, jami 30 MB, eng ko‘pi 20 ta; bir qadamga bitta namuna.
2. PowerShell `Get-Item` bilan bayt sonini, `Get-FileHash -Algorithm SHA256` bilan xeshni oling. Xeshni kichik harfda yozing. Bu buyruqlarga faqat o‘zingizning media faylingiz yo‘lini bering.
3. `public/tutorials/manifest.json` ichidagi `assets` ro‘yxatiga yozuv qo‘shing:

```json
{
  "tutorial": "paper",
  "step": 1,
  "path": "/tutorials/owned/mening-namunam.png",
  "bytes": 12345,
  "sha256": "faylning-64-belgili-kichik-harfli-sha256-xeshi",
  "type": "image/png",
  "credit": "Muallif ismi",
  "license": "Muallif ilovada tarqatishga ruxsat bergan"
}
```

Bu misoldagi bayt va xesh o‘rniga haqiqiy qiymatlarni yozing. `tutorial`: `paper`, `cardboard` yoki `ebru`. Qadam raqami qog‘oz/karton uchun 1–6, Ebru uchun 1–7. `type`: `image/png`, `image/jpeg`, `video/mp4` yoki `video/webm`; kengaytma turiga mos bo‘lsin.

4. Mahalliy test va buildni qayta bajaring. Build noto‘g‘ri yo‘l, bayt, xesh yoki limitda to‘xtaydi. Media manzili tashqi saytga yo‘naltirilmaydi. To‘g‘ri fayllar oflayn keshga qo‘shiladi. APK uchun odatdagi sync/buildni qayta bajaring. Egasi ishlatayotgan eski preview papkasini qayta build qilmang; yangi build papkasi/port ishlating.
5. Video o‘zi boshlanmaydi; boshqaruv tugmalari orqali ochiladi. Qurilma kodekni qo‘llamasa yoki fayl tekshiruvi o‘tmasa, asl chizmalar bilan davom etish mumkin.

Fizik nusxani kesish, buklash, yelimlash va Ebru bo‘yog‘ini sinash hali egasining amaliy tekshiruvi. Bular kodni davom ettirishga to‘sqinlik qilmaydi.
