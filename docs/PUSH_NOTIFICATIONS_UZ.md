# Qurilma bildirishnomalarini ulash

Hozir `FCM_MODE=disabled`: e’lonlar ilovaning o‘zida ko‘rinadi. Kod avtomatik testlarda faqat soxta FCM bilan sinaladi; hech kimga haqiqiy xabar yuborilmaydi. Haqiqiy Firebase loyihasi, xizmat akkaunti, APNs va telefon egasining roziligi keyin kerak.

## Server

1. O‘zingizning Firebase loyihangizda Cloud Messaging HTTP v1 API ni yoqing. Eng kam vakolatli xizmat akkauntiga xabar yuborish huquqini bering.
2. Gitga kirmaydigan `.env.production` ichida `FCM_MODE=fcm`, `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` ni yozing. PEM qator ajratishlarini `\n` ko‘rinishida bitta qo‘shtirnoqli qiymatda saqlash mumkin. `APP_DOMAIN` haqiqiy HTTPS domeningiz bo‘lsin. `docker compose --env-file .env.production up -d --build` bilan ishga tushiring.
3. Maxfiy kalitni `VITE_*`, APK, web konfiguratsiya, skrinshot, chat yoki Gitga qo‘ymang. Server OAuth tokenni qisqa muddat xotirada saqlaydi. Qurilma tokenlari SQLite ichida `CODE_PEPPER` dan hosil qilingan kalit bilan shifrlanadi; zaxirada ayni pepperni alohida xavfsiz saqlang.
4. Web uchun Firebase Web App yarating. Ochiq `FCM_WEB_API_KEY`, `FCM_WEB_APP_ID`, `FCM_SENDER_ID` va Cloud Messaging Web Push sertifikatidan **ochiq** `FCM_VAPID_PUBLIC_KEY` ni kiriting. API kaliti domen cheklovlarini sozlang. Xizmat akkaunti kaliti bu maydonlarga tegishli emas.

## Android

Firebase Android ilovasining package nomi `uz.iprasm.app`. O‘z `google-services.json` faylingizni `android/app/google-services.json` ga qo‘ying (Gitga kirmaydi). Yangi build uchun [APK_SERVER_AND_SIGNING_UZ.md](APK_SERVER_AND_SIGNING_UZ.md) ga amal qiling. Google Play Services bor haqiqiy qurilma yoki Google APIs emulator kerak. Sozlanmagan APK ham surat va oflayn yig‘ishda ishlaydi.

Manifest FCM va Analytics avtomatik ishga tushishini o‘chiradi. Qurilma tokeni faqat foydalanuvchi “Shu qurilmada yoqish” ni bosib ruxsat bergach olinadi. Android 13+ tizim ruxsati so‘raladi. O‘chirish/chiqish FCM auto-init ni ham o‘chiradi va tokenni o‘chirib tugashini kutadi. Boshqa ilovalar ruxsati o‘zgartirilmaydi.

## iPhone (Mac egasi bajaradi)

macOS/Xcode da `npm ci`, `npx cap sync ios`, `npx cap open ios`. `GoogleService-Info.plist` ni App targetiga qo‘shing (Gitga kirmaydi). `Signing & Capabilities` → `Push Notifications`, `Background Modes` → `Remote notifications`; o‘z Apple team/provisioning profilingizni tanlang. Firebase ga APNs authentication key/certificate yuklang. AppDelegate APNs callbacklarini uzatadi; SPM Firebase Messaging bog‘lanishi va opt-in/opt-out bridge tayyor. Bu Windows muhitida Xcode kompilyatsiyasi yoki haqiqiy APNs yetkazilishi tekshirildi degani emas.

## Ishlatish va chegaralar

Hisob menyusida “Bildirishnomalar” → “Shu qurilmada yoqish”. Oddiy yangilik va reklama roziligi alohida; reklama o‘chirilsa faqat yangiliklar keladi. Har bir hisobda ko‘pi bilan 10 faol qurilma. Token almashishi/qayta ochish/til yoki reklama roziligi o‘zgarishi serverni yangilaydi. Oldingi hisobning e’loni yangi hisobga yuborilmaydi. Internet bo‘lmasa o‘chirish niyati saqlanadi va o‘sha hisob qayta ulanayotganda qayta uriniladi. Hisobdan chiqish barcha hisob qurilmalarining serverdagi tokenlarini bekor qiladi; keyin yana rozilik berish kerak.

Admin → E’lonlar: e’lonni chop eting, keyin “Bildirishnoma yuborish”. Tugma takror bosilganda ayni so‘rov navbati ko‘paymaydi. Kelajakdagi boshlanish vaqti saqlanadi. O‘chirilgan, muddati tugagan yoki keyin tahrirlangan e’lonning eski navbati yuborilmaydi. Tokenlar 90 kun yangilanmasa o‘chiriladi. Yetkazish ko‘pi bilan 5 marta, oraliq bilan takrorlanadi; tarmoq javobi yo‘qolsa provayder xabarni olgan bo‘lishi mumkin, shuning uchun mutlaq bir martalik yetkazish va’da qilinmaydi. Bir e’lon/tahrir uchun bir xil notification tag/collapse key ishlatiladi. `UNREGISTERED` javobi tokenni bekor qiladi.

Web faqat HTTPS (lokal sinovda localhost) va qo‘llab-quvvatlanadigan browserda ishlaydi. Offline service worker va push birgalikda ishlaydi; tashqi script yuklanmaydi. Old plandagi ilovada e’lonlar yangilanadi; orqa planda tizim xabari ko‘rinadi. Xabar havolasi doim o‘z ilovamizning `/` sahifasiga boradi. Ruxsat rad qilinsa e’lonlar ilovada qoladi. Suratlar push ichiga yoki Firebase ga yuborilmaydi.

Manbalar: [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api), [token boshqaruvi](https://firebase.google.com/docs/cloud-messaging/manage-tokens), [Capawesome Messaging](https://capawesome.io/docs/sdks/capacitor/firebase/cloud-messaging/).
