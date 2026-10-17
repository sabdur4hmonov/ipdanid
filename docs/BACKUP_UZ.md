# SQLite zaxirasi

scripts/backup-sqlite.mjs SQLite online-backup API bilan ishlaydi: faol WAL faylini oddiy copy qilish o‘rniga SQLite izchil snapshot oladi. Manba hamda BACKUP_DIR aniq ko‘rsatiladi; tmp/data barcha holatda taqiqlangan. Yangi backup avval .part faylga yoziladi, quick_check tekshiriladi, fayl ruxsati0600 qilinadi va yakuniy nomga o‘tkaziladi. Mavjud zaxira ustidan yozilmaydi. Test yangi disk DBda faol yozuvchi ochiq turganda backup oldi, keyingi yozuv backupga kirmaganini va asl DB o‘zgarmaganini tekshirdi.

Node24 kerak. VPSdagi compose konfiguratsiyasi BACKUP_DIR=/backups va DATABASE_PATH=/data/iprasm.sqlite ni o‘rnatadi. Alohida backup xizmati skriptni --daemon bilan ishga tushiradi: ishga tushishda va har24soatda izchil nusxa, xatoda10daqiqadan keyin qayta urinish. Faqat14kundan eski iprasm-VAQT.sqlite nomli zaxiralar o‘chiriladi; boshqa fayllar saqlanadi. Bir martalik tekshiruv: docker compose --env-file .env.production run --rm backup node scripts/backup-sqlite.mjs. Natijani docker compose logs backup orqali ko‘ring.

DB bilan CODE_PEPPER va serverning maxfiy .env.production faylini ham alohida xavfsiz joyga zaxiralang: ular bo‘lmasa eski hisob/kitlar tiklanmaydi. DB ichidagi guide imzo kaliti ham nusxaga kiradi. Bu fayllarni Git, chat yoki ommaviy linkka chiqarmang. Bir VPSdagi nusxa disk yo‘qolishidan himoya qilmaydi: nusxani egasining boshqa xavfsiz saqlash joyiga ham oling.

Tiklashdan avval faqat o‘zingizning VPSdagi API va backup xizmatlarini docker compose stop api backup bilan to‘xtating. Amaldagi DB jildini alohida saqlab qo‘ying, tekshirilgan snapshotni yangi toza data volume ichiga iprasm.sqlite nomi bilan qo‘ying; eski boshqa holatga tegishli WAL/SHM fayllarini aralashtirmang. Aynan o‘sha private .env.production dan foydalanib xizmatlarni ko‘taring, /api/health va kit/accountni tekshiring. Lokal egasining4194–4199 serverlari yoki tmp/data bu amallarga kirmaydi. Real VPS restore bajarilgan deb da’vo qilinmaydi; lokal izchil snapshot/restore tekshiriladi.

Manba: [Node24 SQLite online backup](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#sqlitebackupsource-db-path-options).
