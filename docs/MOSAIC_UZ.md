# Mozaika: taglik, rang va dona rejasi

Menyu → Mutaxassis rejimi → Mozaika (“Grid crafts”). Surat yoki original namunani tanlang. Katak eni/bo‘yi, dona qadami (mm), rang kodi/HEX/mavjud dona va zaxira foizini **qo‘lingizdagi materialga qarab** kiriting. 7 kulrang, 12 rang va 24 rang tugmalari taxminiy palitra namunalari. Ular muayyan ishlab chiqaruvchi rangiga mos deb hisoblanmaydi. Ishlatiladigan va zaxira donalari mavjud sondan oshsa hisob rad qilinadi.

Taglik eni/bo‘yini dona hisobida 4–48 oralig‘ida, keyin mavjud tagliklar sonini kiriting. Masalan, 48×48 rasmni 16×16 taglikka bo‘lish uchun 9 taglik kerak. Reja ko‘pi bilan 64 taglikdan tuziladi. Namuna zaxirasi 100; uni haqiqiy zaxirangizga almashtiring.

Rasm o‘lchami taglikka to‘liq bo‘linmasa oxirgi taglik **kesilgan deb hisoblanmaydi**: ortgan joylar bo‘sh qoladi. To‘liq tagliklarning umumiy eni/bo‘yi alohida ko‘rsatiladi. Masalan, 10×9 rasm, 4×4 taglik va 8 mm qadam → 9 taglik, 96×96 mm baza, 80×72 mm rasm, 54 bo‘sh joy.

Qadamlar avvalgi umumiy ilonizi tartibida qoladi. Joriy qadamda A1/A2/B1 kabi taglik, shu taglikning 1 dan boshlanadigan qator/ustuni va rang kodi ko‘rsatiladi. Har taglikdagi tasdiqlangan son umumiy saqlangan progressdan olinadi. Bitta taglikni oldindan tugatish barcha oldingi qadamlar bajarilganini anglatmaydi: tasdiqlashdan oldin tekshiring.

“Tagliklar JSON” har qadamning tagligini, mahalliy/umumiy koordinatasini, har taglikdagi dona hisobini va umumiy zaxirani beradi. “Tagliklar PDF” muqova, ranglar inventari va har taglik uchun ramzli alohida chizma beradi; **PDF joylashuv chizmasi haqiqiy o‘lchamda emas**. “Tagliklar SVG” to‘liq tagliklar o‘lchamida, 50 mm nazorat belgisi bilan chiqadi. Uni 100% chop eting, “Fit to page”ni o‘chiring. Eski kataklar PDF/SVG eksportlari ham saqlangan; Grid PDF ichidagi 1:1 bosma varaqlardan foydalanish mumkin.

Loyiha saqlangach oflayn qayta ochish, qadam tasdiqlash/qaytarish va PDF/SVG/JSON ishlaydi. Taglik ma’lumoti alohida tekshiruv izi orqali ayni rasm ketma-ketligiga bog‘langan. Import o‘zgartirilgan ma’lumotni rad qiladi. Eski tagliksiz loyihalar JSON1, yangi taglikli loyihalar JSON2 ko‘rinishida saqlanadi. Qo‘lda rang almashtirish alohida yangi nusxa yaratadi.

Dona/taglik birikishi, plastik rangi, bosma masshtab va haqiqiy yig‘ish [PHYSICAL_BOARD_UZ.md](PHYSICAL_BOARD_UZ.md) bo‘yicha egasi tekshiradi. Bu fizik moslik avtomatik testdan o‘tdi degani emas.
