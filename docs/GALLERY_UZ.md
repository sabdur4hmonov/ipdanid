# Mijozlar galereyasi va sharhlar

Yangi ilovada Menyu → Hisob va do‘kon → Mijozlar galereyasi. Ko‘rish uchun hisob kerak emas. Faqat Admin tasdiqlagan tayyor ish va unga biriktirilgan fikr ko‘rinadi. Bo‘sh galereyaga soxta ish yoki sharh qo‘shilmaydi.

## Tayyor ishni yuborish

1. Kit kodi yoki ro‘yxatdan o‘tgan hisob bilan kiring. Mehmon hisobi galereyani ko‘radi, lekin rasm yubora olmaydi.
2. Tayyor buyumning JPEG/PNG fotosuratini tanlang. Dastlabki portretni shu yerga yubormang. Kadrdagi telefon raqami, manzil, hujjat yoki boshqa shaxsiy ma’lumotni oldindan olib tashlang. Ilova buni avtomatik aniqlaydi deb hisoblamang.
3. Ish nomi va hammaga ko‘rinadigan taxallusni yozing. Fikr ixtiyoriy; yozsangiz 1–5 baho tanlanadi. Bu tasdiqlangan xarid belgisi emas, mijoz yuborgan fikrdir.
4. Uchta rozilikni o‘zingiz belgilang: tayyor qo‘l ishi, rasm va undagi odamlarni ko‘rsatish huquqi, rasm/taxallus/fikrni ommaga chiqarish. Tugmalar avvaldan belgilanmaydi. Boshqalar ommaviy nusxani saqlashi mumkin.
5. `Tayyor ishni yuborish` tugmasini bosing. Dastlab `Tekshirilmoqda` holati chiqadi; hali ommaga ko‘rinmaydi. Internet uzilsa ayni tugmani qayta bosish bir xil yuborishni takrorlamaydi.

Manba fayl 15 MB va 24 megapikselgacha. Ilova uni 768 pikselgacha kichraytiradi, oq fonda PNG qiladi va faqat shu nusxani serverga yuboradi. Kichraytirilgach ikkala tomoni kamida 96 piksel bo‘lsin. Server o‘lcham, siqilgan va ochilgan hajmni tekshiradi, PNGni qayta yozadi; kamera/EXIF/matn metama’lumotlari saqlanmaydi. Ko‘rinadigan shaxsiy ma’lumotni rasmdan o‘zi olib tashlamaydi. Ommaviy ro‘yxat kichik nusxa bilan ochiladi, `Kattaroq ko‘rish` orqali kattasi olinadi.

Ko‘pi bilan 10 ta faol yoki oxirgi 24 soatda yuborilgan ish bo‘ladi. Yuborib-o‘chirish bu chegarani darhol yangilamaydi. Serverning odatiy so‘rov cheklovlari ham amal qiladi; chegara xabari chiqsa keyinroq qayta urinib ko‘ring.

## Admin tekshiruvi

Hisob va do‘kon → Admin. Egasi yoki `Yordam` vakolatli xodim `Galereyani tekshirish` bo‘limini ochadi. Moliyachi yoki kit-kod vakolatining o‘zi bu huquqni bermaydi.

- `Tekshirilmoqda` ro‘yxatida ishni topib kattalashtiring. Tayyor buyum, huquqlar va kadrdagi shaxsiy ma’lumotlarni ko‘rib chiqing.
- `Nashrga ruxsat berish` rasm va fikrni ommaga chiqaradi.
- `Nashrni rad etish` uchun sababni tanlang. Rasm va fikr faqat egasi hamda vakolatli xodimga ko‘rinadi. Oldin nashr qilingan ishni rad qilish uni darhol ommaviy ro‘yxatdan chiqaradi.
- Holat filtri orqali tasdiqlangan/rad etilgan ishlarni ham ochish mumkin. Har sahifada 12 tagacha ish bor; qolganini `Yana ko‘rsatish` bilan ko‘ring.
- Boshqa xodim oldin o‘zgartirgan bo‘lsa, eskirgan tugma uning qarori ustiga yozmaydi. `Yangilash` orqali yangi holatni ko‘ring.

O‘rtacha baho faqat hozir ommaga ochiq va haqiqatan fikr/baho yuborilgan ishlar bo‘yicha hisoblanadi. Tasdiqlanmagan yoki o‘chirilgan fikr bu hisobga kirmaydi.

## O‘chirish va saqlash muddati

`Mening yuborgan ishlarim` → `Nashrni bekor qilish va o‘chirish`. Bu ishning rasmi, taxallusi va fikrini faol galereyadan darhol olib tashlaydi. Boshqa hisob o‘chira olmaydi. Eskirgan holatda xabar chiqsa avval yangilang. Tarmoqdagi eski qayta yuborish o‘chirilgan ishni tiklamaydi.

Tasdiq kutayotgan ish yuborilganidan 30 kun o‘tib tozalanadi. Rad etilgan ishga ham ko‘pi bilan 30 kun qoladi; ilgari tasdiqlanmagan ishning asl 30 kunlik muddati cho‘zilmaydi. Nashr qilingan ish birinchi tasdiqdan 365 kun o‘tib olib tashlanadi; qayta tasdiqlash muddatni uzaytirmaydi. Server ishlayotganida tekshirish har daqiqada va galereya so‘rovlarida bajariladi. Tozalangan yozuvda takroriy yuborishni tanish uchun minimal texnik belgi yana 30 kun turadi, rasm/fikr saqlanmaydi.

API nusxalari `no-store`; ilovaning oflayn keshiga kirmaydi. Galereya va rasm tanlovi brauzerning doimiy xotirasiga yozilmaydi. Hisobdan chiqqanda shaxsiy ro‘yxat/tanlangan rasm tozalanadi. Internet bo‘lmasa galereyaga yangisini yuborish yoki yangilash ishlamaydi; mahalliy qo‘llanmalar va yig‘ish jarayoni alohida ishlaydi.

Bu faol bazadagi ko‘rinish va ma’lumotni tozalashdir. Oldingi SQLite jurnal/zaxira nusxalari yoki boshqa odam saqlagan ommaviy nusxalarni masofadan bir zumda yo‘qotish da’vosi qilinmaydi. Yakuniy tarqatishdan oldin C21/C24 dagi umumiy hisob o‘chirish, zaxira saqlash va xavfsizlik tekshiruvlari ham bajariladi. Haqiqiy mijoz rasmlari bilan qo‘lda yoki ishlab turgan serverda sinov hozir talab qilinmaydi; avtomatik sinovlar alohida bazadagi o‘zimiz chizgan namunalarni ishlatadi.
