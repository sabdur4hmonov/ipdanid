# Instagram orqali raqamli sinov

Bu kod jismoniy kit, taxta yoki yetkazib berishni bepul qilmaydi. Bitta ro‘yxatdan o‘tgan hisobga bitta raqamli yig‘ish huquqi beradi. Oddiy rasm ko‘rish bepul qoladi. Kampaniya dastlab o‘chiq.

Egasi Instagram obunasini o‘zi tekshiradi va shaxsiy kodni o‘zi yuboradi. Dastur Instagram parolini so‘ramaydi, obunani avtomatik tasdiqlamaydi va xabar yubormaydi.

## Server tayyor; oynalar keyingi bosqichda

Admin `settings` huquqi bilan `/api/admin/trials/policy` orqali boshlanish, tugash, jami sinov soni va ishlatish muddatini belgilaydi. `codes` huquqi bilan `/api/admin/trials/batch` orqali 1–100 kod yaratadi. Jami yaratilgan va ishlatilgan va’dalar budjetdan oshmaydi. Bir hisob faqat bir marta oladi.

Kodlar faqat yaratish javobida ko‘rinadi; bazada ularning HMAC xeshi saqlanadi. Javob yo‘qolsa o‘sha so‘rov kaliti yana kod yaratmaydi. Admin ro‘yxatdan tegishli partiyaning ishlatilmagan kodlarini bekor qilib, yangi kalit bilan qayta yaratadi. Mijoz olgan huquq partiya bekor qilinganda saqlanadi. Kodni URL, ommaviy sahifa yoki logga qo‘ymang.

Mijoz email/parol hisobiga kirib `/api/trial/claim` orqali oladi. Xuddi shu kodni qayta yuborish ikkinchi huquq bermaydi. Huquq haqiqiy yig‘ish ochilganda avval sarflanadi; jismoniy kitning uchta krediti kamaymaydi. Muddat tugasa qolgan huquq ishlamaydi. Keyinchalik ilovada aynan shu server va hisobga kiriladi.

Hozircha API avtomatik tekshirilgan. Mijoz/Admin oynalari va odatiy do‘kon orqali sandbox buyurtma keyingi C28 bosqichi; haqiqiy kampaniya yoki to‘lov yoqilmagan.
