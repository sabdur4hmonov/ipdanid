Joriy tekshiruv: PHOTO_QUALITY_CHECKPOINT.md. Lokal sayt4194/API4331: Start-Ip-Rasm.cmd. Suratga maslahat va bir nechta yuz uchun alohida zonalar mavjud; sifat kafolati yoki fizik sinov emas. Android yangi build lokal saqlanadi, telefon sinovi egasi tomonidan keyinga qoldirilgan. Native commerce uchun tegishliHTTPSbackend sozlash talab qilinadi; brauzerdagi to‘lov/dostavka/xabarlar lokal sandbox. Asl loyiha/progressni boshqa portga ko‘chirishda eski saytdan JSON eksport qilib import qiling; eski origin saqlanadi.

# Ip Rasm lokal sinov — 2026-10-12

Hozirgi buildni sinash uchun `Start-Ip-Rasm.cmd` ni oching, keyin http://127.0.0.1:4192/ ga kiring. Terminal ochiq tursin. APK: `output/mobile/ip-rasm-test-ready-debug.apk`. Bu sinov yig‘masi; yangi APK hali haqiqiy telefonda sinalmagan. Eski appni o‘chirmang yoki storage tozalamang. Muhim loyihalarni avval JSON orqali zaxiralang.

1. Galereyadan asl suratni tanlang. Tiniq surat, och oddiy fon va tekis yorug‘lik yordam beradi; mavjud yoki naqshli fonli suratlar ham qabul qilinadi. Surat tashqariga yuborilmaydi.
2. Tayyorlangan suratni tekshiring. Fon soch, quloq yoki bo‘yinni kesib qo‘ysa, fon boshqaruvlarini ochib qo‘lda tuzating yoki asl holatni qaytaring. Crop odamni shakl ichida saqlasin.
3. Portret sozlamalarida ko‘z, burun, og‘iz zonalarini haqiqiy anatomiyaga qo‘ying. Taxminiy zonalar avtomatik aniqlangan anatomiya emas. Kerak bo‘lsa qo‘lda siljiting/o‘lchamini o‘zgartiring.
4. Haqiqiy taxta, mixlar, ip qalinligi va mavjud metrni kiriting. 320 hisoblash alohida tajriba; oddiy160 default tezlik sabab sifat g‘olibi deb e’lon qilinmagan. Sozlama almashtirish haqiqiy ip yoki mix bilan ta’minlamaydi. Yuz/soch tajribasi ham hali sifat yechimi emas.
5. Hisoblang. Bekor qilib, recovery mavjud bo‘lsa sahifani yangilang va suratni qayta yuklamasdan davom ettiring. Natija ko‘rinmaguncha sahifani yopmang; recovery faqat yozilgan checkpointgacha boradi.
6. Variantlarni ko‘rib, ko‘z, burun, lab va sochni asl surat bilan solishtiring. Ip ortsa-yu yuz yaxshilanmasa, yaxshiroq deb hisoblamang. Eski surat natijasini generation manbasi sifatida yuklamang.
7. Saqlang va yig‘ish oynasini oching. Yangi variant0qadamdan boshlansin. Bir necha qadamni tasdiqlang, chiqib qaytib kirib aynan shu loyiha/qadam saqlanganini tekshiring. Ovoz tiliga mos qurilmada o‘rnatilgan voice kerak bo‘lishi mumkin.
8. JSON zaxira va PDF yo‘riqnomani chiqarib ko‘ring. Hash/qadamlar tanlangan loyihaga mos bo‘lsin. Print100% va ruler tekshiruvisiz taxtani tayyorlamang. Oflayn rejimda saqlangan loyiha/eksportni tekshiring; sandbox/do‘kon internet talab qilishi mumkin.
9. Eski sayt4183dagi loyihalar shu saytga avtomatik ko‘chmaydi. Eski saytni/storage’ni saqlang; kerakli JSON’ni4192dagi Loyihalarim orqali import qiling. Bir xil sequence progressi zaxiradan saqlanadi, boshqa variantga progress o‘tkazilmaydi.
10. Muammo bo‘lsa ekran, tanlangan variant/hash, til, qurilma va aniq takrorlash qadamlarini yozing. Asl suratingizni tashqi servisga yuborish kerak emas.

Hali ochiq: burun/lab/soch aniqligi, turli portretlarda sifat; real ip sarfi, mixga o‘rash sig‘imi va taranglik; hozirgi APKda haqiqiy offline/audio/eksport; iOS; haqiqiy payment/xabar/store xizmatlari va qolgan to‘liq roadmap. Browser test yoki APK build jismoniy sifatni isbotlamaydi.
