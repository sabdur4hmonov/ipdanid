# Ip Rasm: Oracle Cloud’da birinchi ishga tushirish

2026-11-16. Maqsad: Ubuntu 24.04, **VM.Standard.A1.Flex, ARM64, 2 OCPU / 12 GB**. Bu hujjatni egasi o‘z akkauntida bajaradi. Hozir hech qanday VM, domen, to‘lov yoki haqiqiy million-kod bazasi avtomatik ko‘chirilmadi. Lokal ARM64 tekshiruvining haqiqiy natijasi `docs/P1_PRODUCTION_READINESS.md`da.

`SIZNING_DOMEN`, `VM_IP` va `SSH_KALIT` misol yozuvlar: o‘zingiznikiga almashtiring. Maxfiy fayllar, kodlar va `docker compose config` / `docker inspect` chiqishini chatga tashlamang.

## 1. Oracle akkaunti va VM

1. Oracle Cloud Console’da home region’ni tanlang. **Compute → Instances → Create instance**ni oching.
2. Nom: `iprasm`. Image: **Ubuntu 24.04, aarch64/ARM64**. Shape: **VM.Standard.A1.Flex**, 2 OCPU, 12 GB RAM. Console’dagi bepul resurs belgisi va joriy quota/xarajat hisobini tekshiring; boshqa instansiyalar ham umumiy limitdan foydalanadi.
3. Public subnet, internet gateway, public IPv4 va SSH public kalitini tanlang. Private SSH kalit faqat sizda qolsin. Boot disk uchun masalan 50 GB tanlang; backup va Docker uchun bo‘sh joyni kuzating. Keraksiz qo‘shimcha pullik xizmatlarni qo‘shmang.
4. `Out of host capacity` chiqsa boshqa availability domain’ni sinang yoki kuting. Server yaratilganini ko‘rmaguncha keyingi qadamga o‘tmang.

Hozirgi bepul A1 limiti va idle sharti: [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm). Bepul yoki doimo mavjud bo‘lishiga kafolat yo‘q.

## 2. Internet portlarini ikkala joyda oching

**Oracle Console:** Instance → Primary VNIC → Subnet → Security Lists → tegishli ro‘yxat → Add Ingress Rules. NSG ishlatsangiz uning qoidalarini ham tekshiring.

| Source | Protocol | Destination port | Vazifa |
|---|---|---|---|
| `0.0.0.0/0` | TCP | 80 | HTTP va sertifikat |
| `0.0.0.0/0` | TCP | 443 | HTTPS |
| `0.0.0.0/0` | UDP | 443 | Ixtiyoriy HTTP/3 |
| sizning public IP’ingiz `/32` | TCP | 22 | SSH |

API 4311, SQLite va Docker boshqaruv portlarini internetga **ochmang**. SSH uchun yangi cheklangan qoida ishlayotganini boshqa terminalda tekshirmasdan eski kirishni olib tashlamang.

**Ubuntu ichida ham:** Oracle Ubuntu image’larida UFW o‘chiq bo‘lsa ham iptables HTTP’ni to‘sishi mumkin. Windows PowerShell’dan kiring:

```powershell
ssh -i SSH_KALIT ubuntu@VM_IP
```

Keyingi buyruqlar VM terminalida. SSH oynasini ochiq qoldiring:

```bash
sudo apt update
sudo apt install -y iptables-persistent
sudo iptables -L INPUT -n --line-numbers
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT || sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT || sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
sudo iptables -C INPUT -p udp --dport 443 -j ACCEPT || sudo iptables -I INPUT 1 -p udp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

Bu faqat kerakli portlarni qo‘shadi; qoidalarni `flush` qilmaydi. IPv6 ishlatsangiz alohida OCI IPv6 va ip6tables qoidalarini sozlang; aks holda DNS’da ishlamaydigan `AAAA` yozuv qoldirmang. Docker portlari host firewall’dan chetlab o‘tishi mumkin, shuning uchun Compose faqat 80/443ni chiqaradi. [Oracle Ubuntu misoli](https://docs.oracle.com/en-us/iaas/Content/developer/apache-on-ubuntu/01oci-ubuntu-apache-summary.htm), [Docker firewall izohi](https://docs.docker.com/engine/install/ubuntu/#firewall-limitations).

## 3. Docker, 4 GB swap va avtomatik xavfsizlik yangilanishlari

Quyidagilar toza Ubuntu VM uchun; mavjud Docker o‘rnatmasini ko‘r-ko‘rona almashtirmang.

```bash
sudo apt install -y ca-certificates curl git unattended-upgrades
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
```

SSH’dan chiqib qayta kiring. `docker version`, `docker compose version` va `uname -m`ni tekshiring; oxirgisi `aarch64` bo‘lsin. Docker guruhiga kirish root huquqiga teng: faqat ishonchli foydalanuvchilar. [Rasmiy Ubuntu/ARM64 o‘rnatish](https://docs.docker.com/engine/install/ubuntu/).

Avval `swapon --show`ni ko‘ring. Swap hali bo‘lmasa:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo dpkg-reconfigure -plow unattended-upgrades
free -h
```

Mavjud swap ustiga yozmang va `/etc/fstab`ga qayta-qayta bir xil qator qo‘shmang. Xavfsizlik yangilanishlarini yoqing; qayta yuklashni rejalang. Swap tez RAM o‘rnini bosmaydi.

## 4. Kod, domen va shaxsiy sozlama

```bash
git clone --branch feat/full-roadmap https://github.com/sabdur4hmonov/ipdanid.git iprasm
cd iprasm
bash scripts/setup-production-env
stat -c '%a' .env
```

Private repo bo‘lsa GitHub deploy key’dan foydalaning; tokenni clone URLga yozmang. Setup domen va yashirin Admin parolini so‘raydi. Parol kamida 14 belgi. `.env`0600 bo‘ladi; `stat` natijasi `600` bo‘lsin. Mavjud fayl almashtirilmaydi. Parol, xesh va kalitlar chiqarilmaydi.

Setup alohida `CODE_PEPPER`, `SANDBOX_PAYMENT_KEY`, `ADMIN_PASSWORD_HASH`, **`BACKUP_ENCRYPTION_KEY`** yaratadi; `CLASSIC_TUNING=4`, `FEATURES=` yozadi. Encryption key’ning nusxasini VMdan boshqa yopiq joyga saqlang. U arxiv ichiga qo‘shilmaydi: yo‘qolsa zaxira ochilmaydi. Mavjud baza uchun setupni qayta ishlatib pepperni almashtirmang.

DNS boshqaruvida domeningizning **A yozuvi = VM public IPv4** bo‘lsin. Caddy domeningizga avtomatik HTTPS oladi. DNS va 80/443 yetib kelishi kerak. Oddiy misol: `.env`dagi `APP_DOMAIN=app.sizningdomen.uz` bo‘lsa shu nomning A yozuvini yarating. [Caddy HTTPS](https://caddyserver.com/docs/automatic-https).

## 5. TOZA million-kod master’ni ko‘chirish — faqat birinchi o‘rnatishda

Haqiqiy mijozlari bor server bazasini almashtirmang. Q4/W1/W2/4217 sandbox bazalari, test kodlari va test buyurtmalari production uchun olinmaydi. Agent bu P1 ishida master’ni o‘qimadi yoki ko‘chirmadi.

1. Yopiq kompyuterda `docs/KIT_MILLION_UZ.md`dagi asl master manifestini tekshiring: `ready`, 1 000 000 kod, hammasi ishlatilmagan, eksport/baza mosligi. Asl nusxaga tegmasdan **`database.sqlite` nusxasini** tayyorlang. U ichida `kit_signer` imzo kaliti ham bor.
2. VMda `mkdir -m 700 ~/iprasm-import`. Windows’dan SSH orqali **faqat shu database nusxasini** `~/iprasm-import/database.sqlite`ga yuboring. `kit-codes.encrypted`, bosma CSV va `EXPORT_KEY` serverga kerak emas; yubormang.

   Windows PowerShell misoli (kalit va VM_IP’ni almashtiring; avval aynan master manifesti tekshirilgan bo‘lsin):

   ```powershell
   scp -i "C:\YOPIQ\oracle.key" "D:\Coding projects\ipdan face yasaydigan app\output\phase16-private\million-kit-20261027\database.sqlite" ubuntu@VM_IP:iprasm-import/database.sqlite
   ```

3. Maxfiy editor orqali VMdagi `.env`ning `CODE_PEPPER` va `SANDBOX_PAYMENT_KEY` qiymatlarini aynan o‘sha master’ning `private-keys.json`idagi mos qiymatlarga almashtiring. Qiymatni buyruqqa, shell tarixiga yoki chatga yozmang. Yangi `BACKUP_ENCRYPTION_KEY` va Admin parolini saqlang. `.env`0600 ekanini qayta tekshiring.
4. **Hali API hech qachon ishga tushmagan, mijozsiz VM**da:

```bash
docker volume create iprasm_sqlite
docker run --rm --mount type=volume,source=iprasm_sqlite,target=/data --mount "type=bind,source=$HOME/iprasm-import,target=/import,readonly" node:24-bookworm-slim sh -eu -c 'test ! -e /data/iprasm.sqlite; cp /import/database.sqlite /data/iprasm.sqlite; chown 1000:1000 /data /data/iprasm.sqlite; chmod 700 /data; chmod 600 /data/iprasm.sqlite'
IP_RASM_FIRST_DEPLOY=1 bash scripts/deploy.sh
```

`test ! -e` mavjud bazani asraydi. FIRST_DEPLOY faqat oldin API containeri bo‘lmagan birinchi toza import uchun: asl off-server nusxa saqlanadi, birinchi startupdan keyin shifrlangan backup yaratiladi. Keyingi deploylarda bu belgini ishlatmang. Eng avval pastdagi restore sinovini tugating. Mos pepper va DB ichidagi signer ajralib qolsa kodlar yoki eski yo‘riqnomalar ochilmaydi. [Million-kodning to‘liq qo‘llanmasi](KIT_MILLION_UZ.md).

## 6. Ishga tushirish va tekshirish

Toza, master import qilinmagan test o‘rnatma uchun ham:

```bash
bash scripts/deploy.sh
docker compose ps
docker compose logs --tail 30 api backup
```

Script image’larni build qiladi, mavjud o‘rnatmada deploydan **oldin shifrlangan backup muvaffaqiyatini talab qiladi**, so‘ng `docker compose up -d --wait` qiladi. Birinchi bo‘sh o‘rnatmada eski DB yo‘q. Orphan/mavjud volume’da backup ololmasa to‘xtaydi; tekshirmasdan chetlab o‘tmang.

Brauzerda `https://SIZNING_DOMEN/api/health`: `adminAuth=password`, `livePayments=false` bo‘lsin. `/api/features`da barcha qo‘shimcha imkoniyatlar false, `/api/generation/config`da enabled true bo‘lishi kerak. Sayt → Kirish → Admin → parolingiz bilan kiring. Admin → sotuvchi sozlamalarida Telegram nomi (@siz) va telefonni yozib saqlang; sahifani qayta ochganda kontaktlar yangilanadi, rebuild kerak emas. Soxta to‘lov/jo‘natish yoqilmagan.

`FEATURES=` asosiy mahsulot oqimini qoldiradi. Qo‘shimchalarni yoqish kerak bo‘lsa yopiq editorda masalan `FEATURES=gallery,expert` yozing va `bash scripts/deploy.sh`ni bajaring. Aniq ro‘yxat va API qoidalari [P1 texnik qaydi](P1_PRODUCTION_READINESS.md)da. O‘chirilgan API404 beradi; brauzer tugmasini yashirishning o‘zi xavfsizlik himoyasi emas.

## 7. Backup va xavfsiz restore sinovi

Backup startupda va har kuni **03:00 UTC**da ishlaydi; xatoda 10 daqiqadan keyin takrorlaydi. Natija AES-256-GCM `.ipb` arxiv: DB, **CODE_PEPPER**, kerakli runtime kalitlari va privacy jurnali birga. Signer DBning `kit_signer` jadvalida saqlanadi. Oxirgi **14 alohida kun + 8 hafta**, shuningdek 8 deploy-oldi arxiv lokal saqlanadi. Bu VMning o‘zidagi nusxa; offsite nusxasiz VM yo‘qolishidan to‘liq himoya yo‘q.

```bash
docker compose exec backup node scripts/production-backup.mjs
docker compose logs --tail 20 backup
docker compose exec backup sh -c 'ls -lh /backups/*.ipb'
```

Logdagi haqiqiy `daily-....ipb` nomini quyidagi `ARXIV.ipb` o‘rniga yozing. **Faol DB ustiga tiklamaydi**:

```bash
docker compose exec backup node scripts/restore-production-backup.mjs /backups/ARXIV.ipb /backups/drill-20261116
```

`authenticated=true`, `activeDataReplaced=false`, `kitSignerIncluded=true` kutiladi. Natija papkasida maxfiy `runtime-secrets.json` va ochilgan DBlar bor: bu papkani ommaga bermang. Qo‘lda restore-drill ochilgan nusxalarni diskka yozadi; tekshiruv tugagach **faqat shu yangi drill papkasini** tekshirib, xavfsiz olib tashlang yoki shifrlangan yopiq diskka saqlang. Kundalik arxivlar o‘zi shifrlangan qoladi. Bir xil mavjud drill manzili qayta ishlatilmaydi.

Haqiqiy avariyada tiklashdan oldin hozirgi app/erasure volume’larni saqlang. Eski arxiv privacy jurnalini hozirgi jurnal o‘rniga ko‘chirmang: arxivdan keyingi akkaunt o‘chirishlari ham qayta qo‘llanishi kerak. Tiklangan inactive DBni **eng yangi mos privacy jurnali** bilan replay tekshiruvidan keyin nazoratli almashtiring. `erasureReplay=true`ni tekshiring; avtomatik faol almashtirish yo‘q. `docker compose down -v`ni ishlatmang.

Bir arxiv payload’i hozir ko‘pi 2 GiB; backup/restore vaqtinchalik tmpfs limiti 5 GiB, joy haqiqiy ishlatilganda RAM sarflanadi. `df -h`, `free -h` va backup loglarini kuzating. Kattaroq DB uchun oldindan boshqa sinovdan o‘tgan backup rejasini tayyorlang.

## 8. Ixtiyoriy OCI Object Storage

Bu sozlanmasa tashqi upload **o‘chiq**. Private bucket yarating, faqat unga kerakli huquqdagi foydalanuvchi uchun **Customer Secret Key** oling. Yopiq `.env` editorida barchasini to‘ldiring:

```dotenv
BACKUP_S3_ENDPOINT=https://NAMESPACE.compat.objectstorage.REGION.oci.customer-oci.com
BACKUP_S3_REGION=REGION
BACKUP_S3_BUCKET=iprasm-private-backups
BACKUP_S3_ACCESS_KEY=SHAXSIY_ACCESS_KEY
BACKUP_S3_SECRET_KEY=SHAXSIY_SECRET_KEY
BACKUP_S3_PREFIX=iprasm/
```

Endpoint’ni regioningiz Console/rasmiy hujjatidan oling. Public bucket yoki pre-authenticated public link yaratmang. Region, namespace va secret key bir-biriga mos bo‘lsin. Deploydan so‘ng qo‘lda backup bajaring: faqat haqiqiy PUT muvaffaqiyatida uploaded true. Xato bo‘lsa lokal shifrlangan arxiv saqlanadi, deploy to‘xtaydi. Keyin arxivni yopiq tarzda qayta yuklab, alohida joyda ochishni tekshiring.

Lokal 14/8 tozalash cloud obyektlarini o‘chirmaydi. Bucket uchun, masalan, 90 kunlik lifecycle expiry va disk/billing kuzatuvini o‘zingiz sozlang; offsite retention alohida. P1 da real OCI kaliti ishlatilmadi yoki upload tasdiqlanmadi. [OCI S3/Customer Secret Key hujjati](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi.htm).

## 9. Idle reclaim va xarajat ogohlantirishi

Oracle uzoq sust ishlatilgan Always Free VMni qaytarib olishi mumkin: rasmiy shart 7 kunlik CPU, tarmoq va A1 RAM ko‘rsatkichlariga bog‘liq. Sun’iy yuk yaratib qoidani chetlab o‘tishga urinmang; off-server backupni saqlang.

Ixtiyoriy **Pay-As-You-Go**ga o‘tish xarajat qarori: faqat egasi roziligi bilan. Always Free chegarasidan ortiq resurs pullik bo‘lishi mumkin; PAYGni bepul yoki reclaim’dan mutlaq himoya deb qabul qilmang. Billing & Cost Management → Budgets’da **$1 oylik budget** va email alert qo‘ying (masalan actual50%/100%, forecast100%). **Alert xarajatni to‘xtatmaydi**, bildirishnoma kechikishi mumkin. [Budget yaratish](https://docs.oracle.com/en-us/iaas/Content/Billing/Tasks/create-budget.htm).

## 10. Keyingi yangilashlar

Tasdiqlangan feature commitni oling, so‘ng **har safar** `bash scripts/deploy.sh`. U backup tugamasdan yangi API’ni ishga tushirmaydi. Kalitlarni qayta yaratmang. Docker volume va zaxiralarni o‘chirmang. HTTPS, login, sinov surati, yo‘riqnoma/progress va backup/restore’ni domeningizda o‘zingiz tekshiring. Lokal software testi real Oracle VM, real telefon yoki haqiqiy taxta sinovining o‘rnini bosmaydi.
