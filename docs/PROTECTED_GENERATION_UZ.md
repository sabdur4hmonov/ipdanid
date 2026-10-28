# Yo‘riqnomani serverda himoyalash

## Hozirgi bosqich

Docker web buildi `VITE_SERVER_GENERATION=1`, Compose API esa `SERVER_GENERATION=1` bilan birga ishlaydi. Egasi imzolaydigan Android release skripti ham himoyalangan rejim1 va debug sozlamalari0 ni majburiy qo‘yadi; HTTPS manzil hali ham talab qilinadi. `.env.example`dagi0 faqat mahalliy eski rejimga moslik uchun. Bu o‘zgarish eski4216nusxani yoki bir million kod bazasini avtomatik almashtirmaydi. Tayyor rasmni serverga yuborish roziligi ko‘rsatiladi. API o‘chiq bo‘lsa mahalliy hisobga yashirin o‘tmaydi.

Phase16da server va oddiy uch ekranli mijoz oqimi avtomatik tekshirildi: desktop3/3, mobil3/3. Rasm tanlash, surish/kattalashtirish/burish/qaytarish, bepul PNG, quti kodi bilan kirish, 1 kredit bilan ochish, bepul qayta ochish va internetsiz saqlangan qadamdan davom etish ishladi. To‘rt til matni va ekran kengligiga sig‘ishi tekshirildi. Tayyor rasmdan natijagacha desktop4,026soniya, mobil4,009soniya; bu sun’iy rasm sinovi, barcha suratlar uchun va’da emas.

Mahalliy eski rejim ham saqlanadi: `SERVER_GENERATION=0`, `VITE_SERVER_GENERATION=0`. Himoyalangan rejim uchun **ikkalasi1** bo‘lishi kerak. `VITE_` qiymati build vaqtida, `SERVER_GENERATION` API ishga tushishida beriladi. API sozlamasini o‘zgartirishning o‘zi eski tayyor buildni o‘zgartirmaydi. Server ishlamasa himoyalangan mijoz yashirin ravishda mahalliy hisoblashga o‘tmaydi. Noto‘g‘ri build qiymati ham mahalliy rejimni yoqmaydi.

Misol (PowerShell, yangi build katalogini tanlang):

```powershell
$env:VITE_SERVER_GENERATION='1'
npm run build -- --outDir output/my-protected-build
$env:SERVER_GENERATION='1'
```

API shu muhitda ishga tushiriladi; VPS uchun [DEPLOY_VPS_UZ.md](DEPLOY_VPS_UZ.md) dagi xavfsiz baza va kalit sozlamalarini ham bajarish kerak. Sayt kodiga merchant/pepper/imzo kalitini qo‘ymang. Eski4216sayt/APK o‘zgarmagan; yangi yakuniy preview/APK va VPS faollashtirish tekshiruvlari alohida bosqichda.

## Qanday ishlaydi

Mijoz oldin rasmning joylashuvini o‘z qurilmasida moslaydi. Aniq rozilikdan keyin serverga faqat tayyorlangan 500×500 qora-oq rasm yuboriladi. Asl surat yoki fonni qirqish fayli yuborilmaydi. Lekin qora-oq tayyor rasm ham shaxsiy tasvir hisoblanadi; bu haqda mijozga aytiladi.

Server amaldagi kit andozasi bilan hisoblaydi. Bepul natijada faqat haqiqiy ipli PNG ko‘rinishi keladi. Mixdan mixga ketma-ket yo‘l serverda qoladi. Quti kodi bilan kirib, bitta kredit sarflangandan keyin to‘liq yo‘riqnoma va imzolangan ruxsat keladi; ochilgan ish akkaunt arxiviga yoziladi. O‘sha ishni qayta ochish bepul. Saqlangan yo‘riqnoma keyin internetsiz ham ishlaydi.

Boshlang‘ich cheklovlar: bir vaqtda bitta hisob, navbat bilan ko‘pi bilan ikkita faol so‘rov, 45 soniyalik majburiy hisob chegarasi, 64 ta faol/tayyor natija, bekor yoki xato yozuvlar bilan jami512ta qisqa yozuv va64MiB natijalar saqlash chegarasi. Bu kichik boshlang‘ich VPS uchun cheklov; bir million bir vaqtdagi mijoz yuklamasi sinaldi degani emas. Gavjum bo‘lsa tizim kutishni/qayta urinishni so‘raydi. Narx, taxta andozasi yoki kreditni mijoz o‘z so‘rovida almashtira olmaydi.

## Ma’lumotlar

Yuborilgan hisoblash piksellari faqat cheklangan navbat/worker xotirasida turadi; bazaga yozilmaydi. Olinmagan vaqtinchalik natija 30 daqiqadan keyin tozalanadi. Ochilgan yo‘riqnoma oddiy akkaunt arxivida qoladi. Hisobni o‘chirish unga tegishli vaqtinchalik natijani ham o‘chiradi; eski bazadan tiklashda o‘chirilgan hisob qayta tirilmaydi. Oldingi zaxiralar yoki disk bloklaridan sud-texnik usulda tiklash imkonsizligi va’da qilinmaydi.

Rasmga kirish belgisi va sessiya kalitlari URLga yozilmaydi. Begona odam yo‘lni olish uchun faqat ish raqamini bilishi yetmaydi. Barcha aloqa ishlab chiqarishda HTTPS orqali bo‘lishi kerak: [DEPLOY_VPS_UZ.md](DEPLOY_VPS_UZ.md).

Brauzerga yuborilgan HTML/CSS/JavaScriptni to‘liq yashirish mumkin emas. Oldin tarqatilgan mahalliy hisoblash kodini ham ortga olib bo‘lmaydi. Himoya yangi serverdagi maxfiy ketma-ketlik va kalitlarga tegishli; bu “sayt kodini hech kim ko‘rmaydi” degan va’da emas.

Texnik protokol va keyingi oynaga ulash mezonlari: [PROTECTED_GENERATION_CONTRACT.md](PROTECTED_GENERATION_CONTRACT.md). Quti kodlari: [KIT_MILLION_UZ.md](KIT_MILLION_UZ.md).
