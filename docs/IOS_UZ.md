# iOS — egasi Macda bajaradigan ishlar

Windowsda iOS build yoki App Store sinovi bajarilgan deb hisoblamang. Umumiy web kod va bir serverdagi hisoblar tayyor; Xcode, imzo va qurilma sinovi Macda bo‘ladi.

1. Macda Node24, Xcode va Apple Developer hisobini tayyorlang. Reponing tasdiqlangan feature branchini yuklab oling, `npm ci` bajaring.
2. Mahalliy `.env.production` da public `VITE_NATIVE_API_BASE=https://DOMEN/api`, `VITE_NATIVE_DEBUG_SETTINGS=0` va `VITE_SERVER_GENERATION=1` bering. Production API ham `SERVER_GENERATION=1` bo‘lsin; Docker Compose shu rejimni yoqadi. Merchant/server/maxfiy kalitni `VITE_*` ga yozmang.
3. `npm run build -- --outDir output/ios-release` bajaring. Keyin `IP_RASM_NATIVE_WEB_DIR=output/ios-release npx cap sync ios` va `npx cap open ios`.
4. Xcode’da `uz.iprasm.app` uchun o‘z Team/provisioning/signing profilingizni tanlang. Sertifikat va provisioning fayllarini Gitga qo‘shmang.
5. Push kerak bo‘lsa o‘z Firebase iOS ilovangiz/APNs kalitini ulang; private `GoogleService-Info.plist` ni loyihangizning kerakli targetiga o‘zingiz qo‘shing, Gitga kiritmang. Yo‘l: [push sozlamalari](PUSH_NOTIFICATIONS_UZ.md). Agar bu fayl mavjud bo‘lmasa, avval oddiy ilovani tekshiring; real push sinovi da’vo qilinmagan.
6. Qurilmada ayni production HTTPS serverga kiring: webdagi hisob/loyiha/tasdiqlangan qadam/to‘xtagan joy tiklansin. Shaxsiy surat zaxirasi alohida rozilik bilan; qurilmagagina tegishli taxta checkpoint rasmlari avtomatik ko‘chmaydi.
7. Kamera ruxsati/rad etish, ovozli yo‘riqnoma, ekran qulfi, dam olish va internetsiz qaytishni tekshiring. Android uchun yozilgan mahalliy ovozli buyruq/background service iOSda mavjud deb ko‘rsatilmaydi; iOSda oddiy qo‘lda boshqaruv qoladi.
8. Xcode Archive → Validate → TestFlight. Privacy/permission matnlari va do‘kon ma’lumotlarini o‘zingiz tasdiqlang. Tarqatish yoki App Storega jo‘natish agent tomonidan bajarilmagan.

Mac/Xcode/haqiqiy iPhone yo‘qligi CODE tugatilishini kutmaydi; bu O08 egasi bajarganida yopiladigan build/device qabulidir. Aniq bajarilgan Windows/web/Android sinovlari AGENT/FINAL_REPORT.md da beriladi.
