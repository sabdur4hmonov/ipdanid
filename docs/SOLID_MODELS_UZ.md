# 3D shakllar - ramka, qatlamli haykal va yozuv

Menyu → «Mutaxassis rejimi» → Menyu → katakli hunarmandchilik → «3D shakllar (tajriba)». Bu alohida o‘lchamli mahsulot; oddiy mixli rasm qo‘llanmasi saqlanadi.

1. **Ramka:** haqiqiy taxta eni va bo‘yini o‘lchang. Zaxira ichki teshikning umumiy qo‘shimchasidir: 500 mm taxta + 0.5 mm zaxira = 500.5 mm ichki ochilish. 12 mm chetda tashqi uzunlik 524.5 mm bo‘ladi. Har STL bitta qiya uchli detal. To‘rttasini 45° uchlaridan moslab yopishtiring. Bu kattalikni printer maydoni bilan solishtiring; ilova detalni avtomatik kichraytirmaydi yoki bo‘lib tashlamaydi. Taxta atrofi uchun bezak ramkasi; taxtaning o‘zi alohida material.
2. **Qatlamli haykal:** 20 qatlam × 4 mm = 80 mm balandlik. Andozalar va STLlar pastdan yuqoriga raqamlangan. Markaziy teshikni tayoqchaga moslab, avval bitta qatlamda sinang; keyin qatlamlarni bir yo‘nalishda moslab yopishtiring. «Eni chegarasi» tashqi eng katta chegara; har detalning haqiqiy o‘lchami pastda ko‘rsatiladi. Ko‘pburchak teshikning **eng tor** eni kiritilgan qiymatga teng.
3. **Harf va yozuv:** lotin, kirill, arab yozuvi va ularning aralash satri ishlaydi. Nuqta va alohida harflar alohida detallar bo‘ladi. «Yig‘ish joylashuvi SVG» yoki PDFdagi umumiy andoza ularni kerakli masofaga qo‘yishga yordam beradi. Jadvaldagi X/Yni umumiy joylashuv chizmasining pastki chap burchagidan millimetrda o‘lchang. Hozirgi detal SVGsi bitta bo‘lakning shakli; u umumiy joylashuvning o‘rnini bosmaydi.

«3D reja yaratish» → modelni barmoq/sichqoncha bilan aylantiring. Slayderlar yoki «Ko‘rinishni qaytarish» ham ishlaydi. «Faqat hozirgi detal» bitta bo‘lakni alohida ko‘rsatadi. Ko‘rinish haqiqiy STL uchburchaklaridan chiziladi. Yaratilgan reja avtomatik saqlanadi.

Ko‘rinish bepul. Kit kodi bilan kirib **1 kredit** sarflasangiz, aynan shu rejaning barcha detali, yig‘ish qadamlari va STL/SVG/PDF/JSON ochiladi. Har detal uchun alohida kredit olinmaydi. Shu rejaning fayllarini qayta olish bepul; o‘zgartirib yaratilgan reja alohida ochiladi. Printer, taxta, tayoqcha va boshqa materiallar alohida.

STLni **mm** deb oching. Fayldagi har detalning pasti Z0da, X/Y esa yig‘ish joyiga tegishli; chop qilish dasturida detalni maydon markaziga qo‘ying. Fayl hajm va koordinatalari tekshiriladi, ammo printer/material qisqarishi va yopishtirish mustahkamligi haqiqiy sinovda aniqlanadi. Avval bitta kichik namunani tekshiring.

«Barcha detallar PDF»da yig‘ish tartibi, hozirgi tasdiqlangan jarayon, haqiqiy o‘lchamli sahifalar va A4 bo‘laklar bor. **100%** da chop eting; «sahifaga sig‘dirish»ni o‘chiring. Har andozadagi 50 mm ni o‘lchang. A4larda X/Y koordinatalari va burchak belgilarini moslab yopishtiring. Dastlabki muqova/jadval sxema; keyingi andozalar haqiqiy o‘lchamda.

«Shu detaligacha yig‘dim»dan keyin keyingi qadamga o‘tiladi. Ilovani qayta ochib saqlangan loyihani tanlang: tasdiqlangan joy saqlanadi, avval ochilgan fayllar internetsiz ham olinadi. Boshqa oynada jarayon o‘zgarsa, eskirgan tasdiqlash/o‘chirish rad etiladi. «Loyihani ochish» eng yangi saqlangan nusxani oladi. JSON importi tekshirilib, alohida yangi loyiha sifatida saqlanadi.

«Qadamni aytish» kitob va 3D qo‘llanmada **qurilmadagi mahalliy** UZ/RU/EN ovozini ishlatadi. Shu tilda o‘rnatilgan ovoz bo‘lmasa, matn ekranda qoladi. Ovoz avtomatik tasdiqlamaydi. Qadam/til o‘zgarganda, oynadan chiqilganda yoki «Ovozni to‘xtatish» bosilganda eski nutq to‘xtaydi. Inson yozgan ovozlar va telefon sinovi egasining keyingi ishlari ro‘yxatida qoladi.

Agent dasturiy testlarni avtomatik bajaradi. Printer maydoni, haqiqiy bosma 50 mm, qog‘oz/material, ramka/tayoqcha mosligi va telefondagi ovoz/ulashish natijasini egasi keyin tekshiradi; kod ishlari ularni kutmaydi.
