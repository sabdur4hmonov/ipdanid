# Instagram orqali raqamli sinov

Bu kod jismoniy kit, taxta yoki yetkazib berishni bepul qilmaydi. Bitta ro‘yxatdan o‘tgan hisobga bitta raqamli yig‘ish huquqi beradi. Oddiy rasm ko‘rish bepul qoladi. Kampaniya dastlab o‘chiq.

Egasi Instagram obunasini o‘zi tekshiradi va shaxsiy kodni o‘zi yuboradi. Dastur Instagram parolini so‘ramaydi, obunani avtomatik tasdiqlamaydi va xabar yubormaydi.

## Admin orqali tayyorlash

1. Menyu → Hisob/Admin → Boshqaruvga kiring. Instagram sinovi bo‘limini oching.
2. Kampaniya boshlanishi, tugashi, jami sinovlar chegarasi va olingandan keyingi kunlarni kiriting; yoqib saqlang. Bularni `settings` huquqli xodim o‘zgartiradi.
3. `codes` huquqi bilan yangi kodlar sonini kiriting va yarating. TXT faylni shaxsiy joyga saqlang; oynani tozalang. Kodlar qayta ko‘rsatilmaydi.
4. Obunani o‘zingiz tekshirib, har kishiga alohida kodni shaxsiy yuboring.

## Mijoz orqali olish va yig‘ish

1. Menyu → Hisob/Admin orqali email/parol bilan ro‘yxatdan o‘ting yoki kiring.
2. Sinov kodi bo‘limiga shaxsiy kodni kiriting. Shu bo‘lim natijadagi Yig‘ishni boshlash oynasida ham bor.
3. O‘zingiz yoqtirgan suratdan natija yarating. Yig‘ishni boshlash → huquqni sarflab ochish. Birinchi qadamdan ishlang; Dam olish tugmasi bilan to‘xtating. Ochilgan yo‘riqnoma va qadam internetsiz qayta ochiladi.
4. Keyin ilovaga o‘tganda aynan shu email/parol va o‘sha server ishlatiladi; kodni boshqa hisobga ko‘chirish mumkin emas.

## Taxta va dostavka

Menyu → Do‘kon va buyurtmalar: mahsulotni savatga qo‘shing; ism, telefon va dostavka tanlansa shahar/manzilni to‘ldiring. Mahsulot, yetkazish va jami narxni tekshiring. Sinov kodi bu narxlarni nol qilmaydi. Mahalliy sinovda Click/Payme faqat sandbox; haqiqiy merchant sozlanmaguncha pul olinmaydi. Buyurtma holati va tracking shu oynada ko‘rinadi.

Admin `settings` huquqi bilan `/api/admin/trials/policy` orqali boshlanish, tugash, jami sinov soni va ishlatish muddatini belgilaydi. `codes` huquqi bilan `/api/admin/trials/batch` orqali 1–100 kod yaratadi. Jami yaratilgan va ishlatilgan va’dalar budjetdan oshmaydi. Bir hisob faqat bir marta oladi.

Kodlar faqat yaratish javobida ko‘rinadi; bazada ularning HMAC xeshi saqlanadi. Javob yo‘qolsa o‘sha so‘rov kaliti yana kod yaratmaydi. Admin ro‘yxatdan tegishli partiyaning ishlatilmagan kodlarini bekor qilib, yangi kalit bilan qayta yaratadi. Mijoz olgan huquq partiya bekor qilinganda saqlanadi. Kodni URL, ommaviy sahifa yoki logga qo‘ymang.

Mijoz email/parol hisobiga kirib `/api/trial/claim` orqali oladi. Xuddi shu kodni qayta yuborish ikkinchi huquq bermaydi. Huquq haqiqiy yig‘ish ochilganda avval sarflanadi; jismoniy kitning uchta krediti kamaymaydi. Muddat tugasa qolgan huquq ishlamaydi. Keyinchalik ilovada aynan shu server va hisobga kiriladi.

Avtomatik tekshiruvlar Admin/mijoz oynalari, yo‘qolgan javobni takrorlash, hisobdan chiqishda ma’lumotni yashirish, real surat → yo‘riqnoma → internetsiz davom va dostavkali sandbox buyurtmani qamradi. Haqiqiy kampaniya, Instagram xabari, dostavka yoki jonli to‘lov ishga tushirilmagan.
