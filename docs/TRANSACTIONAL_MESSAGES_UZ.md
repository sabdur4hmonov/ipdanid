# Buyurtma va yordam xabarlari

Email sukut bo‘yicha o‘chiq. Buyurtma, to‘lov, jo‘natish, qaytarish, yordam javobi va buyurtma asosida tayyorlanadigan asar holati ilova ichidagi shaxsiy xabarlarda saqlanadi. Internet va hisobga kirish kerak; bu bo‘lim yig‘ish yo‘riqnomasining oflayn ishlashiga ta’sir qilmaydi.

Email uchun ro‘yxatdan o‘tgan mijoz o‘z hisobida alohida rozilik beradi. Uni o‘chirsa, hali yuborilmagan email bekor qilinadi. Xizmat allaqachon qabul qilgan xatni qaytarib olishning iloji yo‘q. Xatda surat, chizma, kit yoki sovg‘a kodi, manzil, yordam savoli/javobi bo‘lmaydi: faqat holat, buyurtmaning qisqa raqami va buyurtma summasi. To‘liq ma’lumot ilovada qoladi. Email manzilini ro‘yxatdan o‘tishda to‘g‘ri kiriting; uni keyin o‘zgartirish oqimi hozir yo‘q.

## Keyin haqiqiy emailni ulash

1. Resend hisobida o‘zingizga tegishli yuboruvchi domenni tasdiqlang va faqat server uchun API kalitini oling.
2. VPS dagi maxfiy `.env.production` fayliga `TRANSACTIONAL_EMAIL_MODE=resend`, `TRANSACTIONAL_EMAIL_FROM=orders@SIZNING_DOMENINGIZ` va `RESEND_API_KEY=...` kiriting. Kalitni Git, skrinshot, chat yoki `VITE_*` ga yozmang.
3. O‘sha fayl bilan Docker Compose API xizmatini qayta yarating; umumiy joylashtirish tartibi [DEPLOY_VPS_UZ.md](DEPLOY_VPS_UZ.md) da. API tashqi HTTPS ga chiqishi kerak; unda hostga ochiq API porti yo‘q. `.env.example` faqat bo‘sh joylarni ko‘rsatadi.
4. Avval o‘zingizning alohida sinov hisobingizda rozilik bering va holatlarni tekshiring. Haqiqiy mijozlarga avtomatik sinov yubormang.
5. Xizmatni to‘xtatish uchun `TRANSACTIONAL_EMAIL_MODE=disabled` qiling va API ni qayta yarating. Ilova ichidagi xabarlar qoladi. O‘chirish oldin qabul qilingan emailni qaytara olmaydi.

Bu ish davomida haqiqiy email yuborilmagan. `mock` faqat `IP_RASM_TEST_SERVER=1` bo‘lgan alohida, production bo‘lmagan test serverida ishlaydi. Bunday serverda `resend` rejimi ishga tushmaydi.

## Holatlar nimani bildiradi

- **Ilovada**: email so‘ralmagan, xizmat o‘chiq yoki shu hisobning 24 soatlik 20 ta email chegarasi tugagan; xabar shaxsiy ro‘yxatda mavjud.
- **Navbatda**: yuborish kutilmoqda. Bir xat ko‘pi bilan 5 marta, bir xil mazmun va bir xil takrorlash kaliti bilan uriniladi.
- **Xizmat qabul qildi**: xizmat ID berdi. Bu hali yetkazildi degani emas.
- **Yetkazildi**: qabul qiluvchi pochta serveri qabul qilgan. Mijoz uni o‘qiganini bildirmaydi.
- **Yetkazilmadi**: xizmat rad etish yoki qaytish holatini berdi.
- **Noma’lum**: javob ishonchli emas yoki xavfsiz takrorlash muddati/tekshirish chegarasi tugagan. Ilova muvaffaqiyatni taxmin qilmaydi. Shaxsiy xabarni ilovada ko‘ring.
- **Bekor qilindi**: rozilik o‘chirilganda hali yuborilmagan email bekor bo‘ldi.

Adminning xabar ruxsati bor xodimi holatni ko‘radi va xavfsiz qayta urinishni so‘rashi mumkin. Xizmat qabul qilgan ID bo‘lsa, tugma faqat holatni tekshiradi, yangidan email yaratmaydi. 23 soatlik xavfsiz yuborish oynasi, 5 urinish va 20 holat tekshiruvi qayta bosilganda yangilanmaydi. Resend bir xil kalit/mazmunni 24 soat eslab qolishi sabab biz qisqaroq oynani ishlatamiz. Navbat baza va qayta ishga tushishdan keyin saqlanadi. Xat mazmuni/manzili navbatda shifrlangan; `CODE_PEPPER` ning maxfiy zaxirasini saqlang. Xabarlar 90 kundan keyin o‘chiriladi; xavfsiz yuborish oynasi tugagan email mazmuni oldinroq tozalanadi.

Providerning asl hujjatlari: [yuborish](https://resend.com/docs/api-reference/emails/send-email), [holatni olish](https://resend.com/docs/api-reference/emails/retrieve-email), [takrorlash kaliti](https://resend.com/docs/dashboard/emails/idempotency-keys), [yetkazilish holatlari](https://resend.com/docs/dashboard/emails/manage-emails).
