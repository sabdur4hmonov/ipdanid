# To‘plam turlari, materiallar va dostavka

Menu → Hisob / Admin → Admin orqali kiring. Egasi barcha bo‘limlarni ko‘radi. Katalog xodimi mahsulotlarni, sozlamalar ruxsati bor xodim mamlakat va dostavkani boshqaradi. Finance ruxsatining o‘zi bularni o‘zgartirishga yetmaydi.

## Mahsulot yaratish

“To‘plam turlari va materiallar” bo‘limida yangi mahsulotni tanlang. Belgisi kichik lotin harflari, raqam va tirelardan iborat bo‘lsin. Nomi, tavsifi, material, tur nomi, aniq narx/valyuta, ombor miqdori va kredit sonini kiriting. Standart taxta uchun mavjud `standard-base-r1` yoki Admin tasdiqlagan haqiqiy versiyani ishlating. “Do‘konda ko‘rsatish” o‘chirilsa, u faqat boshqa to‘plamning tarkibi sifatida ishlatiladi.

- To‘plam: alohida mahsulot.
- Turi: mavjud bitta mahsulotning bitta nusxasiga bog‘langan tanlov.
- Qo‘shimcha material: ip, igna yoki boshqa material; avtomatik kredit bermaydi.
- Bir nechta to‘plam: “Tarkibi”ga mahsulotlar va aniq sonini qo‘shing. Kamida ikki jismoniy birlik bo‘lsin. Narxi va beriladigan kreditlari alohida, siz belgilagan qiymatlardir; ichidagi kreditlar avtomatik qo‘shilmaydi.

Ombor miqdori tayyor mahsulot uchun yuqori chegara. Tarkibdagi material yetishmasa, do‘kondagi mavjud miqdor kamayadi. Bitta material ikki joyda ishlatilsa, ikkalasi ham hisoblanadi. Bekor qilish yoki tasdiqlangan qaytarish asl buyurtmada ishlatilgan materiallarni bir marta qaytaradi. Keyin tarkib o‘zgarsa ham eski buyurtma o‘zgarmaydi.

## Valyuta va mamlakat

UZS, USD va RUB narxlari alohida belgilanadi. Ilova valyutani aylantirmaydi. Masalan, USD to‘plamning narxini o‘zingiz USDda kiriting; uning UZS material narxi avtomatik dollar narxiga aylanmaydi. Bitta savatdagi mahsulotlar bir xil valyutada bo‘lishi kerak. Click va Payme faqat UZS buyurtmalari uchun. Boshqa valyutada naqd/olib ketish va sotuvchi bergan rekvizitlar ishlatiladi; haqiqiy bank xizmati ulanmagan.

“Mamlakatlar va dostavka”da mamlakat qo‘shing, xizmat ko‘rsatishni yoqing, uning valyutasini tanlang. Olib ketish manzili va/yoki kuryerni, aniq dostavka narxini kiriting. Bo‘sh manzil yoki o‘chirilgan kuryer bilan o‘sha usulda buyurtma yaratilmaydi. Ilova mamlakat ro‘yxati borligi uchun haqiqiy dostavka bor deb va’da bermaydi: faqat xizmat ko‘rsata oladigan joylaringizni yoqing.

Hech qanday alohida mamlakat qoidasi saqlanmasa, avvalgi oddiy O‘zbekiston/UZS dostavka sozlamalari ishlaydi. Unga qaytish uchun “Oddiy dostavka sozlamalariga qaytish”ni bosing va saqlang. O‘zgarishdan so‘ng mijoz “Yangilash”ni bosib yangi shartlarni ko‘radi. Eski narx bilan yangi buyurtma yaratilmaydi.

Mijoz mamlakatni almashtirganda savat tozalanadi. Yuborilgan buyurtmaning javobi uzilib qolsa, “Shu buyurtmani qayta tekshirish” asl narx, tarkib va buyurtmani tiklaydi; yangi buyurtma yaratmaydi. Bunday savatni yangi narxga yashirincha almashtirib bo‘lmaydi.

Promo/referral va ulgurji hamkor shartlari hozir UZS uchun. Promo avvalgi O‘zbekiston dostavka narxi bilan ishlaydi; boshqa mamlakat yoki boshqa dostavka narxiga yashirincha qo‘llanmaydi. Hamkorlar: [PARTNERS_UZ.md](PARTNERS_UZ.md). To‘lovlar: [PAYMENTS_UZ.md](PAYMENTS_UZ.md).

## Kredit muddati

Onlayn mahsulotning to‘lovi tasdiqlanganda berilgan oddiy kreditlar muddatsiz. Jismoniy kit kodining ikkita alohida muddati bo‘lishi mumkin: kodni kiritish muddati va kiritilgandan keyingi kredit muddati. Kit Admin’da `0` muddatsiz degani. Kartochkada ikkalasi yoziladi. Hisobdagi “Kit kreditining muddati”da qolgan kredit va aniq sana ko‘rinadi. Oldin berilgan kitning shartlari keyingi umumiy sozlamadan o‘zgarmaydi.

Onlayn mahsulotga ham, qutidagi kodga ham kredit ajratsangiz, ular alohida grant bo‘ladi. Narx/kredit siyosatini shunga mos belgilang: ilova bitta buyurtmaga bosma kodni o‘zidan-o‘zi yaratmaydi yoki jo‘natmaydi.

Avtomatik sinovlar sun’iy mijoz va izolyatsiyalangan serverda bajariladi. Haqiqiy dostavka, bank operatsiyasi yoki mijozlarga xabar yuborilmaydi.
