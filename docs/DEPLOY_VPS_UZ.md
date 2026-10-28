# Ip Rasm — Hetzner VPSga joylash

Bu yo‘riqnoma egasi o‘z VPSida bajarishi uchun. Agent real VPS, DNS yoki akkauntga ulanmaydi. Lokal Docker sinovi yakuniy hisobotda alohida ko‘rsatiladi; haqiqiy sertifikat va telefon tarmog‘i egasi domenni ulaganda tekshiriladi.

## 1. Domen va VPS

1. Domen sotib oling. Hetzner Cloud’da Ubuntu LTS VPS yarating; kamida 2 CPU / 4GB RAM va disk zaxirasini rejalang. SSH public kalitingizni qo‘shing.
2. Domen DNSida `A` yozuvini VPS IPv4 manziliga yo‘naltiring. IPv6 ishlatmasangiz noto‘g‘ri `AAAA` yozuv qoldirmang. Masalan `iprasm.uz` yoki `app.iprasm.uz`; qaysi birini tanlasangiz setupda aynan shuni kiriting.
3. VPS tashqarisidan TCP80/443 va kerak bo‘lsa UDP443 ochiq bo‘lsin; SSHni faqat o‘zingiz kiradigan tarmoq bilan cheklang. Agent kompyuteringiz firewallini o‘zgartirmagan. API4311ni internetga ochmang.
4. SSH orqali kiring: `ssh root@VPS_IP`. Docker Engine va Compose pluginni [rasmiy Ubuntu qo‘llanmasi](https://docs.docker.com/engine/install/ubuntu/) bo‘yicha o‘rnating. Git ham kerak. Docker huquqi rootga teng: faqat ishonchli foydalanuvchilarga bering.

## 2. Kod va bitta ishga tushirish buyrug‘i

```bash
git clone --branch feat/full-roadmap https://github.com/sabdur4hmonov/ipdanid.git iprasm
cd iprasm
bash scripts/deploy.sh
```

Private repo bo‘lsa egasining GitHub deploy key/token kirishini o‘zi sozlaydi; tokenni clone URLga yozmang. Branch hali origin’ga chiqmagan bo‘lsa avval yakuniy hisobotdagi push holatini tekshiring. Script birinchi safar domen va **14–256 belgili yashirin Admin paroli**ni so‘raydi. Docker ichidagi Node xesh/ikki tasodifiy kalit yaratib, `.env.production` ni0600 ruxsat bilan yozadi; parol, xesh yoki kalitlar terminalga chiqarilmaydi. Mavjud fayl ustidan yozilmaydi. Docker konfiguratsiyasi tekshirilgach `docker compose up -d --build --wait` bajariladi.

Keyingi safar ham `bash scripts/deploy.sh`. Yangilashdan oldin SQLite va `.env.production` ni maxfiy zaxiralang. Git yangilashni o‘zingiz tasdiqlangan branch/commitdan bajaring; script reset/pull/main merge qilmaydi.

## 3. HTTPS va Admin

Phase16 production build va API birga himoyalangan rejim1 da ishlaydi: Docker buildda `VITE_SERVER_GENERATION=1`, Compose API muhitida `SERVER_GENERATION=1`. Oddiy mijozga kod bilan ochilmaguncha faqat ipli PNG yuboriladi; tayyor qora-oq rasm serverga rozilik bilan keladi. API ishlamasa yashirin mahalliy hisob yo‘q. Mahalliy `.env.example`dagi0 qiymatini production himoyasi deb tushunmang. [PROTECTED_GENERATION_UZ.md](PROTECTED_GENERATION_UZ.md) chegaralarni, [KIT_MILLION_UZ.md](KIT_MILLION_UZ.md) esa yopiq million-kod bazasini kalitlari bilan to‘g‘ri ko‘chirishni tushuntiradi. Yangi toza VPS o‘zidan-o‘zi bu lokal kodlarni olmaydi.

Brauzerda `https://SIZNING_DOMEN/api/health` oching: `adminAuth=password`, `livePayments=false` bo‘lishi kerak. Domen ilovasida Menyu → Hisob / Admin → Admin → **Admin paroli** orqali kiring. Lokal token production egasi sifatida qabul qilinmaydi. Xodimga alohida vazifa kodi bering; oddiy xodim parolni bilmasin. Sessiya8soat, eng ko‘pi10ta; chiqish uni serverda bekor qiladi, brauzer sessiyani doimiy diskka saqlamaydi. Admin har qayta ochishda kirishi mumkin.

Admin bir sahifada kit kodlarini yaratadi va PDF/QRni oladi; kredit sarfi, buyurtmalar, narxlar (so‘m), dostavka/olib ketish manzili, e’lonlarni boshqaradi. Production bazasi demo mahsulot bilan to‘ldirilmaydi: o‘z narx/stock/kit profilidagi mahsulotlaringizni Admin orqali kiriting. Boshlang‘ich kit quota3. Kod/PDFni ommaga tarqatmang.

Caddy domen uchun avtomatik HTTPS oladi va yangilaydi; DNS va80/443 to‘g‘ri bo‘lishi shart. Caddy logga to‘liq access so‘rovlarini yozmaydi. API internetga port chiqarmaydi; brauzer Caddy orqali `/api` ga murojaat qiladi. API faqat sozlangan HTTPS app origin va Capacitor localhost originlarini qabul qiladi. Begona brauzer origin403 oladi. Caddy foydalanuvchi yuborgan `X-Real-IP` ni haqiqiy ulanish manzili bilan almashtiradi; API faqat ichki Caddy IPsiga ishonadi. Har bir haqiqiy IP uchun daqiqada120yozuv/600o‘qish/12login; umumiy limitlar ham bor. Cheklov429 bo‘lsa60soniya kuting. Jonli to‘lov/xabar yuborish yoqilmagan.

Standart ichki tarmoq `172.30.51.0/24`; Caddy `.2`, API `.3`, backup `.4`. VPSdagi boshqa tarmoq bilan to‘qnashsa `.env.production` ichida `APP_BACKEND_SUBNET`, `APP_PROXY_IP`, `APP_API_IP`, `APP_BACKUP_IP` ni birga moslang. `TRUSTED_PROXY_IPS` ni `*`, butun tarmoq yoki foydalanuvchi boshqaradigan IPga ochmang. Compose API uchun uni avtomatik Caddy IPsidan beradi. Alohida Node ishga tushirishda bu sozlama bo‘sh: barcha forwarded sarlavhalar e’tiborsiz.

Ommaviy galereya barcha akkauntlar bo‘yicha ko‘pi10000faol yozuv va256MiB rasm+kichik nusxa saqlaydi (`GALLERY_MAX_ITEMS`, `GALLERY_MAX_BYTES`). Limitga yetganda yangi nashr vaqtincha rad etiladi; mavjud yozuvni takror yuborish kredit sarflamaydi. O‘chirish/saqlash muddati tugashi joyni bo‘shatadi. Bu SQLite/WAL/zaxiraning umumiy disk hajmi emas: VPS disk va offsite zaxira sig‘imini ham kuzating. Rasm va matn lokal CSP bilan yuklanadi; tashqi script va iframe yopiq. FCM yoqilgandagina kerakli Google API ulanishlariga ruxsat bor.

## 4. Zaxira, yangilash va qaytarish

SQLite `sqlite` Docker volume’da, o‘chirish jurnali alohida `erasure` volume’da, Caddy sertifikatlari `caddy-data`/`caddy-config` da, kundalik zaxira `backups` volume’da qoladi. Backup xizmati DB va jurnalning online snapshot/quick_check nusxalarini ishga tushishda va24soatda oladi,14kundan eskisini tozalaydi; oxirgi jurnal nusxasi saqlanadi. `docker compose down -v` **ishlatmang**: volume’larni o‘chiradi. Faqat `docker compose --env-file .env.production down` ma’lumotlarni saqlaydi. Eski DBni tiklashda hozirgi erasure volume'ni almashtirmang; `/api/health`da `erasureReplay=true` bo‘lsin. Batafsil [BACKUP_UZ.md](BACKUP_UZ.md).

Qo‘lda zaxira:

```bash
docker compose --env-file .env.production exec backup node scripts/backup-sqlite.mjs
docker compose --env-file .env.production logs --tail 30 backup
```

Xususiy `.env.production` ning xavfsiz offsite nusxasini va zaxiralarni boshqa disk/VPSga olib qo‘ying. Oddiy `docker inspect` / `compose config` chiqishini chatga tashlamang: muhit kalitlarini ko‘rsatishi mumkin. Restore va WAL tafsiloti: [BACKUP_UZ.md](BACKUP_UZ.md). Eski APK/qo‘llanmalar CODE_PEPPER/build imzo kalitiga bog‘liq: `.env.production` ni yo‘qotmang.

APK endpointi va owner imzolashi: [APK_SERVER_AND_SIGNING_UZ.md](APK_SERVER_AND_SIGNING_UZ.md). Sinov Click/Payme kalitlari: [PAYMENTS_UZ.md](PAYMENTS_UZ.md). Real WAVlar: `docs/VOICE_RECORDING_LIST.csv` va [VOICE_RECORDING_UZ.md](VOICE_RECORDING_UZ.md).

Manbalar: [Caddy avtomatik HTTPS shartlari](https://caddyserver.com/docs/quick-starts/https), [API va statik sayt konfiguratsiyasi](https://caddyserver.com/docs/caddyfile/patterns), [Node24 SQLite backup](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#sqlitebackupsource-db-path-options).
