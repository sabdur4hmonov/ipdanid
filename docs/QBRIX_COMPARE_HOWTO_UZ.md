# QBRIX bilan halol taqqoslash uchun fayllar

Hozir `comparison/qbrix/` da egasining asl surati va QBRIX natijalari yo‘q. Taqqoslash bajarilmadi; ustunlik haqida xulosa yo‘q. Agent boshqa bosqichlarda davom etadi.

1. Agar o‘zingizda qonuniy QBRIX kirishi/kit bo‘lsa, [QBRIX](https://qbrix.me/) ni o‘zingiz oching. Kit kodi yoki hisob parolini loyihaga yozmang va agentga yubormang. Agent xarid qilmaydi, yopiq oynani chetlab o‘tmaydi va suratni u yerga avtomatik yuklamaydi.
2. Bitta aniq suratni tanlab uning **asl faylini** saqlang. QBRIXga shu faylni o‘zingiz yuklang. Telefon ko‘rinishining skrinshotini asl surat o‘rnida yubormang.
3. Tanlangan taxta shakli, kenglik/balandlik (mm), mix soni, ip rangi/qalinligi, maksimal qadam, fon, kesish va aylantirishni yozing. Ko‘rsatilmagan qiymatga `unknown` yozing. Narx yoki reklama matnidan material sonini taxmin qilmang.
4. QBRIXdagi tayyor oldindan ko‘rinishni asl o‘lchamda oling. Ruxsat berilgan yuklash tugmasi bo‘lsa PDF/JSON/TXT ketma-ketligini ham oling. Faqat skrinshot bo‘lsa uni shunday belgilang. Ochilmagan pullik faylni olishga urinmang.
5. Quyidagilarni mahalliy `comparison/qbrix/` papkasiga qo‘ying:

   - `source-original.jpg` yoki `.png` — aynan yuklangan asl surat;
   - `source-crop.png` — mavjud bo‘lsa aynan yakuniy kesilgan surat;
   - `qbrix-preview.png` — asl eksport yoki to‘liq skrinshot;
   - `qbrix-guide.pdf`, `.json`, `.txt` — o‘zingizga ruxsat etilgan fayllar;
   - `settings.txt` — sana, mahsulot/taxta, barcha o‘lchamlar, mix/ip/qadam, kesish/aylantirish, fayl eksportmi yoki skrinshotmi. Yo‘q ma’lumotni `unknown` deb yozing.

Suratli fayllar va natijalar Gitga kiritilmaydi; papka shu sabab ignore qilingan. Kod/parol, to‘lov ma’lumoti yoki boshqa odamning ruxsatsiz surati kerak emas.

Agent fayllar kelgach avval manba va kesish tengligini tekshiradi, bizning haqiqiy to‘liq ip natijamizni mos taxta/mixda hisoblaydi. `output/qbrix-compare/report.html` da oddiy va kattalashtirilgan ko‘z, burun, lab, soch, barcha ulovchi iplar, ulanish soni, metr va taxminiy vaqt ko‘rsatiladi. QBRIXning bajariladigan ketma-ketligi yoki materiallari yo‘q bo‘lsa, faqat rasm bo‘yicha kuzatuv deb yoziladi; bunday holat aniq fizik/metrik ustunlikni isbotlamaydi. Soxta taqqoslash yoki suratni natija ustiga qo‘yish bo‘lmaydi.
