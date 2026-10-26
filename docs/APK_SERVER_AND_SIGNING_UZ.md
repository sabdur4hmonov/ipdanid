# 2026-10-27 — yangi debug nusxa

`output/mobile/ip-rasm-phase15-20261027-83b3e7b659b0-debug.apk` yangi portret tayyorlovi bilan yig‘ildi.121fayl va eski imzo tekshirildi;91avvalgi APK saqlangan. U faqat lokal sinov uchun4655APIga sozlangan. USBtelefon bilan keyin sinashda `adb reverse tcp:4655 tcp:4655` ishlating; yoki Admin → Server manzili orqali owner HTTPSAPI ni tanlang. Hech qanday telefon o‘rnatish/instrumentation bajarilmadi. Web-first sayt4215da, quti kodi faqat `output/phase15/portrait-review/manual-testing.txt`da.

Verifier yangi nusxada `--native-api-base http://127.0.0.1:4655/api --portrait-quality` oladi; eski tekshiruvlarning tarixiy manzilini o‘zgartirish shart emas. Noto‘g‘ri4482qiymat rad etilishi amalda sinaldi. Production/release uchun quyidagi HTTPS va egasining alohida kaliti bo‘yicha yo‘l saqlanadi.

# APK: server manzili va egasining imzosi

Debug APK Admin sahifasida **Server manzili** maydonini ko‘rsatadi. `VITE_NATIVE_DEBUG_SETTINGS=1` bilan yoqiladi. HTTPS manzilni `/api` bilan kiriting va **Saqlash va qayta ochish**ni bosing. Boshqa server tanlanganda eski hisob tokeni yangi manzilga yuborilmaydi. Oddiy browser shu saytning `/api` manzilidan foydalanadi; maydon APK sinovi uchun.

Builddan oldin shaxsiy `.env` fayliga `VITE_NATIVE_API_BASE=https://SIZNING-DOMENINGIZ/api` yoziladi. Merchant/parol/kalitlarni `VITE_` bilan boshlamang: bu qiymatlar ilova ichiga kiradi. Debugdagi `127.0.0.1` faqat mahalliy sinov uchun. Telefon localhosti kompyuter emas: keyingi telefon sinovida shu portni `adb reverse` bilan ulash yoki haqiqiy HTTPS domenni maydonga kiritish mumkin. Hozir telefon o‘rnatilmadi; browser native-mode testi alohida qayd etiladi.

## Eganing release kaliti

Kalitni faqat o‘zingiz yarating, parolini xavfsiz joyda saqlang va alohida zaxiralang. Repo ichiga qo‘ymang. Windows PowerShell misoli; haqiqiy parollarni buyruqqa yozmang, `keytool` o‘zi so‘raydi:

```powershell
$signDir = Join-Path $env:USERPROFILE '.iprasm-signing'
New-Item -ItemType Directory -Path $signDir -Force
& "$env:JAVA_HOME/bin/keytool.exe" -genkeypair -keystore (Join-Path $signDir 'release.jks') -alias iprasm -keyalg RSA -keysize 3072 -validity 10000
$env:IP_RASM_RELEASE_STORE_FILE = Join-Path $signDir 'release.jks'
$env:IP_RASM_RELEASE_KEY_ALIAS = 'iprasm'
$storeSecret = Read-Host 'Keystore paroli' -AsSecureString
$keySecret = Read-Host 'Kalit paroli' -AsSecureString
$env:IP_RASM_RELEASE_STORE_PASSWORD = [System.Net.NetworkCredential]::new('', $storeSecret).Password
$env:IP_RASM_RELEASE_KEY_PASSWORD = [System.Net.NetworkCredential]::new('', $keySecret).Password
./scripts/build-release.ps1 -ValidateOnly
./scripts/build-release.ps1
Remove-Item Env:IP_RASM_RELEASE_STORE_PASSWORD
Remove-Item Env:IP_RASM_RELEASE_KEY_PASSWORD
```

Skript HTTPS API ni talab qiladi, Server maydonini release uchun o‘chiradi, yangi `output/release-VAQT` katalogini yaratadi, web build + Capacitor + offline Gradle qiladi va unsigned APKni `zipalign/apksigner` bilan imzolaydi. Parollar argumentda ko‘rinmaydi: vosita ularni muhitdan oladi. Development sertifikati bilan release natijasini rad etadi. `JAVA_HOME` va `ANDROID_SDK_ROOT`, SDK/Gradle keshi avval tayyor bo‘lsin. Skript publish yoki install qilmaydi. Keystore hali yo‘q; haqiqiy release imzolangan deb da’vo qilinmaydi.

`build-release.ps1` shu tekshiruvlarning yagona mavjud `Release-Android.ps1` bajaruvchisiga murojaat qiladi. Egasi kalitlari yo‘q holatda ValidateOnly build boshlamasdan rad etilishi tekshirildi; hech qanday kalit yaratilmagan. Bu Windows hostdagi sinov uchun mavjud JDK21 va loyiha Gradle keshi ishlatiladi; mos kelmaydigan yangi JDKni tasodifan tanlamang. Android Auto Backupga ilova ma’lumotini qo‘shish o‘chiq; hisoblararo tiklash serverdagi rozilikli nusxa orqali ishlaydi. Asl OS kamera fayllari va boshqa OS ko‘chirishlari ilova tomonidan boshqarilmaydi.
