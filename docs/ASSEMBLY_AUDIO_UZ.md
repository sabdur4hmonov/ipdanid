# Ekran qulflanganda ovozli yo‘riqnoma

Bu imkoniyat Android ilovasida ishlaydi. Brauzer va iPhone’da odatdagi ovoz ishlaydi: ilova fonga o‘tganda to‘xtaydi. Fon rejimi dastlab o‘chiq; ilovani qayta ochganda ham o‘zi yoqilmaydi.

1. Kit kodi bilan yo‘riqnomani oching va **Yig‘ish** ekraniga o‘ting.
2. **Ovozli qo‘llanma**ni yoqing, **Instruktor tili** va shu tildagi ovozni tanlang. Qurilmada o‘rnatilgan oflayn ovoz yoki to‘liq qo‘shilgan yozuv ishlaydi. Mos ovoz bo‘lmasa matnli yo‘riqnoma qoladi.
3. **Ekran qulflanganda ham ovozni davom ettirish**ni belgilang. So‘ng uchburchakli **Ijro** tugmasini bosing.
4. Ekranni qulflasangiz, Android bildirishnomasida joriy sektorlar ko‘rinadi: masalan **B-17 → C-42**. Oldingi/keyingi qadam, davom ettirish, pauza va yopish tugmalari bor. Ilova internet bo‘lmasa ham ochilgan yo‘riqnoma va mahalliy ovoz bilan ishlaydi.
5. Ipni haqiqatan tortib bo‘lgach, ilovadagi **Qadamni tasdiqlash**ni o‘zingiz bosing. Ovoz, pauza, oldingi/keyingi qadam hech qachon bajarilgan progressni tasdiqlamaydi.

Qadam oralig‘i ovoz tugashidan qisqa bo‘lsa, ilova gap tugashini kutadi. Shuning uchun vaqt taxminiy. Musiqa uchun oldingi fon tovushi bu rejimda o‘chadi.

Qo‘ng‘iroq yoki boshqa ilova ovoz ustunligini olsa, yoxud quloqchin uzilsa, yo‘riqnoma pauzaga tushadi. O‘zi davom etmaydi. Ikki daqiqa pauzada qolgan boshqaruv yopiladi; kerak bo‘lsa ilovani ochib qayta boshlang. Bildirishnomani yopish yoki ilovani oxirgi ilovalar ro‘yxatidan chiqarish ovozni to‘xtatadi.

Loyiha, til, ovoz yoki qadam tezligi almashtirilsa, fon rejimi o‘chadi. Yangi sozlama bilan yana o‘zingiz yoqing. Ilova qayta ochilganda shu loyiha va aynan shu yo‘riqnomaning eng yangi aytilgan qadami tiklanadi; ovoz avtomatik boshlanmaydi. Bajarilgan progress alohida saqlanadi. Eski yoki boshqa loyiha qadami tiklanmaydi.

746ta haqiqiy WAV yozuvlari hozir qo‘shilmagan. Ularni tayyorlash: [VOICE_RECORDING_UZ.md](VOICE_RECORDING_UZ.md). To‘liq manifest va fayllar yangi APKga qo‘shilganda yozilgan ovozlar odatdagi ovoz tanlovida paydo bo‘ladi. Ovozlar tizimida kerakli til oflayn o‘rnatilganini telefon sozlamalarida tekshiring; ilova til paketini o‘zi yuklamaydi.

Kod va avtomatik sinovlar haqiqiy telefonda olti soat sinov o‘tkazildi degani emas. Yakuniy Phase15 APK uchun manzil va fayl `output/phase15/manual-testing.txt` hamda `AGENT/OWNER_TESTS.md`da beriladi; hozirgi4210rasm sinov sahifasi avvalgi muzlatilgan builddir.
