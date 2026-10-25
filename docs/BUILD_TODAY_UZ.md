# Birinchi taxtani yasash

Tashqi o'lcham **500 x 500 mm**, oq MDF. Ilovadagi amaldagi kit: har shaklda **240 mix**, mix tanasi **1.5 mm**, qora monofilament ip **0.12 mm**. Bu raqamlar fizik material sinovining o'rnini bosmaydi: taxta qalinligi, mix uzunligi va pilot teshikni real MDF bo'lagida tekshiring.

## Andozalarni olish

GitHub nusxasida `npm ci` dan keyin:

```powershell
node --import tsx scripts/export-board-pack.ts
```

`output/board-ready-20261025/BIRINCHI-OQING.html` ni oching. Script shu nomdagi tayyor paketni ustidan yozmaydi.

- `01-taxta-500x500-1ga1.pdf`: katta printer uchun bitta 500 x 500 mm sahifa.
- `02-taxta-A4-6-varaq.pdf`: oddiy A4 printer uchun yuqoridagi andozaning 6 varaqli muqobili.
- `03-sektorlar-A4-18-varaq.pdf`: doira 1-6, kvadrat 7-12, yurak 13-18-betlar.
- `mix-koordinatalari.csv`: ustaga/CNCga mix markazlari, millimetrda, taxtaning old tomonidagi chap-yuqori burchakdan.

**100% / Actual size** bilan chop eting. Avval har varaqdagi **50 mm** belgini chizg'ich bilan tekshiring. Fit/Shrink yoqilgan nusxani ishlatmang. A4larni raqamlangan 3 ustun va 2 qator qilib, 10 mm umumiy belgilarini moslab ulang. Sektor stikerlarini ham cho'zmasdan ayni masshtabda chiqaring.

## Aniq o'lchamlar

| Shakl | Mix markazlari konturi |
| --- | --- |
| Doira | 460 mm diametr, taxta chetidan 20 mm |
| Kvadrat | 470 x 470 mm, taxta chetidan 15 mm |
| Yurak | 367.041354 x 348.385498 mm, aynan PDF konturi |

Yurakning sozlamadagi 390 mm qiymati hisoblash ramkasi; kontur kengligi deb olib qo'lda cho'zmang. Uch naqshda 720 alohida nuqta bor; eng yaqin markazlar 3.004948 mm masofada. C/S/H belgisiga qarab doira/kvadrat/yurakni ajrating. Bir rasm uchun tanlangan naqshning 240 mixini o'rnating.

## Ilovadan birinchi ipgacha

1. Yangi sinov sahifasi: `http://127.0.0.1:4214/`. Bu manzil shu kompyuter uchun. Telefon uchun public HTTPS domen yoki alohida qurilma sozlamasi kerak; domen/VPS: [DEPLOY_VPS_UZ.md](DEPLOY_VPS_UZ.md).
2. Suratni yuklang, shaklni tanlang, oq fon va joylashuvni o'zingiz belgilang. Noma'lum rasm ishonchli qirqilmasa, surat butun saqlanadi; qirqimni qo'lda tuzatish mumkin.
3. **Yaratish** bosing va aynan ipli natijani ko'ring. **Burun va nozik yuz tafsilotlari bo'yicha sifat hali qabul qilinmagan.** Yoqmagan natijani yig'ishni boshlamang.
4. **Yig'ishni boshlash** orqali kit kodini kiriting. Lokal test kodi faqat `output/phase15/subject-repair/manual-testing.txt` da; uni andoza/ustaga beriladigan arxivga qo'shmang.
5. Birinchi tugun va yo'nalishni aynan shu natijaning ekrani/PDFidan oling. B-17 - B sektoridagi 17-mix. Teshish andozasi umumiy; **qadam PDFi esa tanlangan rasmga xos**.
6. Ishni qilgach bajarilganini tasdiqlang. Oldingi/Keyingi bilan qarash bajarilgan qadamni o'zidan-o'zi tasdiqlamaydi.
7. **Dam olish** ni bosing, saqlangani ko'rinishini kuting. Xuddi shu brauzer/qurilma va shu qo'llanmani qayta oching. Internetni uzishdan oldin ilova va qo'llanma qurilmaga yuklangan bo'lsin. Ovoz mavjud qurilma TTSidan foydalanadi; real ovoz yozuvlari hali egasi tomonidan qo'shiladi.

3000 ip uchun 8 soniyadan taxmin **6 soat 40 daqiqa**. Haqiqiy yig'ish vaqti hali o'lchanmagan. Ip metrini har bir natijaning hisobidan oling; 1200 m boshlang'ich zaxira barcha kvadrat/rasmlarga yetadi deb hisoblamang. Dastlab 20-50 qadamdan keyin yo'nalish, mix mustahkamligi, ip tarangligi va dam olishdan qaytishni tekshiring.

Physical acceptance: [PHYSICAL_BOARD_UZ.md](PHYSICAL_BOARD_UZ.md). Barcha qolgan kod va test holati: [AGENT/PROGRESS.md](../AGENT/PROGRESS.md).
