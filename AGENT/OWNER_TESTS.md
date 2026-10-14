# Egasi uchun sinovlar (agent shu yerga yozadi, o'zbekcha)

Har bir yozuv: sana, nima ochish kerak, nimani bosish kerak, nima bo'lishi kerak, natijani qayerga yozish kerak.

Saytni ochish: `Start-Ip-Rasm.cmd` → http://127.0.0.1:4194

---

## 2026-10-14 — 0-bosqich, sinovlar xavfsizligi

Hozircha egasidan qo‘lda tekshiruv talab qilinmaydi: bu bosqich test sozlamalarini o‘zgartiradi. Saytdagi eski loyihalar va yig‘ish qadamlari saqlanadi. To‘liq brauzer sinovi tugagach natija shu faylga yoziladi.

Keyingi ilova o‘zgarishlari uchun: loyiha papkasida `npm run local` orqali http://127.0.0.1:4194 ni oching. Mavjud 4194-serverni to‘xtatmang. Yangi tekshiruv ko‘rsatmalari quyida bosqichma-bosqich qo‘shiladi.

0-bosqich tugadi: 186 ta unit test va 154 ta kompyuter/mobil brauzer holati tekshirildi. Ilova ko‘rinishi va algoritmlari o‘zgarmadi; qo‘lda qo‘shimcha sinov talab qilinmaydi. Keyingi bosqichlar uchun quyida yangi ko‘rsatmalar yoziladi.

## 2026-10-14 — 1-bosqich, ochiq tadqiqot

Natijalar `docs/COMPETITOR_WORKFLOW.md` va `docs/ALGORITHM_SURVEY.md` da. Qo‘lda brauzer sinovi kerak emas. QBRIX bilan haqiqiy surat bo‘yicha taqqoslash 6-bosqichda alohida yoziladi.

## 2026-10-14 — R4 sifat tashxisi

`output/quality-r4/report.html` ni oching. Asl surat, maqsad, eski to‘liq ip ketma-ketligi va v16 ni bir xil o‘lchamda ko‘ring; pastdagi kattalashtirilgan ko‘z, burun, lab, jag‘ va sochni solishtiring. “Fit graph” yig‘ish qo‘llanmasi emas. Qaysi joy tanib bo‘lmasligini shu faylga yozing. Hozircha yangi usul qabul qilinmagan; oldingi loyihalar o‘zgarmadi. Bu ko‘rish uchun agent ishini kutish shart emas.

## 2026-10-14 — v17 tajribasi rad etildi

`output/local-texture-v17/report.html` ni ochib asl surat, eski natija, nazorat va yangi tajribani ko‘ring. Yangi usul ayrim ip teksturasini kamaytirdi, ammo teri tusini yomonlashtirdi va ip sonini oshirdi; shu sabab asosiy usulga qo‘shilmadi. Eski guide va qadamlarga o‘zgarish yo‘q. `candidate.json` faqat tajriba uchun: “Loyihalarim” orqali import qilsangiz qadami 0 dan boshlanishi, PDF/TXT/JSON shu ketma-ketlikni saqlashi kerak. Ish boshqa bosqichlarda davom etadi.
