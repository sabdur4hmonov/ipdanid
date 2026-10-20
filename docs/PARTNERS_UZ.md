# Hamkor, partiya, kit kartochkalari va oluvchi havolasi

Yakuniy Phase15manzili `output/phase15/manual-testing.txt` da bo‘ladi. Eski4194–4200sahifalar o‘zgarmaydi. Hozir egasi qo‘lda sinashini kutmaymiz.

## Hamkorga ruxsat berish

Hamkor ilovada oddiy hisob yaratadi yoki kit hisobiga kiradi. Menyu → Hisob/Admin → Hisob → “Hamkor uchun”ni ochib, “Hisob raqami”ni egasiga beradi. Bu ochiq hisobIDsi; parol yoki kit kodini yuborish kerak emas.

Egasi o‘z Admin kirishi bilan “Hamkorlar va partiyalar”ni ochadi. Yangi hamkorga hisobIDsi, nom, kit mahsuloti, jami ajratilgan kitlar, eng kam/ko‘p partiya, kod va kredit muddatini belgilaydi. Ruxsatni alohida yoqadi. Mahsulotdagi kredit soni va haqiqiy kit profili ishlatiladi; bir partiyada100kitdan ko‘p chiqarilmaydi.

Narx pog‘onalarida “2kitdan boshlab90UZS,5kitdan boshlab80UZS” kabi miqdor/narx kiriting. Keyingi pog‘onada miqdor ortishi, bir kit narxi esa kamayishi yoki bir xil qolishi kerak. Kamida bitta, ko‘pi bilan oltita pog‘ona. Narxni mahsulot narxidan yuqori qo‘ymang. Summada ko‘pi bilan ikki kasr xonasi bo‘lsin. “Saqlash”dan so‘ng hamkor darhol o‘z portalidan foydalanadi.

Mavjud hamkorni ro‘yxatdan tanlab tahrirlang. “Hamkor ruxsati yoqilgan”ni o‘chirib saqlash yangi portal amallarini to‘xtatadi; tarqatilgan kodlarni o‘z-o‘zidan bloklamaydi. Kerakli partiyani alohida bloklang. Egasi eski mahsulotni savdodan olib tashlagan bo‘lsa ham hamkorni o‘chira oladi. Support, Finance yoki oddiy hamkor boshqa hisobga hamkor ruxsatini bera olmaydi.

## Narx hisobi va ruxsat

Hamkor “Hamkor uchun” → “Ruxsat va partiyalarni tekshirish”ni bosadi. Faqat o‘z shartlari va partiyalari ko‘rinadi. Kitlar sonini kiriting, “Narxni hisoblash”ni bosing. Narx15daqiqa amal qiladi. Partiya nomini yozib “Egasiga tasdiqlashga berish”ni bosing.

Bu avtomatik to‘lov, hisob-faktura yoki yetkazish emas. Egasi tijorat shartlarini alohida tekshiradi va kod chiqarishga ruxsat beradi. Hamkorning so‘rovi hali mahsulot zaxirasini kamaytirmaydi.

Egasi Admin → hamkorni tanlaydi → partiya narxi/miqdorini ko‘radi → “Narx va miqdorni tekshirdim...”ni belgilaydi → “Kod chiqarishga ruxsat”ni bosadi. Shu payt haqiqiy mahsulot zaxirasi band qilinadi. Narx, zaxira yoki shartlar o‘zgargan bo‘lsa eski so‘rov rad etiladi: yangi hisob olib qayta yuboring. Ruxsat berilgan, hali kod chiqarilmagan zaxira7kundan keyin qaytadi; bunday partiyani bekor qilish ham zaxirani bir marta qaytaradi.

## Kodlarni chiqarish va saqlash

Hamkor portalni yangilab, ruxsatli partiyada “Kit kodlarini chiqarish”ni bosadi. Bu haqiqiy kit kodlarini yaratadi; profili, har kit krediti va muddatlari tasdiqlangan narx hisobidan olinadi. Ilovaning umumiy kit sozlamalari o‘zgarmaydi.

Kodlar faqat bir marta ko‘rsatiladi. Ekranni yopishdan yoki boshqa bo‘limga o‘tishdan oldin “Kit kartochkalari PDF” va kerak bo‘lsa “Oluvchi havolalari CSV”ni yuklab oling. Bu fayllar maxfiy: har kod/havolani bitta oluvchiga bering, Gitga yoki ommaviy guruhga joylamang. QR haqiqiy kod yoki ilova havolasini o‘z ichiga oladi; internetdagi begona QR xizmatiga yuborilmaydi.

Javob yo‘qolsa “Ruxsat va partiyalarni tekshirish”ni bosing. Holat “Kodlar chiqarilgan” bo‘lsa, qayta bosish yangi kod chiqarmaydi va eski kodlarni serverdan olib bo‘lmaydi. Egasi bilan shu partiyani bloklab, yangi partiya uchun alohida ruxsat oling. Avtomatik qayta chiqarish yoki zaxiraga qaytarish yo‘q. Tarqatilgan kit jismonan qaytmaguncha zaxira ko‘paymaydi; yangi ajratish kerak bo‘lsa egasi limitni ongli ravishda o‘zgartiradi.

“Chiqarilgan kodlarni bloklash”dan oldin tushuntirishni belgilang. Oldin olingan kreditlar va saqlangan yo‘riqnomalar saqlanadi; bloklangan kod orqali qayta kirish to‘xtaydi. Hamkor boshqa partiya egasi yoki oluvchining hisob ma’lumotini ko‘rmaydi, faqat olingan/olinmagan/bloklangan sonlarni ko‘radi.

## Oluvchi uchun

Oluvchi QR yoki havolani ochadi. Kod havolaning faqat `#kit=...` qismida bo‘ladi; ilova uni manzil va joriy tarixdan darhol olib tashlaydi. Kod URL so‘roviga yoki referrerga yuborilmaydi. “Kitni shu hisobga olish”ni ochiq tasdiqlamaguncha hisobga kredit berilmaydi. Mavjud hisob bo‘lsa kit shu hisobga birikadi; hisob yo‘q bo‘lsa shu qurilmada kit hisobi yaratiladi. Bir kod ikkinchi hisobga yana kredit bermaydi.

Olingach hisobda kredit va “Materialni yaratuvchiga qo‘llash” ko‘rinadi. Shu tugma kitning aynan chiqarilgan reviziyasini yuklaydi. Masalan, egasi keyin kit sozlamalarini yangilasa ham eski kit eski andozada qoladi. So‘ng oddiy Surat → Moslash → Natija yo‘lidan foydalaning, bitta kredit bilan qo‘llanmani oching va oflayn yig‘ishda davom eting. Biriktirish kredit sarflamaydi; qo‘llanmani ochish bitta kredit sarflaydi.

Kod/havola kitga kirish paroli kabi: uning nusxasini olgan odam o‘sha kit hisobiga kirishi mumkin. Bu oluvchining shaxsini hujjat orqali tekshirish tizimi emas. Nusxani ommaga tarqatmang.

## Domen va telefon

Server mavjud `APP_ORIGIN`HTTPS manzilidan foydalanadi; Dockerda bu `APP_DOMAIN`dan olinadi. [DEPLOY_VPS_UZ.md](DEPLOY_VPS_UZ.md) bo‘yicha haqiqiy domenni ulang. Native ilova ham server bergan shu web manzilga havola yaratadi. Domen sozlanmasa oddiy kodli PDF ishlaydi, havola eksporti yoqilmaydi. Lokal avtomatik testlar faqat127.0.0.1dagi alohida sinov portidan foydalanadi; bunday manzil boshqa telefonda ochilmaydi. Telefon/native havola va bosilgan QRni haqiqiy sinash egasining telefoni hamda domeniga qoladi; kod ishi buni kutmaydi.

Texnik shartlar va haqiqiy avtomatik natijalar: [PARTNERS_CHECKPOINT.md](PARTNERS_CHECKPOINT.md).
