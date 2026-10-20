# Ilova krediti va sovg‘a

Menu → Hisob / Admin → Hisob orqali kit kodi bilan kiring yoki email/parol bilan hisob yarating. Vaqtinchalik mehmon hisobida sotib olish va sotib olingan sovg‘ani qabul qilish ochilmaydi: kreditni keyin ham topa oladigan hisob kerak.

## Egasi mahsulotni yoqishi

1. Admin → “To‘plam turlari va materiallar”da mahsulot yarating. Hunar turi `digital` bo‘lsin. Nomi, alohida narx/valyuta, mavjud miqdor va tayyorlash kreditlarini kiriting. Kamida bitta kredit va musbat narx kerak. Ilova mahsulotining tarkibiga jismoniy material qo‘shilmaydi. Bu mahsulot uchun miqdor sotuv chegarasi, taxtalar soni emas.
2. “Ilova kreditlari va sovg‘alar”da mahsulotni tanlang. Xarid turini “Ilova kreditlari” yoki “Sovg‘a kreditlari” qilib belgilang, “Bu xaridni taklif qilish”ni yoqing va saqlang.
3. Sotuvchi nomi, aloqa va ommaga beriladigan to‘lov rekvizitlarini oddiy dostavka/sotuvchi bo‘limida kiriting. Merchant maxfiy kalitlarini bu maydonlarga yozmang; ular uchun [PAYMENTS_UZ.md](PAYMENTS_UZ.md)dagi server sozlamalaridan foydalaniladi.

## Xarid

Do‘konda ilova yoki sovg‘a mahsulotini tanlang, ismingizni kiriting va xarid yarating. Bu yo‘lda taxta, kuryer va dostavka narxi qo‘shilmaydi. Mahsulotning o‘z valyutasi ishlatiladi, avtomatik almashtirish yo‘q. Click/Payme faqat UZS uchun; boshqa valyutada sotuvchining saqlangan rekvizitlari ko‘rinadi. Narx va rekvizitlar keyin o‘zgarsa ham qabul qilingan xaridda avvalgi shartlar qoladi.

Hozir provayderlar sandbox/sinov rejimida. “Sinov to‘lovini tasdiqlash” haqiqiy pul olmaydi. Jonli to‘lov faqat kalitlarni qo‘yish bilan o‘zidan-o‘zi yoqilmaydi; [PAYMENTS_UZ.md](PAYMENTS_UZ.md)dagi cheklovlarni o‘qing. Haqiqiy bank o‘tkazmasi tekshirilgan deb ko‘rsatilmaydi.

Javob uzilsa, “Shu xaridni qayta tekshirish” asl so‘rovni yuboradi. Qayta ochilganda serverda xarid topilsa, yangi xarid yaratilmaydi: uning asl cheki ko‘rinadi. Avvalgi to‘lov kutilayotgan xaridni tugating yoki bekor qiling, keyin boshqasini yarating. Qurilmadagi yuborilmagan so‘rov yetti kungacha saqlanadi; undan keyin ham tasdiqlangan xaridlar serverdagi hisobda qoladi.

## Sovg‘a

Sovg‘a to‘lov tasdiqlangandan keyin tayyor bo‘ladi. Xarid qiluvchining balansiga shu kreditlar ishlatish uchun qo‘shilmaydi: ular oluvchiga ajratiladi. “Sovg‘a havolasini nusxalash” yoki “Sovg‘a kodini nusxalash”ni o‘zingiz bosing va oluvchiga o‘zingiz bering. Ilova hech kimga o‘zidan-o‘zi Telegram, SMS yoki email yubormaydi.

Havolani ochganda kod manzil satridan olinadi; u server so‘rovining URLiga tushmaydi. Oluvchi o‘z hisobiga kirib, “Sovg‘ani hisobimga olish”ni bosadi. Sovg‘a avtomatik olinmaydi. Bitta hisob olishi mumkin; qayta bosish ikkinchi marta kredit bermaydi. Bu kod hisobga kirish paroli emas: oluvchi o‘z kit kodi yoki email/paroli bilan kiradi.

Sovg‘ani olish muddati to‘lovdan keyin 30 kun. Olingan oddiy tayyorlash kreditlari muddatsiz. Kodni maxfiy saqlang. Olingandan keyin xarid qiluvchining ekranida uni ko‘rsatish/nusxalash tugmalari qolmaydi. Havola uchun egasi serverda o‘z HTTPS domenini `APP_ORIGIN`ga yozadi; [DEPLOY_VPS_UZ.md](DEPLOY_VPS_UZ.md). Domen bo‘lmasa oddiy kodni nusxalash ishlaydi.

Olinmagan sovg‘a qaytarilsa, ajratilgan kredit va asl xarid bir marta bekor qilinadi. Olingan sovg‘ani avtomatik qaytarish yo‘q: oluvchidan yashirincha kredit tortib olinmaydi. Bu holatni egasi bilan alohida hal qilish kerak. Muddati tugagan, olinmagan sovg‘aning ajratilgan krediti xarid qiluvchiga qaytadi; bu bankdan pul qaytdi degani emas.

## Maxfiylik va sinov

Sovg‘a kodi qurilmaning doimiy xarid qoralamasiga yozilmaydi. Ilova/sovg‘a ekranida hisobdan chiqish va keyingi hisobga kirishda eski xarid/javoblar ko‘rinmaydi. Surat avtomatik yuborilmaydi. Sinovlar sun’iy hisoblar va lokal serverda bajarilgan; egasining hisoblari, suratlari va eski ilova serverlariga tegilmagan. Hozir qo‘lda tekshirish talab qilinmaydi. Tayyor asar buyurtmasining rozilik/kuzatuv yo‘li C15ning keyingi qismida qo‘shiladi.

## Tayyor asar buyurtmasi

1. Egasi Admin → Narxlar/materiallarda `string` mahsulot yaratsin: narx musbat, kredit `0`, taxta profili saqlangan chizmaning profili bilan aynan bir xil. Har xil Doira/Kvadrat/Yurak profillari uchun alohida mahsulot qilish mumkin. Yetkazish yoki ustaxonadan olish manzilini sozlang. Admin → “Tayyor asar sozlamalari”da mahsulotni yoqing. Narx, material va hajm egasining haqiqiy imkoniyatiga mos kiritiladi; ilova ishlab chiqarish muddatini o‘zi o‘ylab topmaydi.
2. Mijoz o‘z qo‘llanmasini odatdagi kredit bilan ochib, Loyihalarimda saqlasin. Menu → Hisob / Admin → Loyihalarni sinxronlash orqali aynan shu qo‘llanmani serverga yuborsin. Yopiq qo‘llanmani chetlab o‘tish yo‘q. Asl surat avtomatik yuborilmaydi.
3. Do‘kon → “Tayyor asar buyurtmasi”: mahsulot va saqlangan asarni tanlang, chizmani ustaxonaga berishga alohida rozilik qo‘ying, so‘rov yuboring. Hali pul olinmaydi va taxta band qilinmaydi.
4. Egasi yoki tayyorlash xodimi Admin → “Asar so‘rovlari va tayyorlash”da chizmani ochib ko‘rsin. Aynan shu iplar va taxta o‘lchamini tekshirsin, ko‘rsatilgan narxni tasdiqlasin yoki izoh bilan rad etsin. Narx o‘zgargan bo‘lsa, yangilab yana ko‘rib tasdiqlash kerak. “Ustaxona PDF qo‘llanmasi” aynan shu saqlangan ketma-ketlikdan chiqadi. Sotuv narxi tasdig‘i yetti kun amal qiladi.
5. Mijoz so‘rovni yangilasin, chizmani ochib ko‘rsin, olish/kuryer va manzilini tanlasin. Jami narxga alohida rozilikdan keyin “Chizmani qabul qilish va buyurtma berish”ni bossin. Server narx/taxta/yetkazishni qayta tekshiradi. Javob kelmasa, aynan o‘sha xaridni takrorlash ikkinchi buyurtma yaratmaydi. “Yangilash” asl qabul qilingan buyurtmani topadi.
6. Lokal sinovda Click/Payme sinov tugmalari ishlaydi; haqiqiy pul olinmaydi. UZSdan boshqa valyutada bu provayderlar taklif qilinmaydi. Haqiqiy to‘lov kalitlari va fiskal shartlar uchun PAYMENTS_UZ.md. Hozirgi bank tasdig‘i yoki real jo‘natish isboti deb qabul qilmang.
7. To‘langan buyurtmada xodim chizmani yana ochib “Tayyorlashni boshlash” → “Tayyor deb belgilash”ni bajaradi. Shundan keyin kuzatuv raqami bilan jo‘natishni qayd qiladi. Bu yozuvni egasi haqiqiy jo‘natishga mos kiritsin; ilova kuryerni o‘zi chaqirmaydi. Mijoz shu holat/raqamni qayta ochganda ham ko‘radi.
8. To‘lanmagan buyurtmani mijoz bekor qilishi mumkin. Tayyorlash boshlanmagan to‘langan buyurtma avval qaytarish so‘rovi orqali, keyin moliya xodimi tomonidan hal qilinadi. Tayyorlash boshlangan bo‘lsa, ilova avtomatik qaytarib zaxirani sun’iy ko‘paytirmaydi: egasi bilan kelishish kerak. Sovg‘a kodlari yoki suratlar ustaxona xabari/PDFga kiritilmaydi.

Bu ekranlar to‘rt tilda mavjud. Sintetik qo‘llanma bilan desktop/mobil, qayta kirish, aloqa uzilishi, maxfiylik va PDF qadamlari avtomatik tekshirildi. Haqiqiy tayyorlash sifati va taxta egasining jismoniy sinovi bo‘lib qoladi.
