# Yo‘riqnomani serverda himoyalash

## Hozirgi bosqich

Phase16da server yadrosi qurildi va avtomatik tekshirildi. **Oddiy mijoz oynasiga ulash hali alohida keyingi ish.** `SERVER_GENERATION=0` hozirgi xavfsiz boshlang‘ich sozlama; faqat shu kalitni yoqish eski mahalliy oynani avtomatik himoyalamaydi. Yangi mijoz oynasi tekshirilmaguncha ishlab turgan saytga buni qo‘lda yoqmang. Eski 4216 sinov sayti o‘zgarmagan.

## Qanday ishlaydi

Mijoz oldin rasmning joylashuvini o‘z qurilmasida moslaydi. Aniq rozilikdan keyin serverga faqat tayyorlangan 500×500 qora-oq rasm yuboriladi. Asl surat yoki fonni qirqish fayli yuborilmaydi. Lekin qora-oq tayyor rasm ham shaxsiy tasvir hisoblanadi; bu haqda mijozga aytiladi.

Server amaldagi kit andozasi bilan hisoblaydi. Bepul natijada faqat haqiqiy ipli PNG ko‘rinishi keladi. Mixdan mixga ketma-ket yo‘l serverda qoladi. Quti kodi bilan kirib, bitta kredit sarflangandan keyin to‘liq yo‘riqnoma va imzolangan ruxsat keladi; ochilgan ish akkaunt arxiviga yoziladi. O‘sha ishni qayta ochish bepul. Saqlangan yo‘riqnoma keyin internetsiz ham ishlaydi.

Boshlang‘ich cheklovlar: bir vaqtda bitta hisob, navbat bilan ko‘pi bilan ikkita faol so‘rov, 45 soniyalik majburiy hisob chegarasi, 16 ta vaqtinchalik yozuv va 64 MiB umumiy saqlash chegarasi. Bu kichik boshlang‘ich VPS uchun cheklov; bir million bir vaqtdagi mijoz yuklamasi sinaldi degani emas. Gavjum bo‘lsa tizim kutishni/qayta urinishni so‘raydi. Narx, taxta andozasi yoki kreditni mijoz o‘z so‘rovida almashtira olmaydi.

## Ma’lumotlar

Yuborilgan hisoblash piksellari faqat cheklangan navbat/worker xotirasida turadi; bazaga yozilmaydi. Olinmagan vaqtinchalik natija 30 daqiqadan keyin tozalanadi. Ochilgan yo‘riqnoma oddiy akkaunt arxivida qoladi. Hisobni o‘chirish unga tegishli vaqtinchalik natijani ham o‘chiradi; eski bazadan tiklashda o‘chirilgan hisob qayta tirilmaydi. Oldingi zaxiralar yoki disk bloklaridan sud-texnik usulda tiklash imkonsizligi va’da qilinmaydi.

Rasmga kirish belgisi va sessiya kalitlari URLga yozilmaydi. Begona odam yo‘lni olish uchun faqat ish raqamini bilishi yetmaydi. Barcha aloqa ishlab chiqarishda HTTPS orqali bo‘lishi kerak: [DEPLOY_VPS_UZ.md](DEPLOY_VPS_UZ.md).

Brauzerga yuborilgan HTML/CSS/JavaScriptni to‘liq yashirish mumkin emas. Oldin tarqatilgan mahalliy hisoblash kodini ham ortga olib bo‘lmaydi. Himoya yangi serverdagi maxfiy ketma-ketlik va kalitlarga tegishli; bu “sayt kodini hech kim ko‘rmaydi” degan va’da emas.

Texnik protokol va keyingi oynaga ulash mezonlari: [PROTECTED_GENERATION_CONTRACT.md](PROTECTED_GENERATION_CONTRACT.md). Quti kodlari: [KIT_MILLION_UZ.md](KIT_MILLION_UZ.md).
