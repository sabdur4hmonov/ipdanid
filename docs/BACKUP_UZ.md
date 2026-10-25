# SQLite zaxirasi

scripts/backup-sqlite.mjs SQLite online-backup API bilan ishlaydi: faol WAL faylini oddiy copy qilish o‘rniga SQLite izchil snapshot oladi. Manba hamda BACKUP_DIR aniq ko‘rsatiladi; tmp/data barcha holatda taqiqlangan. Yangi backup avval .part faylga yoziladi, quick_check tekshiriladi, fayl ruxsati0600 qilinadi va yakuniy nomga o‘tkaziladi. Mavjud zaxira ustidan yozilmaydi. Test yangi disk DBda faol yozuvchi ochiq turganda backup oldi, keyingi yozuv backupga kirmaganini va asl DB o‘zgarmaganini tekshirdi.

Node24 kerak. VPSdagi compose konfiguratsiyasi BACKUP_DIR=/backups va DATABASE_PATH=/data/iprasm.sqlite ni o‘rnatadi. Alohida backup xizmati skriptni --daemon bilan ishga tushiradi: ishga tushishda va har24soatda izchil nusxa, xatoda10daqiqadan keyin qayta urinish. Faqat14kundan eski iprasm-VAQT.sqlite nomli zaxiralar o‘chiriladi; boshqa fayllar saqlanadi. Bir martalik tekshiruv: docker compose --env-file .env.production run --rm backup node scripts/backup-sqlite.mjs. Natijani docker compose logs backup orqali ko‘ring.

DB bilan CODE_PEPPER va serverning maxfiy .env.production faylini ham alohida xavfsiz joyga zaxiralang: ular bo‘lmasa eski hisob/kitlar tiklanmaydi. DB ichidagi guide imzo kaliti ham nusxaga kiradi. Bu fayllarni Git, chat yoki ommaviy linkka chiqarmang. Bir VPSdagi nusxa disk yo‘qolishidan himoya qilmaydi: nusxani egasining boshqa xavfsiz saqlash joyiga ham oling.

Tiklashdan avval faqat o‘zingizning VPSdagi API va backup xizmatlarini `docker compose --env-file .env.production stop api backup` bilan to‘xtating. Amaldagi DB jildini alohida saqlab qo‘ying, tekshirilgan snapshotni yangi toza data volume ichiga iprasm.sqlite nomi bilan qo‘ying; eski boshqa holatga tegishli WAL/SHM fayllarini aralashtirmang. **Hozirgi erasure volume'ni saqlang; uni eski nusxaga almashtirmang.** Aynan o‘sha private .env.production/CODE_PEPPER bilan xizmatlarni ko‘taring. API ishga tushishdan oldin keyingi o‘chirish so‘rovlarini eski DBga qayta qo‘llaydi. `/api/health`da `erasureReplay=true` bo‘lsin. Lokal4194–4214 serverlari yoki tmp/data bu amallarga kirmaydi. Real VPS restore bajarilgan deb da’vo qilinmaydi.

## O‘chirilgan hisob eski backupdan qaytmasligi

Compose'da o‘chirish jurnali alohida **erasure** volume ichidagi `/privacy/erasure-intents.sqlite` da. Bu faqat hisobning anonim IDsi/vaqt va tekshirish zanjiri; parol, token, email yoki surat emas. API avval jurnalni ishonchli saqlaydi, keyin shaxsiy ma’lumotlarni o‘chiradi. Jurnal buzilgan, begona, noto‘g‘ri kalitli yoki bog‘langan DB uchun yo‘q bo‘lsa, server ochilmaydi. Tekshiruvni chetlab o‘tish uchun binding/jurnalni o‘chirmang.

Kundalik backup ikkita oilani chiqaradi: `iprasm-VAQT.sqlite` va `erasure-VAQT.sqlite`. Jurnalning eng yangi nusxasi eski DBdan keyingi o‘chirishlarni ham o‘z ichiga oladi. Eski DBni tanlasangiz ham **eng yangi ishonchli jurnalni** saqlang. Oxirgi jurnal nusxasi14kundan eski bo‘lsa ham avtomatik prune uni saqlaydi. Jurnal volume'ni ham mustaqil xavfsiz offsite joyga nusxalang; to‘liq disk yo‘qolib, eng yangi jurnal ham yo‘qolsa, eski ikkita fayldan keyingi o‘chirishlarni bilib bo‘lmaydi. Bu backup oralig‘iga bog‘liq haqiqiy cheklov.

Tiklashdan keyin haqiqiy to‘lov/xabarlarni yoqishdan oldin order/provider holatini tekshiring. Hisob o‘chirish moliyaviy dalil yoki tugallanmagan buyurtmani o‘zidan-o‘zi bekor qilmaydi. Tafsilot: [PRIVACY_RETENTION.md](PRIVACY_RETENTION.md).

Manba: [Node24 SQLite online backup](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#sqlitebackupsource-db-path-options).
