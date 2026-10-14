# Ikki haqiqiy instruktor ovozini yozish

Hozir **birorta yozib olingan instruktor ovozi o‘rnatilmagan**. Dasturda ikki alohida joy tayyor: `instructor-a` va `instructor-b`. Haqiqiy yozuvlar kelmaguncha ilova qurilmaning mavjud TTS ovozi yoki ekrandagi matndan foydalanadi. TTSni ikkita yangi inson ovozi deb ko‘rsatmaydi. Sinovdagi qisqa signal tovushlari inson nutqi emas va mahsulotga qo‘shilmagan.

Ikki xil rozilik bergan kishi kerak. Har biri o‘zi yaxshi biladigan UZ/RU/EN matnini yozsin; ikki joyni bir xil yozuvlar bilan to‘ldirmang. Birovning ovozini ruxsatsiz ko‘chirish yoki klonlash kerak emas. Yozuvlardan ilova ichida foydalanish va tarqatishga rozilikni alohida saqlang. Bu ovozlar hozir mavjud deb hisoblanmaydi.

## Aniq ro‘yxat va fayllar

To‘liq matnlar `docs/VOICE_RECORDING_LIST.csv` da: `clip_id, uz, ru, en`. Bo‘sh katak o‘sha til uchun qo‘shimcha yozuv kerak emasligini bildiradi. Har bir qatordagi matnni alohida faylga yozing; `clip_id` ni aytib yubormang.

- Har tilda 0–19, 20/30/40/50/60/70/80/90 va 100/200/300/400/500/600/700/800/900 alohida yoziladi: 37 ta son bo‘lagi.
- 60 ta qisqa ibora ham ro‘yxatda bor: qadam, boshlang‘ich/keyingi mix, tugun, rang almashtirish, tasdiq, pauza, ta’mirlash, shablon va boshqa ko‘rsatmalar. Hammasi aynan CSVdagi matn bilan yoziladi.
- Rus tilida qo‘shimcha `number-1f` («одна»), `number-2f` («две»), `thousand-few` («тысячи»), `thousand-many` («тысяч») kerak.
- Har bir instruktor uchun UZ97, RU101, EN97 fayl: 295 ta. Ikkala instruktor va uch til to‘liq bo‘lsa **590 ta fayl**.

Yo‘l: `public/voices/<til>/<instruktor>/<clip_id>.wav`.

Misollar:

```text
public/voices/uz/instructor-a/number-2.wav        → ikki
public/voices/uz/instructor-a/number-100.wav      → yuz
public/voices/uz/instructor-a/number-200.wav      → ikki yuz
public/voices/uz/instructor-a/step.wav            → Qadam
public/voices/ru/instructor-b/number-1f.wav       → одна
public/voices/en/instructor-b/start-knot.wav     → Tie the thread securely to the starting pin.
```

## Yozish sifati

WAV, PCM16, mono, **24000 Hz**. MP3 faylini faqat nomini `.wav` ga almashtirish yaramaydi. Tinch xonada, bir xil mikrofon masofasi va ovoz balandligida yozing. Fon musiqasi, effekt va boshqa odam nutqi bo‘lmasin. So‘zni kesib yubormang, oldi/orqasidagi ortiqcha jimlikni qisqartiring; odatda 30–80ms tabiiy chet yetarli. Har bir fayl 20ms–30s chegarada. Uzun iboralarni shoshmasdan, sonlarni bir xil ohangda ayting.

Dastur bo‘laklarni birlashtiradi: `235` → «ikki yuz» + «o‘ttiz» + «besh». Ruscha `21021` → «двадцать» + «одна» + «тысяча» + «двадцать» + «один». Qadam raqami va mix ID si alohida o‘qiladi. Mix0 — «nol»; u tashlab ketilmaydi. Haqiqiy gaplarni tinglab, sonlar va harflar tushunarli ekanini har ikki instruktor bilan tekshiring.

## Indekslash va tekshirish

Yozuvlarni joylashtirgach loyiha papkasida:

```powershell
node --import tsx scripts/index-voice-clips.mjs
npm run build
```

Indeks skripti fayllarni o‘chirmaydi, WAV formati/davomiyligi va SHA-256 ni tekshiradi, `public/voices/manifest.json` ni yangilaydi. To‘liq bo‘lmagan til/ovoz tanlash ro‘yxatida paydo bo‘lmaydi. Bu rozilik, ovoz kimniki yoki talaffuz to‘g‘riligini avtomatik tasdiqlamaydi; egasi tinglashi kerak. Yig‘ish paytida faqat to‘liq, mahalliy faylli til/ovoz ochiladi. Build imzolarni tekshirib, to‘liq paketlarni internetdan mustaqil keshga qo‘shadi.

Yig‘ish oynasida instruktor tilini tanlang, yozib olingan ovozni tanlab «Ovozli qo‘llanma» ni yoqing. Keyingi qadam, takrorlash, pauza, til almashtirish va ilovani fon holatiga o‘tkazishda eski gap darhol to‘xtasin. Internetni o‘chirib qayta tekshiring. Ovoz fayli buzilsa yoki yo‘q bo‘lsa, qurilma ovozi yoki matn ishlasin; xatoni shu faylga yozing.

Hozir egasidan ushbu yozuvlar kutilmoqda. Agent bunga kutmasdan APK va boshqa tekshiruvlarni davom ettiradi. Haqiqiy telefon va ovozli qabul sinovi hali bajarilmagan.
