# GitHub PR uchun qolgan repo sozlamasi

2026-10-29 origin ref tekshiruvida `feat/full-roadmap` tasdiqlandi, `main` yo‘q. Oldingi PR so‘rovi GitHub’dan422/base-invalid javobini olgan. Bu sayt yoki APK ishlashiga ta’sir qilmaydi; manbani feature branchdan yuklash mumkin.

Agentga faqat feature branchga push ruxsat etilgan. Shu sabab agent `main` yaratmaydi, unga push qilmaydi, boshqa bazani o‘zboshimchalik bilan tanlamaydi va merge bajarmaydi.

1. Repo egasi sifatida `main` qaysi **barqaror boshlang‘ich commit**dan ochilishini tanlang. Feature branchning ayni uchidan ochish taqqoslashni bo‘sh qilib qo‘yadi; tekshirilmagan bazani tasodifan tanlamang.
2. GitHub’da shu tanlangan bazadan `main` tayyorlang. Bu owner repo qarori; kodga yangi funksiya qo‘shish talab qilinmaydi.
3. Keyin Pull requests → New pull request: **base main**, **compare feat/full-roadmap**. Sinov hisobotini va farqlarni ko‘rib chiqing; avtomatik merge yoqilmadi. Agentga davom etish aytilsa, ruxsat etilgan feature→main PRni yaratib biriktirishi mumkin.

Hozir sinash: http://127.0.0.1:4217/ . Quti kodi faqat mahalliy `output/phase16/manual-testing.txt`da. Domen/VPS, haqiqiy merchant kalitlari, release kaliti, ovozlar va jismoniy sinov bo‘yicha aniq yo‘llar `AGENT/FINAL_REPORT.md`da.
