[Barcha rejalar, bajarilgan ishlar va qolganlar](PROJECT_REPORT_2026-10-29_UZ.md).

## 29.10.2026 — yangi yakuniy funksional nusxa

Sayt:**http://127.0.0.1:4217/**. APK:**output/mobile/ip-rasm-phase16-20261029-be6e489bff81-debug.apk**. Uchta shaxsiy kod va Admin ma’lumoti faqat `output/phase16/manual-testing.txt`da. Har kod3ta yangi ish uchun;takror ochish bepul. Kodlarni bu hisobotga ko‘chirmang.

1. Galereyadan tanlang → Doira/Kvadrat/Yurak → surish/kattalashtirish/burish → Yaratish. Bepul ipli rasmni ko‘ring.
2. Yig‘ishni boshlash → shaxsiy fayldan kit kodi → bir ishni ochish. Bajarilgan qadamni tasdiqlang.
3. Dam olish → qayta kirish → Loyihalarim → Davom etish. Aynan shu yo‘riqnoma va oxirgi tasdiq saqlansin;avval ochilgan ish offline ishlaydi.
4. Admin → Kitlar:haqiqiy1 000 000chiqarilgan/tayyor zaxira ko‘rsatiladi;kodlar ro‘yxati yo‘q. Telefonda holat ustuni uchun jadvalni yoniga suring.
5. Yasashdan oldin100%shablon va50mmchiziqni tekshiring:[PHYSICAL_BOARD_UZ.md](../docs/PHYSICAL_BOARD_UZ.md). API4657ga telefonni ulash:[APK_SERVER_AND_SIGNING_UZ.md](../docs/APK_SERVER_AND_SIGNING_UZ.md).

Bular avtomatik bajarildi;hozir sizning javobingiz kutilmaydi.741unit/348joriy desktop-mobil/7alohida himoyalangan holat va real millionlik nusxada rasm→ochish→qayta kirib1-qadamdan davom etish o‘tdi. Android fayl/imzo tekshirildi,telefon o‘rnatilmadi. Burun detali yangi yaxshilandi deyilmaydi. To‘liq holat:[FINAL_REPORT.md](FINAL_REPORT.md).

## 29.10.2026 — yangi Android APK tekshirildi

Yangi fayl: output/mobile/ip-rasm-phase16-20261029-be6e489bff81-debug.apk.122web fayli aniq mos,eski imzo saqlangan,98arxiv yozuvi o‘zgarmagan.3haqiqiy shaxsiy kalit qiymati paketda yo‘q. Server manzili4657; noto‘g‘ri4656qiymat rad etildi. Telefon o‘rnatilmagan,bu debug nusxa. Telefonda keyin sinash uchun docs/APK_SERVER_AND_SIGNING_UZ.md. Yangi sayt hali ishga tushiriladi; burun sifati tuzatildi deyilmaydi.

## 29.10.2026 — to‘liq brauzer regressiyasi tugadi

81fayl,161ta alohida API ishida348ta holat o‘tdi. Yakuniy qabul qilingan natijalarda skip/flaky/xato yo‘q. Bitta mobil surat zaxirasi kutish xatosi saqlandi; o‘zgartirilmagan uchala sinov yangi serverda o‘tdi. Telefon maketidagi sekinlashtirilgan sahifa sinovlari ham o‘tdi, bu haqiqiy telefon o‘lchovi emas.741unit,avvalgi alohida7himoyalangan oqim,yangi build va0zaiflikli npm audit qayd etildi. APK va yangi4217havolasi keyingi qadam; burun sifati hali ochiq. Hozir sizdan qo‘lda sinov talab qilinmaydi.

## 28.10.2026 — server nusxasi va to‘liq unit tekshiruvi

741/741unit va serverning alohida nusxasida7ta asosiy desktop/mobil/AndroidAPI maketi sinovi o‘tdi. Bitta dastlabki Chrome ochilish xatosi saqlandi, boshlanmagan asosiy sinov alohida o‘tdi. Kod/dependency keyin o‘zgarsa ham nusxadagi yangi hisob eski kodni ishlatishi sinaldi. Yangi build tayyor; umumiy161ta alohida brauzer ishini tekshirish,APK va yangi havola hali qolgan. Play Marketdagi o‘xshash ilovalarning ochiq manbalari ko‘rildi, hozircha sifatni oshiradigan isbotlangan yangi algoritm yo‘q. Burun sifati ochiq. Sizdan qo‘lda sinov talab qilinmaydi.

## 28.10.2026 — yakuniy himoyalangan oqim7/7

Yangi122faylli buildda desktop3,mobil3,AndroidAPI maketi1sinov o‘tdi. Moslashdan keyin Yaratishdan natijagacha10,5/11,1soniya; asl rasm tanlash va dastlabki tahlil vaqti bunga kirmaydi. Kod bilan ochish,bepul qayta ochish,offline1-qadam,bekor qilish va4til tekshirildi. Keyingi topilgan ish: keyin kodlar o‘zgarsa ham yangi serverdagi hisob o‘zgarmasligi uchun serverning o‘zini ham alohida yopiq nusxaga saqlash. Shundan so‘ng qolgan matritsa vaAPK yakuni. Hozir yangi URL/APK yoki burun yaxshilandi deyilmaydi; eski sayt saqlangan. Sizdan qo‘lda sinov kerak emas.
## 28.10.2026 — umumiy unit va yakuniy build

733ta to‘liq sozlangan unit sinovi o‘tdi. Keyin runnerga kirmay qolgan1ta render testi to‘g‘ri ulandi va yangi guardlar bilan alohida tekshirildi:jami738ta takrorlanmagan unit natijasi o‘tgan (bir buyruqdagi738degan da’vo yo‘q). Protected va mahalliy rejimning122faylli yangi buildlari tayyor. Maxfiy kod yo‘riqnomalari uchun8ta sun’iy HTTPsinovi403bilan yopildi; haqiqiy kalit yoki kod so‘ralmagan. Eski nusxalar saqlangan. Yangi yakuniy brauzer matritsasi,APK va havola hali e’lon qilinmagan; burun sifati o‘zgardi deyilmaydi. Hozir sizdan qo‘lda sinov yoki kalit kerak emas.
## 28.10.2026 — Admin va buyurtma/dastavka yakuni

Desktop va mobil12/12sinov o‘tdi: haqiqiy bazadagi kod zaxirasi,QR/PDF,narxlar,olib ketish/kuryer,qayta urinishda ayni buyurtma,sandbox Click/Payme va kredit muddati. Yangi zaxira oynasi kodlarning o‘zini ochmaydi. Noto‘g‘ri offline matni va uzun ID ko‘rinishi tuzatildi.26tegishli unit,keyingi8ta o‘zgargan modul sinovi,yangi build va4til kalit tekshiruvi o‘tdi. Siz hozir qo‘lda tekshirishingiz shart emas. Keyin Admin → kitlar bo‘limida chiqarilgan/reja/holatni ko‘rasiz. Haqiqiy bir millionlik yopiq zaxira yangi yakuniy serverga ulanishi kerak; eski4216ga avtomatik ulanmagan. Burun sifati,umumiy yakuniy tekshiruv,yangiAPK va yangi havola hali davom etadi.
## 28.10.2026 — production sozlamalari va lokal Docker sinovi

Sayt buildi,API va egasi imzolaydigan Android release bir xil himoyalangan rejimga sozlandi.5tegishli unit,yangi build,Dockerda43tekshiruv va alohida production API sinovi o‘tdi. Lokal HTTPS ostida rasm tanlash,serverda yaratish,kod bilan ochish va PDF tekshirildi. Bu haqiqiy VPS sertifikati yoki telefonda sinov emas. Qo‘llanmalar: docs/DEPLOY_VPS_UZ.md va docs/APK_SERVER_AND_SIGNING_UZ.md. Sizdan hozir kalit yoki qo‘lda sinov kutilmaydi; yangi APK/havola va qolgan sifat/Admin/dastavka ishlari davom etadi.
## 28.10.2026 — server va Android API tengligi tekshirildi

Asl tayyorlangan rasm va boshqa12namunada server natijasi oldingi qabul qilingan ip yo‘li va har bir piksel bilan aynan teng:3,0–5,7soniya.68unit,desktop/mobil2ta,Android API maketi1ta va yangi build o‘tdi. Ochilgan ish1-qadamda API internetsiz tiklandi. Bu burun sifati yaxshilandi yoki haqiqiy telefon sinaldi degani emas. Production sozlamalari,Admin/dastavka,sifat va yangiAPK/havola hali ochiq; eski saytlar saqlangan. Sizdan hozir qo‘lda sinov talab qilinmaydi.
# Egasi uchun sinovlar (agent shu yerga yozadi, o'zbekcha)

## 2026-10-28 — himoyalangan uch ekranli sayt oqimi

Avtomatik desktop3/3 va mobil3/3 o‘tdi: tanlash → moslash → bepul ipli PNG; bir xil joylashuvda qayta yaratish yangi hisob boshlamaydi. Kod bilan kirishda parol kerak emas, ochishda faqat1kredit sarflandi. Qayta ochish bepul, internetsiz qayta yuklab1-qadamdan davom etish va JSON zaxira ham tekshirildi. Bekor qilish yoki menyudan chiqish kechikkan natijani qaytarmaydi. Server o‘chiq bo‘lsa maxfiy yo‘l mahalliy hisobga yashirin o‘tmaydi. UZ Latin/UZ Cyrillic/RU/EN matni sig‘adi.

Sun’iy rasm uchun yaratish desktop4,026soniya/mobil4,009soniya. Buni burun sifati tuzatildi yoki barcha surat bir xil vaqtda tayyor bo‘ladi deb tushunmang. Eski mahalliy rejim ham desktop/mobil sinovida3ishdan keyin4-ishni yopdi (2/2). Tegishli64unit va ikkala build o‘tdi. Hozir qo‘lda sinov kutilmaydi; yakuniy yangi URL/APK keyingi yakunlash bosqichida. Rejimlar: `docs/PROTECTED_GENERATION_UZ.md`.

## 2026-10-28 — bir million shaxsiy quti kodi

Serverdagi yopiq hisoblash yadrosi ham sinaldi: oxirgi haqiqiy sinovda 5,1 soniya, mahalliy hisob bilan ketma-ketlik va PNG aynan teng; 57 ta tegishli test, 48 ta eski kit HTTP va 30 ta yangi HTTP tekshiruvi o‘tdi. Bu hali oddiy mijoz oynasiga ulanmagan, hozir yoqish shart emas. Oynaga ulash davom etadi; qo‘lda sinov kutilmaydi. Chegaralar va ma’lumot yuborish: `docs/PROTECTED_GENERATION_UZ.md`. Burun tuzatildi yoki yangi APK chiqdi deyilmaydi.

Avtomatik tekshirildi: **1 000 000 ta ishlatilmagan kod**, har biri **3 ta to‘liq ish** uchun. Har bir kod shifrlangan fayldan bazaga aniq solishtirildi. Uch namunada uchta ish ochildi, to‘rtinchisi rad etildi, eski ish boshqa qurilmada bepul qayta ochildi; sinovlar qaytarilgani uchun haqiqiy kodlar ishlatilmagan qolgan. HTTPda 15 tekshiruv, shaxsiy faylni brauzerda ochishni rad qilishning 4 tekshiruvi va 1000 kodlik chop etish sinovi o‘tdi. Hozir qo‘lda sinov shart emas.

Zaxira eski 4216 saytiga ulanmagan, alohida yopiq papkada. Uni GitHubga yubormang. Chop etish, kalitni saqlash va keyingi yangi VPSga ko‘chirish: `docs/KIT_MILLION_UZ.md`. Saytning brauzerga yuborilgan JavaScript qismini butunlay yashirib bo‘lmaydi; yo‘riqnoma ketma-ketligini serverda saqlash alohida keyingi ish bo‘lib qoladi. Burun sifati va yakuniy Android hali shu yangi bosqichda tugallandi deyilmaydi.

Har bir yozuv: sana, nima ochish kerak, nimani bosish kerak, nima bo'lishi kerak, natijani qayerga yozish kerak.

## 2026-10-27 — QBRIX va Xitoy bozoridagi dasturlar tekshirildi

QBRIX ochiq sahifalarida ichki hisob formulasi berilmagan. Xitoydagi SiSiRuYing dizaynerga iplarni qo‘shish/o‘chirish va natijani tuzatish imkonini beradi; ALINEDECOoynasida hisob kuchi va ko‘rinish qalinligi alohida. Hech qayerga shaxsiy surat yoki quti kodi yuborilmadi. Boshqa ochiq tijoriy namunadagi4058qadamda faqat1ta takror bor: “takrorni ko‘paytirsak tuzaladi” degan xulosa yo‘q.

Uchta sun’iy bitta-ip o‘lchovi oldingi rad etilgan Radonvariantining hisob/ko‘rinishi mos emasligini ko‘rsatdi; hozirgi standart hisobdagi xato yoki haqiqiy taxta sifati tasdiqlandi deyilmaydi.4216/APKo‘zgarmadi, qo‘lda sinov shart emas. Dalillar: lokal `output/competitor-qbrix-china-20261027/report.html`; texnik xulosa `docs/QBRIX_CHINA_METHOD_RESEARCH_20261027.md`. Keyingi ish avval hisob modeli va ip ko‘rinishi tengligini mustaqil namunalarda tekshirish.

## 2026-10-27 — topilgan yangi usul originalda solishtirildi

Virtually Passed usulining kitimizga mos alohida varianti original suratingizda bir marta sinaldi.240mix/3000uzluksizip yo‘li9.4soniyada chiqdi, lekin yuz va burun sifati yomonlashdi. Shu sabab standart hisobga qo‘shilmadi. Bu aynan moslashtirilgan variant natijasi; muallifning MATLABdasturi bajarilgani aytilmaydi.4216sayt va APK saqlandi, yangi qo‘lda sinov shart emas. Lokal ko‘rish: `output/quality-projection-20261027/owner-circle/report.html`. Surat GitHubga yuborilmagan. Hali sifat yaxshilandi deyilmaydi.

## 2026-10-27 — GitHub va tashqi usullar qidirildi

16ta repo versiyasi, YouTube’dagi4ta video nomi/muallifi va ilmiy manbalar tekshirildi. Keyingi sinov uchun Virtually Passed’ning MITkodli, uzluksiz ip yo‘li beradigan usuli tanlandi. Videolar to‘liq tomosha qilingani yoki shu usul suratingizda allaqachon yutgani aytilmaydi. Hozir qo‘lda sinov yoki yangi surat kerak emas.4216sayt va APK o‘zgarmadi; original surat tashqariga yuborilmadi. Aniq solishtirish rejasi va manbalar `docs/STRING_ART_METHOD_RESEARCH_20261027.md`da. Yangi usulning aynan bizning kitda natijasi keyingi avtomatik sinovda tekshiriladi.

## 2026-10-27 — yangi tiniqlik sinovi foyda bermadi

Original suratingizda ip juftlarini almashtirish sinovi bajarildi. Yuz/burun/ko‘z/lab sifati yaxshilanmagan:0ta o‘zgarish qoldi. Shu sabab4216saytdagi hisob va APK o‘zgartirilmadi. Qo‘shimcha qo‘lda sinov yoki surat so‘ralmaydi.100%foto tengligi va’da qilinmaydi. Natija faqat lokal `output/quality-two-opt-20261027/owner-circle/report.html`da; original GitHubga yuborilmagan.

## 2026-10-27 — yangi yakuniy sayt:4216

**http://127.0.0.1:4216/**. Yangi quti kodi faqat `output/phase15/final-review/manual-testing.txt`da; Admin qiymatini ulashmang. Parolsiz3ta alohida yo‘riqnoma, bepul ipli ko‘rinish va ochilgan ishga bepul qaytish ishlaydi. Sizdan hozir javob kutilmaydi.

1. Galereyadan surat → Doira/Kvadrat/Yurak → o‘zingiz surish/kattalashtirish/Burish. Yuzga yaqinlashtirish ixtiyoriy, Qaytarish asl joylashuvni tiklaydi.
2. Oldin/Keyin bilan qirqimni ko‘ring; mushuk uchun tegishli tur, yozuv uchun Yozuvni tanlang. Lotin/kirill/arabcha aralash yozuv sinaldi.
3. Yaratish → bepul ip ko‘rinishi. Yoqsa Yig‘ishni boshlash → shu yangi quti kodi. Yangi suratlarni ko‘rish kredit olmaydi.
4. Bitta qadam → Dam olish → sahifani qayta ochish → qolgan joydan davom etish. Oflayn davom etish/PDF/TXT/JSON avtomatik tekshirildi.
5.687unit/18ochiqCI va38joriy lokal brauzer holati o‘tdi; eski346matritsa oldingi buildga tegishli. Dastlabki3vaqt oshishi saqlangan, ayni kvadrat4holati takroran9.3–9.9soniyada o‘tdi. Har safar15soniyadan kam bo‘lishi yoki foto bilan100%tenglik va’da qilinmaydi.
6. Jismoniy taxta uchun `docs/BUILD_TODAY_UZ.md`:500×500mm,100%chop etish,50mm belgini o‘lchash,240tanlangan mix va sektorlar. Haqiqiy taxta/telefon tekshiruvi keyin.

Mahalliy surat taqqoslash: `output/quality-original-20261026/final-review.html`. Original surat GitHubga qo‘yilmagan. APK: `output/mobile/ip-rasm-phase15-final-20261027-dbdc474e6f68-debug.apk`. Saytdagi121faylga aynan teng va avvalgi imzo saqlangan. API4656; keyin USBtelefon uchun `docs/APK_SERVER_AND_SIGNING_UZ.md`dagi adb reverse yo‘lini4656port bilan bajaring yoki Admin → Server manziliga HTTPSAPI kiriting. Telefon o‘rnatilishi/sinovi bajarilgani da’vo qilinmaydi. Quyidagi yozuvlar tarixiy.

## 2026-10-27 — yangi nusxa tekshiruvi davom etmoqda

Hozir sizdan javob kutilmaydi. Eski4215server o‘chiq ekan; u qayta ishga tushirilmadi. Yangi alohida havola tayyorlangandan keyin shu faylga yoziladi. Ixtiyoriy kattalashtirishda15soniyadan oshgan holatlar aniqlandi; ular o‘tdi deb yozilmaydi.29ta tenglik/moslik testi va yangi build o‘tdi. Original suratlar faqat kompyuterda.

## 2026-10-27 — yakuniy saytni o‘zingiz sinash

http://127.0.0.1:4215/ . Kit kodi faqat `output/phase15/portrait-review/manual-testing.txt`da. Admin tokeni ham shu shaxsiy faylda; uni ulashmang. Hozir sizdan javob kutilmaydi.

1. Galereyadan surat → Doira/Kvadrat/Yurak → surish/kattalashtirish/Burish. Yuzga yaqinlashtirish ixtiyoriy; Qaytarish butun suratni tiklaydi. Oldin/Keyin va qayta qirqish bilan ko‘ring.
2. Yaratishdan keyin haqiqiy ip ko‘rinishi bepul. Yoqsa Yig‘ishni boshlash → quti kodi. Parol shart emas;3ta alohida yo‘riqnoma ochiladi.
3. Bitta qadamni tasdiqlang → Dam olish → sahifani qayta oching. Qolgan joydan davom eting; kerak bo‘lsa Loyihalarim → Davom etish. Ayni ochilgan loyihaga yana kredit ketmaydi. Oflayn ham avtomatik sinaldi.
4. PDF/TXT/JSON va katta sektor yozuvi bir xil yo‘lni ko‘rsatadi.346yakuniy brauzer holati,679unit, qo‘shimcha26sifat/kit/oflayn holati va APK tekshirildi. Mayda detallar hali fotografiyaga teng emas; taqqoslash lokal report.html da.
5. Keyin taxta uchun docs/BUILD_TODAY_UZ.md:500×500mm andozani100%masshtabda chop eting,50mm belgini o‘lchang, tanlangan240mixni qo‘ying, sektorlarni yopishtiring. Jismoniy taranglik/metraj/o‘xshashlikni hali odam tekshiradi.

APK: `output/mobile/ip-rasm-phase15-20261027-83b3e7b659b0-debug.apk`. Telefon/HTTPSsozlash uchun docs/APK_SERVER_AND_SIGNING_UZ.md. Tashqi owner ishlari va PR main bazasi bo‘yicha aniq ro‘yxat AGENT/FINAL_REPORT.md da.

## 2026-10-27 — yangi APK ham tayyor

APK: `output/mobile/ip-rasm-phase15-20261027-83b3e7b659b0-debug.apk`. Eski ilova imzosi saqlangan,91oldingi APK o‘zgarmadi.121ichki fayl va serverga ulanishning desktop/mobil native-mode sinovi o‘tdi. Hozir telefon o‘rnatilishi kutilmaydi; bu sinov haqiqiy telefon tekshiruvining o‘rnini bosmaydi.

Bu debug nusxa kompyuterdagi4655APIga sozlangan. Keyin USBtelefon bilan sinash uchun `docs/APK_SERVER_AND_SIGNING_UZ.md`dagi adb reverse yo‘lini4655port bilan bajaring, yoki Admin → Server manzili orqali o‘zingizning HTTPSAPI manzilingizni kiriting. Production uchun owner domen/VPS va shaxsiy release kaliti kerak; yangi kalit yaratilmagan. Webda davom etish uchun4215saytdan foydalaning.

## 2026-10-27 — yangi tekshirilgan sayt

**http://127.0.0.1:4215/** ni oching. Yangi3ta yasashga yetadigan quti kodi faqat `output/phase15/portrait-review/manual-testing.txt`da. Faylni boshqalarga yubormang. Sizdan hozir javob yoki qo‘lda sinov kutilmaydi.

1. Galereyadan surat tanlang, Doira/Kvadrat/Yurakdan birini bosing. Rasmni o‘zingiz suring, kattalashtiring yoki buring. Yuzga yaqinlashtirish ixtiyoriy; Qaytarish butun suratni tiklaydi.
2. Oldin/Keyin va fonni qayta qirqish orqali qirqimni ko‘ring. Yaratishdan keyin haqiqiy ip natijasi bepul ko‘rinadi.
3. Yoqsa Yig‘ishni boshlash → quti kodi. Parol shart emas. Kod3ta alohida yo‘riqnomaga yetadi; avval ochilgan ishga qaytish bepul.
4. Katta sektor ko‘rsatmasi bo‘yicha bitta qadamni tasdiqlang, Dam olishni bosing. Sahifani qayta ochganda shu joydan davom eting; kerak bo‘lsa Loyihalarim → Davom etish. Oflayn davom etish avtomatik tekshirildi.
5. PDF/TXT/JSON ayni ip ketma-ketligini beradi. Originalga100%tenglik yo‘q: doira/yurakdagi burun/yuz biroz yaxshiroq, kvadrat foyda bo‘lmasa avvalgi variantni saqlaydi. Mahalliy taqqoslash: `output/quality-original-20261026/report.html`.

24sifat/moslik va2to‘lovsiz test-kod/eksport/oflayn holati desktop hamda mobilda o‘tdi. Yaratish2.5–7.2soniya. Bu mobil ekranli desktop sinovi; haqiqiy telefon/taxta tekshiruvining o‘rnini bosmaydi. Eski4194–4214nusxalar saqlangan.

## 2026-10-26 — tiniqlik tanlovi, hali eski saytda emas

Yangi kod original va tiniqlashtirilgan variantni haqiqiy ip natijasida solishtiradi; yuz/burun/ko‘z/lab yoki oq fon yomonlashsa eski variantni saqlaydi. Originalingizda doira/yurak ko‘rsatkichlari yaxshilandi; kvadrat o‘zgarmadi.100%moslik hali yo‘q.6avtomatik desktop/mobil testda3shakl10.3–13.0soniyada yaratildi.4201va undan oldingi nusxalar o‘zgartirilmagan; yangi havola qolgan regressiyalardan keyin beriladi. Hozir sizdan test javobi kutilmaydi.

## 2026-10-26 — original surat bo‘yicha sifat tekshiruvi davom etmoqda

4201nusxasi o‘zgartirilmagan. Keyingi sinov nusxasida **Yuzga yaqinlashtirish** ixtiyoriy tugmasi bor: surat butunligicha ochiladi, tugmani bossangiz kattalashadi; **Qaytarish** asl joylashuvga qaytaradi, qo‘lda surish/burish saqlanadi. Bu tugmaning o‘zi burun masalasini hal qildi deyilmaydi. Desktop/mobil4til/3shakl/Reset/burish/aynan qayta yaratish avtomatik o‘tdi; hozir sizdan qo‘lda sinov kutilmaydi.

Original surat faqat mahalliy `output/quality-original-20261026`da. Ip natijasini tiniqlashtirish tanlovi hali ulanmoqda: yaxshiroq bo‘lmagan variant asosiy natijani almashtirmaydi.100%fotografik tenglik va’da qilinmaydi; yangi havola faqat haqiqiy tekshiruvdan keyin yoziladi.

## 2026-10-26 — yangi sayt, parolsiz quti kodi

**http://127.0.0.1:4201/** ni oching. Kit kodlari `output/phase15/manual-testing.txt`da; bu faylni boshqalarga yubormang.

1. Galereyadan surat → Doira/Kvadrat/Yurak → o‘zingiz suring/kattalashtiring/buring → Yaratish. Tayyor ipli rasm bepul ko‘rinadi.
2. Kod kiritilmaguncha ip yo‘li, qadamlar va ketma-ket video/GIF ochilmasin.
3. Yig‘ishni boshlash → bitta kit kodi. Parol/email kiritish shart emas. Birinchi yangi yo‘riqnoma uchun3huquqdan2qolsin.
4. Bir necha qadamni tasdiqlang → Dam olish → sahifani qayta oching. Qolgan joy saqlansin, ayni ishni ochish yana kredit olmasin.
5. Shu kod bilan yana2ta yangi yo‘riqnoma ochish mumkin; undan keyin yangi rasmni ko‘rish bepul, yangi ip yo‘li yopiq.

Bu asosiy tartib GitHub’da desktop/mobil avtomatik sinovdan o‘tdi; sizdan hozir qo‘lda test javobi kutilmaydi. Eski4214va undan oldingi sahifalar saqlangan. Haqiqiy pul/xabar/jo‘natma yo‘q; Telegram va raqam keyingi bosqich.

## 2026-10-24 — GitHub’dan yangi nusxani sinash

Hozir shu kompyuterda ochilgan yangi sayt: **http://127.0.0.1:4213/**. Kit kodi va Admin tokeni `output/phase15/testable-web/manual-testing.txt`da. 92fayl test qilingan build bilan aynan teng; real pul/xabar o‘chiq. Eski4212sayti ham saqlangan.

`feat/full-roadmap` branchini ZIP qilib yuklang. README_UZ.md dagi Node24 → npm ci → alohida build → start-testable-web ketma-ketligini bajaring. Yangi test manzili terminalda, kit kodi/Admin tokeni faqat `output/phase15/testable-web/manual-testing.txt`da. Surat tanlash → shakl → fonni qirqish/erkin surish/kattalashtirish/burish → Yaratish → test kit kodi → Yig‘ish → Dam olish → qayta ochib ayni qadamni tekshiring. Eski4212bazasi bu yangi sinovga avtomatik ko‘chirilmaydi.

Avtomatik:599unit,4hisob o‘chirish UI,10asosiy desktop/mobile holat va avvalgi2API o‘tdi. Yaratish3.609–4.150s, natija haqiqiy ip ketma-ketligiga aynan teng. Bu barcha roadmap/tiniqlik yoki yangi APK tayyor degani emas. GitHub nusxasi sinash uchun, sizning keyingi ko‘rsatmalaringizga tayyor.

Hisobni o‘chirishni faqat keraksiz test hisobda sinang: Hisob → Hisobni o‘chirish → nimalar o‘chishini tekshirish → o‘z paroli/kit kodi → tasdiq. Barcha kirishlar yopiladi; tugallanmagan buyurtma/to‘lov istisnosi oldindan ko‘rsatiladi. Qurilma xotirasi tozalanmasa qayta urinish tugmasi sahifa qayta ochilganda ham qoladi. Qurilmaga tegishli mahalliy surat/loyihalar alohida o‘chiriladi.

## 2026-10-23 — Webdan ilova rejimiga, to‘langan yo‘riqnoma

4avtomatik sinov o‘tdi: webda1kredit bilan ochilgan yo‘riqnomani ayni email/parol orqali yangi ilova rejimida tiklash, qurilmaga ruxsatni qayta olish,17-qadamda dam olishni davom ettirish. Qolgan2kredit o‘zgarmadi, bajarilgan4-qadam alohida qoldi. Xotira to‘lsa xato chiqdi, joy bo‘shagach qayta tiklandi. Haqiqiy APK chiqqach shu ketma-ketlikni telefonda tekshirish kerak; hozir sizdan kutmaymiz. Screenshotlar test-results/c21b-native/*-paid-restored.png. Asl suratning server zaxirasi hali ulanmagan.

## 2026-10-23 — Ikki brauzerda ayni hisob, qolgan joyni tiklash

Avtomatik tekshirildi:32unit,8ta brauzer holati va2API testi. Yangi kodda Menu → Hisob → Loyihalar sinxroni → yo‘riqnomani hisobga yuklash → Serverdan yangilash → Shu qurilmadagini saqlash. Ikkinchi brauzerda ayni email/parol → Loyihalar sinxroni → Serverdan yangilash → Serverdagi nusxani tiklash. Sinovda aynan17-qadamda to‘xtab turdi, bajarilgan qadam4bo‘lib qoldi, papka/belgi ham keldi. Aloqa yo‘q bo‘lsa Qayta yuborish; eski nusxa to‘qnashsa o‘zi ustidan yozmaydi. Bu tugmalar yangi kodda; eski4212sinov sahifasi ataylab o‘zgartirilmagan. Qo‘lda sinashingizni kutmaymiz. Telefon ilovasi, to‘langan yo‘riqnoma huquqini qayta olish va asl surat zaxirasi keyingi sinov.

## 2026-10-23 — Qurilmalar orasida davom ettirish (server sinovi)

Hozir qo‘lda sinashingiz shart emas.19unit+2haqiqiy API testi: bitta login bilan ikki kirish, tasdiqlangan4-qadamdan alohida17-qadamda dam olish, papka/belgilar, eski nusxani rad qilish va saqlash xatosidan qaytish o‘tdi.4212o‘zgarmagan. Keyingi interfeys tayyor bo‘lgach: webda hisobga kiring → loyihani/qolgan joyni saqlang → boshqa brauzer yoki yangi ilovada ayni hisob bilan kiring → tiklang → ayni17-qadamda to‘xtab turishi, tasdiqlangan qadam4bo‘lib qolishi kerak. Hozir bu yangi tugmalar hali ulanmagan.

## 2026-10-21 — C19 ovozli buyruqlar asosi (hali interfeysga ulanmagan)

40ta avtomatik test, TypeScript/build va oflayn Android kompilyatsiyasi o‘tdi. Haqiqiy mikrofon yoki ovoz yozuvi ishlatilmadi. Qurilmadagi tayyor modelga mo‘ljallangan “keyingi/oldingi/takrorla/pauza/davom et” buyruqlari bor; “tasdiqla” bajarilmaydi. Ixtiyoriy Expert interfeysi va ruxsat/shovqin/bekor qilish sinovlari keyingi qadam. Hozir bu tugmani4210sahifasida izlamang; sinashingizni kutib kod ishlari to‘xtamaydi.

## 2026-10-21 — C18 fon ovozi kodi tayyor (telefon sinovini kutmaymiz)

23ta unit,3ta Java testi, desktop/mobil6ta yangi oqim va4ta eski regressiya o‘tdi. Android kodi oflayn kompilyatsiya qilindi; bu haqiqiy telefonda sinov o‘tkazildi degani emas. Yakuniy Phase15 APK chiqqanda [ASSEMBLY_AUDIO_UZ.md](../docs/ASSEMBLY_AUDIO_UZ.md) bo‘yicha:

1. Kit bilan yo‘riqnomani oching → **Yig‘ish** → **Ovozli qo‘llanma** va kerakli til/ovozni tanlang.
2. **Ekran qulflanganda ham ovozni davom ettirish**ni yoqing → **Ijro**. Qulf ekranida sektorlar va Play/Pause/oldingi/keyingi/yopish boshqaruvi chiqsin.
3. Qadamni ovoz yoki oldingi/keyingi bilan almashtirish bajarilgan progressni oshirmasin; faqat **Qadamni tasdiqlash** oshirsin.
4. Internetni o‘chirib, qulflash/ochish, quloqchinni uzish va qo‘ng‘iroqdan keyin davom ettirishni keyin telefonda tekshiring. Pauzadan o‘zi davom etmasin. Ikki daqiqalik pauzada boshqaruv yopilishi mumkin.
5. Ilovani qayta ochganda aynan o‘sha yo‘riqnomaning eng yangi aytilgan qadami tiklansin, ovoz/fon rejimi o‘chiq qolsin. Til/ovoz/tezlik/loyiha almashtirilsa yana o‘zingiz yoqing.

Hozirgi4210rasm sahifasi muzlatilgan oldingi build; unda yangi native tugmani izlamang. Hisobot `output/phase15/assembly-audio/report.html` — avtomatik native ko‘prik taqlidi ochiq ko‘rsatilgan. Qolgan kod ishlari davom etadi.

## 2026-10-21 — Fondagi ovoz asosi (hozir qo‘lda sinash shart emas)

Androidning oflayn ovoz xizmati va qulf ekranidagi boshqaruv asosi avtomatik sinaldi:18ta JS va3ta Java testi o‘tdi, Android kodi oflayn kompilyatsiyadan o‘tdi. Tugma va foydalanuvchi oqimiga ulanishi hali davom etmoqda; eski4200 yoki rasmlar uchun4210sahifasida bu yangi tugmani izlamang. Ovozning o‘zi qadamni bajarildi deb belgilamaydi. Tayyor bo‘lgach yangi APK va aniq o‘zbekcha sinov qadamlari beriladi. Telefon/o‘zingizning ovoz yozuvingizni kutib ish to‘xtamaydi.

## 2026-10-21 — Bitta namunaviy rasm bilan hozir sinash

1. **http://127.0.0.1:4210/photo-test/** ni oching. Asl namuna, tayyorlangan surat va ipli natijani yonma-yon ko‘ring; uchala shaklning kompyuter/telefon ko‘rinishi bor.
2. **“1. Rasmni saqlash”**ni bosing. **“2. Ilovani ochish”** → **“Galereyadan tanlash”** orqali yuklangan `namuna-portret.jpg`ni tanlang. O‘z suratingizni ham tanlashingiz mumkin.
3. **Doira / Kvadrat / Yurak**dan tanlang. Suratni suring, kattalashtiring; **“Burish”**, **“Qaytarish”**, **“Oldin / Keyin”**ni sinang. Yelka odatda ko‘rinmaydi.
4. **“Yaratish”**ni bosing. 3000ipli natija chiqsin; namuna avtomatik sinovda taxminan3.3–4.5soniyada hisoblandi. **“Qayta moslash”**ga qaytganda joylashuv saqlansin.
5. Yig‘ishni yoki PDFni sinamoqchi bo‘lsangiz, **“Yig‘ishni boshlash”** / **“PDF yuklab olish”**ni bosing. Uchta yig‘ish uchun ishlatilmagan sinov kodi `output/phase15/photo-trial/manual-testing.txt`da. Bu kodni boshqa odamga yubormang.

Eski4194–4200sahifalari saqlandi. Yangi sahifa alohida sinov; Phase15ning qolgan kodi va yakuniy APK hali davom etadi. Namuna sun’iy yaratilgan; shaxsiy suratingiz ishlatilmagan. Hozir qo‘lda sinashingizni kutib ish to‘xtamaydi.

## 2026-10-19 — Phase15 promo/referral asosi (hozir sinash shart emas)

Server hisobi avtomatik sinaldi: chegirma faqat mahsulotga qo‘llanadi, dostavkaga emas; bir buyurtmani qaytarish ikkinchi to‘lov yoki kredit yaratmaydi. Referral o‘z hisobida va avval to‘lagan xaridorda ishlamaydi; haqiqiy to‘lovdan keyin hisoblanadi, qaytarilganda bekor bo‘ladi. Hozir interfeys ulanishi davom etmoqda; eski4200sahifasida bu funksiyani izlamang. Avtomatik mukofot/pul berilmaydi. Admin xarajatlarni kiritmaguncha foyda o‘ylab topilmaydi. Yakuniy Phase15manzili va ekran yo‘riqnomasi keyingi checkpointda qo‘shiladi.

## 2026-10-18 — Phase15 bildirishnomalar (egasi hozir sinashi shart emas)

Mozaika ham avtomatik sinaldi: yangi Phase15 da Menyu → Mutaxassis rejimi → Mozaika, haqiqiy rang/dona/zaxira va taglik o‘lchamlarini kiriting. “Tagliklar rejasi” har qadamning tagligi va mahalliy koordinatasini ko‘rsatadi. Saqlab, oflayn qayta ochish hamda JSON/PDF/SVG ishlaydi. PDF chizmasi masshtabli emas; SVGdagi 50 mm belgini 100% bosmada tekshirish egasiga qoladi. Batafsil: [MOSAIC_UZ.md](../docs/MOSAIC_UZ.md). Hozir qo‘lda sinashni kutmaymiz.

Avtomatik tekshiruv faqat soxta FCM bilan bajariladi; haqiqiy xabar yuborilmaydi. Yakuniy Phase15 manzili keyin `output/phase15/manual-testing.txt` da bo‘ladi;4194–4200 eski sahifalarini bu sinov uchun ishlatmang.

Firebase ulash kerak bo‘lganda [PUSH_NOTIFICATIONS_UZ.md](../docs/PUSH_NOTIFICATIONS_UZ.md) ga amal qiling. Hisob → Bildirishnomalar → “Shu qurilmada yoqish”; tizim ruxsatini bering. Reklama roziligini alohida tanlang. Admin → E’lonlar → e’lonni chop eting → “Bildirishnoma yuborish”. Sozlanmagan serverda tugma o‘chiq va ilova ichidagi e’lonlar ishlashi kerak. Soxta muhit haqiqiy yetkazildi deb ko‘rsatmaydi. O‘chirish yoki hisobdan chiqish tokenni bekor qiladi; keyingi kirishda qayta rozilik talab qilinadi. Android/iPhone haqiqiy yetkazilishi Firebase/APNs va egasining telefoni ulanishidan keyin tekshiriladi.

## 2026-10-16 — Phase10, yangi reference usuli

Yangi sinov manzili: **http://127.0.0.1:4196/**. Uchta yig‘ishga mo‘ljallangan kit kodi `output/phase10/manual-testing.txt` faylida. Eski4195 sahifasi oldingi talqin; yangi usulni4196da sinang.

1. “Standart kit”da Circle46, Square yoki Heart tanlang. “Galereyadan yuklash” orqali o‘z JPG suratingizni tanlang. Yuklangan surat darhol ko‘rinsin; oq fonli, qora-oq tayyor nishon avtomatik paydo bo‘lsin.
2. Har bir yuz, soch va kesishni tekshiring. Yuz topilmasa, yuz chegaralari bo‘limini ochib haqiqiy yuzni qo‘lda belgilang. Heart uchun ko‘pi bilan ikki kishi. Nishon suratning o‘zi; ip natijasi alohida chiqadi.
3. “Har bir yuz, oq fon va kesishni tekshirdim”ni belgilang, hisoblashni bosing. Standart hisob500px/240mix/2500ulanish; natija1000px bo‘lsin. Hisoblash15soniyadan kam bo‘lishi tekshiriladi; fon/yuz tayyorlash vaqti alohida.
4. “Saqlash va yig‘ish”ni bosing, lokal sinov kodini kiriting va bitta yig‘ishni oching. Birinchi qadamdan boshlang. Player, ovoz, PDF va TXTda bir xil sektor belgisi chiqsin (masalan B-17); JSONda raqamli mix indekslari ham saqlansin.
5. Shu kitning andozasini100%/Actual size holatida chop eting. “Fit to page”ni o‘chiring.50mm nazorat belgisini chizg‘ich bilan tekshiring; keyin teshiklarni belgilang/parmalang, mos sektor stikerlarini mix yoniga yopishtiring. To‘g‘ri naqshni tanlaganingizni tekshirib, birinchi qadamdan ipni torting.
6. Bekor qilish tugmasini ham sinang. Eski yo‘riqnomangizni ochib avvalgi qadam saqlanganini tekshiring. Yangi surat tanlanganda yana classic-greedy/2 va2500ulanish tanlansin; oldingi usullar “Tafsilotlar” ichida.

Natijani, vaqtni va yuz o‘xshashligini yozib qo‘ying. Yangi APK: `output/mobile/ip-rasm-phase10-20261016-a3f7b2d756f7-debug.apk`. Hisobot: `output/phase10/report.html`.248unit va36ta oxirgi brauzer holati o‘tdi;12ta haqiqiy JPG sinovida eng sekin hisob9,45soniya.12PDFning rasmlari va2500qadami ham bir xil. APK imzosi/43fayli/76eski APK saqlanishi tekshirildi. Telefon/taxtada hali sinov qilinmadi; APKdagi ishlab chiqarish serveri hali sozlanmagan.4194/4195 va asl ma’lumotlar saqlandi, push qilinmadi.

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

## 2026-10-14 — umumiy hisoblash yadrosi

1–3 odam, hayvon va buyum uchun yangi tajriba yadrosi tayyor; qo‘lda tanlash oynasi keyingi qadamda qo‘shiladi. Hozir asosiy tugmalar o‘zgarmadi. Keyin sifatni baholash uchun 2/3 odam tushgan, hayvon va buyumning aniq suratlari kerak bo‘ladi; sintetik sinovlar faqat ishlash mexanikasini tekshiradi. Agent bunga kutmasdan interfeys va keyingi bosqichlarni davom ettiradi.

## 2026-10-14 — 3-bosqich qo‘lda belgilash oynasi

`npm run local` → http://127.0.0.1:4194. Surat yuklang, turini “Hayvon” yoki “Buyum” tanlang. “Obyekt qismlari” ichida “Tajriba obyekt usulini ishlatish” ni yoqing. Suratning batafsil sozlamalarida obyekt va qismlar oynasini oching. Chegarani suring, tutqichdan kattalashtiring yoki foizlarini kiriting. “Qism qo‘shish” orqali ko‘z/tumshuq kabi haqiqiy joyni belgilang; har bir obyektni alohida tekshirganingizni belgilang. Ko‘pi bilan uchta obyekt bor.

Belgi o‘zgarsa tasdiq o‘chishi kerak. Kesish, fon, shakl yoki aniqlik o‘zgarsa yangi holat qayta tekshiriladi; eski suratga qaytsangiz faqat uning belgilari qaytadi. 1/2/3 odam uchun ham yangi usulni alohida yoqish mumkin; 320 aniqlik yashirincha 192 ga tushmasligi kerak. Hisoblang, har bir obyektni oddiy va kattalashtirilgan ko‘rinishda tekshiring. Oldingi hisobdan davom ettirilsa eng yomon obyekt tekshiruvi natijasi ko‘rsatiladi; bu o‘xshashlik tasdig‘i emas. PDF/TXT/JSON va yig‘ish oynasi aynan bitta ketma-ketlikni saqlashi kerak.

Asosiy usul o‘zgarmagan. Haqiqiy 2/3 odam, hayvon va buyum suratlaridagi o‘xshashlik hamda taxtada yig‘ish hali egasi tomonidan tekshirilmagan. Natijani shu faylga yozing; agent boshqa bosqichlarda davom etadi.

## 2026-10-14 — matn uchun aniq yo‘l yadrosi

Lotin, kirill va arab matnining haqiqiy shakli va mix koordinatalari tayyor. Kontur yo‘li har bir yopiq harf qismi orasidagi ulovchi ipni ham hisoblaydi; bu ip ko‘rinishda yashirilmaydi. Interfeys keyingi qadamda ulanadi. Arab harflarining qo‘shilishi avtomatik tekshirildi; jismoniy taxtada o‘qilishi hali egasi tekshiruvi hisoblanadi. Agent kutmay davom etadi.

## 2026-10-14 — yozuv va andozalarni tekshirish

`npm run local` → http://127.0.0.1:4194 → “Yana” → “Mozaika” → “Ip bilan yozuv”. `SALOM`, `МИР`, `سلام` ni alohida kiriting. “Harf konturida mixlar” yoki “To‘ldirilgan matn nishoni” tanlang. Batafsilda taxta o‘lchami va mix sonini belgilang, matnni tayyorlang, harflarni tekshiring va tasdiqlang. Bir qatorda arab va lotin/kirillni aralashtirish hozir qo‘llanmaydi. Mayda nuqtalar sig‘masa taxtani kattalashtiring yoki mixni kamaytiring.

Hisoblangan haqiqiy ip ko‘rinishini tayyor nishondan alohida solishtiring. Konturdagi ulovchi iplar ham yig‘iladi; bir martalik ingichka kontur xira ko‘rinishi mumkin. “Saqlash va yig‘ish” orqali qadamlar 0 dan boshlansin. PDF/TXT/JSON oling. PDFni 100% hajmda chiqaring, 50 mm chizg‘ichni o‘lchang va mix nuqtalarini taxtada tekshiring. Internetni o‘chirib saqlangan loyihani va yangi arab yozuvini tayyorlashni tekshiring. Oddiy/kattalashtirilgan o‘qilishi va haqiqiy taxtadagi natijani shu faylga yozing; avtomatik sinovlar buni tasdiqlamaydi.

“Hayvon andozasi” / “Buyum andozasi” Yaratish oynasida yangi umumiy usulni alohida yoqadi. Surat va barcha haqiqiy qismlar yana tekshiriladi. Ism+portret aralashmasi hali qo‘shilmagan; agent keyingi bosqichlarda davom etadi.

## 2026-10-14 — kit server yadrosi

Yangi kit kodi bitta hisobga bog‘lanadi, odatda to‘rtta natijani ochadi va muddatsiz. Qayta bosish bir natija uchun yana kredit sarflamaydi. Ochilgan natija muddatsiz qoladi; ixtiyoriy muddat faqat ishlatilmagan kreditga taalluqli. Hozir server sinovlari tugadi; qulf, kod oynasi va chop etiladigan QR keyingi qadamda ulanadi. Egasi hozir hech narsa yuborishi shart emas; agent davom etadi.

## 2026-10-14 — kit qulfini va QR ni tekshirish

Yangi versiyada `npm run local` orqali yangi natija hisoblang va saqlang. Oldindan ko‘rish, PNG, ip uzunligi va vaqt bepul; qadamlar/PDF/TXT/JSON kit krediti ochilguncha ko‘rinmasin. Avvalgi saqlangan/import qilingan eski qo‘llanmalar va qadamlari saqlanadi.

Hisob → Boshqaruvda kodlar huquqi bilan “Kit kodlari to‘plami” ni oching. Odatda 4 yig‘ish, muddatlar 0 bo‘lsin. Ixtiyoriy chegara va muddatni saqlang, to‘plam yarating, QR varaqalar va maxfiy CSV ni oling. Kodlar bir marta ko‘rsatiladi; haqiqiy kodlarni hech kimga yubormang. QR ni 100% chop etib telefon bilan o‘qing: matndagi aynan shu kod chiqishi kerak. Telefonda skaner/haqiqiy chop sifati hali avtomatik tasdiqlanmagan.

Qulf oynasida kit kodi bilan kiring, “1 kredit sarflab ochish” ni bosing. Faqat bir kredit kamaysin. Sahifani yangilang va internetni o‘chiring: shu qurilmada ochilgan qo‘llanma, qadamlar va eksportlar ishlasin. O‘sha hisobda o‘sha natijani boshqa qurilmada ochish qayta kredit olmasin. Yangi boshqa ketma-ketlik yangi kredit sarflaydi. Eski hisobga kit qo‘shishda boshqa hisobga bog‘langan kod rad etilsin. Serverga saqlash ochilgan yangi natija uchun qo‘shimcha kredit olmasin.

Qurilma ma’lumotini o‘chirsangiz kesh ruxsati yo‘qoladi; asl kit/hisob bilan o‘sha natijani qayta ochish uchun server kerak, qayta kredit olinmaydi. Server imzo kaliti o‘zgarsa eski qurilma ma’lumotlarini o‘chirmang. Jonli do‘kon/to‘lov yoki telefonga APK o‘rnatish bu sinovga kirmaydi; agent qolgan bosqichlarda davom etadi.

## 2026-10-14 — QBRIX uchun kutilayotgan fayllar

`docs/QBRIX_COMPARE_HOWTO_UZ.md` bo‘yicha aynan bitta asl surat, QBRIX oldindan ko‘rinishi, ruxsat etilgan qo‘llanma va taxta/mix/kesish sozlamalarini `comparison/qbrix/` ga qo‘ying. Kit kodi/parol kerak emas. Hozir fayllar yo‘qligi sabab haqiqiy taqqoslash bajarilmadi. Agent kutmasdan dizayn, ovoz va APK bosqichiga o‘tadi.

## 2026-10-14 — ekranlar va mobil qulaylik

Yaratish → surat → hisoblash → kit bilan ochish → Yig‘ish → Loyihalarim → Yana bo‘ylab yuring. Avvalgi loyiha qadami, kesish va davom ettirish saqlansin. Batafsil sozlamalar yig‘ilgan bo‘lsin. Telefon kengligida yangi qulf ko‘rinishi yon tomonga chiqmasin, tugmalar oson bosilsin. Klaviaturada Tab/Enter va qaytish, internetsiz saqlangan qo‘llanma hamda xato bo‘lsa tuzatish oynasini tekshiring. Agent ovoz va APK bosqichlarini davom ettiradi.

## 2026-10-14 — haqiqiy ovozlar kutilmoqda

Hozir yozib olingan instruktor ovozi yo‘q; ilova buni aytishi va mavjud qurilma ovozi yoki matnni ishlatishi kerak. `docs/VOICE_RECORDING_UZ.md` va aniq `docs/VOICE_RECORDING_LIST.csv` bo‘yicha ikki alohida instruktorning rozilik berilgan WAV yozuvlari kerak. Har birida UZ97/RU101/EN97, jami ikkala instruktor uchun590 fayl. Sinovdagi qisqa tovushlar nutq emas va ilovaga qo‘shilmagan.

Yozuvlar kelgach ro‘yxatdagi papkalarga qo‘yib indeks/build ko‘rsatmasini bajaring. Har ikki ovozda sonlar,0-mix,235-qadam va20000 kabi sonlarni tinglang. Keyingi qadam, til, pauza va fon holatida oldingi gap to‘xtasin; internet o‘chiq holatda ham tekshiring. Hozir agent yozuvlarni kutmay APK va yakuniy sinovlarni davom ettiradi.

## 2026-10-15 — matn sozlamasidagi aniqlik

“Yana” → “Mozaika” → “Ip bilan yozuv” oynasida “Harf konturida mixlar” tanlang. Bu rejimda ip ulanishlari soni harf konturlari va ularning orasidagi haqiqiy ulanishlardan keladi, shuning uchun ta’sir qilmaydigan “iplar soni” sozlamasi yashirildi. “To‘ldirilgan matn nishoni” rejimida iplar chegarasi qoladi. Kontur PDF/TXT/JSON dagi barcha haqiqiy ulanishlar va mix koordinatalari saqlanishi kerak.

## 2026-10-15 — APK tayyor, jismoniy va telefon sinovlari hali kutiladi

Yangi debug APK: `output/mobile/ip-rasm-full-roadmap-20261014-87d130777145-debug.apk`. Nomdagi sana arxiv turkumi boshlangan14-oktabr; yangi ilova15-oktabrda yig‘ildi. Avvalgi67 APK saqlangan, imzo bir xil, barcha40 veb fayl mos. Telefonga o‘rnatilmadi va unda sinov bajarilmadi. Android test APK ham arxivlangan, qurilmada ishga tushirilmagan.

Brauzerda loyiha papkasidan `npm run local` → http://127.0.0.1:4194. Mavjud serverni to‘xtatmang. Avval saqlangan loyihani ochib qadami saqlanganini, yangi surat → bepul oldindan ko‘rish → kit bilan bir marta ochish → offline qadam/PDF/TXT/JSON ni tekshiring. Matnning ikki rejimini lotin/kirill/arabda, hayvon/buyum andozalarini va mobil tugmalarni tekshiring. PDFni100% hajmda chop etib50mm belgini o‘lchang; mixlar va QRni haqiqiy taxtada/telefon bilan tekshirish alohida qoladi. Natijalarni shu faylga yozing.

APKda yangi pullik kitni ochish uchun ishlab chiqarish HTTPS serveri va ishonchli imzo sozlamasi hali ulanmagan. Mahalliy brauzer kit jarayoni tekshirilgan; APK tayyorligi jonli savdo yoki telefon sinovi o‘tdi degani emas. Haqiqiy yozib olingan ovozlar0; qurilma ovozi/matn ishlatiladi. QBRIX fayllari,2/3 odam/hayvon/buyum suratlari va590 rozilikli ovoz yozuvi oldingi ko‘rsatmalar bo‘yicha kutilmoqda. Hisob/parol yoki maxfiy kit kodini yubormang.

## 2026-10-15 — sinash uchun ilova ochildi

http://127.0.0.1:4194/ brauzerda ochildi, hozirgi build ishlayapti. Eski bazangizga tegmaslik uchun bu ishga tushirishda alohida sinov bazasi ishlatildi: serverdagi hisob va kit kreditlari oldingi bazangizdan olinmagan. Yaratish → surat yuklashdan boshlang. Kod bilan ochish uchun keyin shu sinov bazasiga tegishli kit kodi kerak bo‘ladi. Avvalgi qurilmaga saqlangan loyihalarni ko‘rish uchun o‘sha eski brauzer profilidan foydalaning.

## 2026-10-15 — 8-bosqich standart kit

Yangi buildda Yaratish oynasi “Standart kit”dan boshlanadi; oldingi vositalarga alohida tugma bor. Surat yuklang: oq fon avtomatik tayyorlanadi, ishlamasa xato va asl surat ochiq qoladi. Haqiqiy yuzlarni tekshiring yoki chegarasini qo‘shing, yuzni to‘ldirib joylang va kesish/oq fonni tasdiqlang. Tayyor nishon va haqiqiy ip natijasi alohida. Saqlash odatdagi kit qulfini ochadi; qadam0 dan boshlanadi. Hozir ochiq4194 ilova eski buildda qoldirilgan; agent yangi buildni boshqa portlarda tekshiryapti.

Classic A/B umumiy xatoni kamaytirdi, ammo eski egasi nishonida burun hududini yomonlashtirdi; sifat g‘olibi tasdiqlanmagan. O‘lchangan tizza1500 ulanish,2000–3000 hali qabul qilingan tavsiya emas. Haqiqiy yangi kesish va ikki odamli yurak uchun egasi qabul sinovi kerak.

## 2026-10-15 — umumiy taxta va sektor andozalari

`output/phase9/templates/` da uchta PDF bor: to‘liq500×500mm varaq,6ta A4 teshik andozasi va18ta A4 sektor yorliq sahifasi. Printerda100%/Actual size tanlang, Fit/Scale o‘chsin. Avval50mm belgini chizg‘ich bilan o‘lchang; mos kelmasa teshmang. A4 sahifalarni koordinata krestlari va10mm ustma-ust joy orqali ulang. C=doira, S=kvadrat, H=yurak; tanlangan naqshni adashtirmang. Har birida240 mix, jami720 alohida teshik nuqtasi bor. Kvadrat470mm, doira460mm, yurakning chegaraviy maydoni390mm; bir taxtada to‘qnashuvsiz joylash uchun o‘lchamlar farq qiladi.

Haqiqiy mix/teshik diametrini o‘lchab admin sozlamasiga kiriting: hozir1.5mm teshik,3mm markaz oralig‘i va10mm chet masofasi taxmin. MDF mustahkamligi va teshish chuqurligi avtomatik tekshirilmagan. Oldin kichik sinov taxtasida tekshiring. Keyin nuqtalarni belgilang/teshing. Tanlangan naqshning sektor yorlig‘ini100% chop eting, egri kesish chiziqlari bo‘yicha kesib, har tickni aynan shu mix nuqtasiga tekislab yopishtiring; chizg‘ichni tekislab cho‘zmang. Andoza/profil versiyasi va hash mos bo‘lsin.

Yangi kitlar odatda3 natija beradi; admin4 ham tanlaydi. Avvalgi sarflanmagan kredit va ochilgan qo‘llanma o‘zgarmaydi. Agent hali sektor/player/ovoz va yakuniy hisobot/APK ishini davom ettiryapti; joriy4194 server yangilanmagan.

## 2026-10-15 — sektorlar, qizil ip va hisoblangan vaqt

Yangi ilovada mixlar A-1…D-60 ko‘rinadi; masalan B-17ning raqamli indeksi76 JSONda ham qoladi. Admin8×30 tanlasa A…H bo‘ladi. Player, qidiruv, ovoz, PDF va TXT shu belgini ishlatsin. B-17 ovozda “B, o‘n yetti” deyiladi. A–Z yozuvlari qo‘shilgani uchun ikki haqiqiy instruktorning to‘liq ro‘yxati endi746 fayl; hozir yozuv0, qurilma ovozi yoki matn ishlaydi.

Yurakda ixtiyoriy ikkinchi rangni hisoblashdan oldin tanlash mumkin. Qizil chegaraning hamma haqiqiy ulanishi, ichki ko‘prigi va tuguni sanaladi; ko‘rinish kosmetik chiziq emas. Ikkinchi ip ham ko‘rsatilgan diametr/shaffoflikka mos bo‘lsin. Haqiqiy natijani tekshiring. Ip soni/metr/soat qizil yo‘lni ham qo‘shsin; tizza tavsiyasi qora asos uchun. Saqlash → kit bilan bir marta ochish → birinchi qadamdan boshlash. Kalibrlash/teshik/yorliq sinovini oldingi bo‘limga ko‘ra bajaring.

A/Bda egasi suratining uch shaklida ham ayrim yuz hududi chegaradan o‘tmadi.2000–3000 ulanish sifat g‘olibi yoki eng samarali son deb tasdiqlanmagan; o‘lchangan tizza1500. Haqiqiy ikki odamli yurak taqqoslashiga ikki odamli asl surat kerak. Agent yakuniy sinov/APKni davom ettiradi,4194 avvalgidek qoladi.

## 2026-10-16 — chop etilgan kit versiyasini saqlash

Admin o‘lchamlarni o‘zgartirsa ham eski kit versiyasi serverda qoladi. Yaratish → “Kitda chop etilgan versiya”da qog‘oz/kitdagi r1/r2 raqamini tanlab ishlating. Bir marta olingan shu versiya offline ham keshlanadi. Topilmagan versiya boshqa taxta bilan yashirincha almashtirilmasin. Admin o‘zgartirgan, ammo saqlamagan sozlamadan PDF yuklash o‘chiq; avval saqlang, keyin shu versiya/hashli andozani chiqaring.

Yangi versiya uchun alohida `Start-Standard-Kit.cmd` tayyorlandi:4195, eski4194ga tegmaydi. Yakuniy sinovdan keyin agent ishga tushiradi. Alohida sinov kodi va admin kirishi `output/phase9/manual-testing.txt`da bo‘ladi; bu haqiqiy do‘kon/kredit bazangiz emas. Surat → kitdagi to‘g‘ri versiya/shakl → yuz/fon/kesishni tekshirish → hisoblash → bepul metr/soat → saqlash → sinov kodi bilan ochish → birinchi qadamdan boshlash. Qo‘lda sinov natijasini shu faylga yozing.

## 2026-10-16 — yorliqlarning yakuniy kesilishi

Faqat oxirgi qayta yaratilgan PDFlarni ishlating: kvadrat yorliqlari tashqariga, yurakning pastki yarmi tashqariga qaraydi; yuqori yarmi ichkarida. Sektorlar alohida kesiladi, ticklar avvalgi720 nuqtaga aynan mos. Qog'ozni joylashtirib50mmni qayta o'lchang; yorliqning qaysi tomonga qaraganidan qat'i nazar, doirachani aynan o'z mixiga tenglang. Boshqa naqsh yorlig'ini bir vaqtda yopishtirmang. Yakuniy sinov tugaguncha yangi4195 oynasi hali ishga tushirilmagan.

## 2026-10-16 — standart kit APK tayyor

Yangi APK: `output/mobile/ip-rasm-standard-kit-20261015-5f6c68918c50-debug.apk`.43 veb fayl/imzo tekshirildi,70 eski APK saqlangan. Telefonga agent o'rnatmadi; Android test paketi faqat yig'ildi. APKda jonli kit serveri hali sozlanmagan; to'liq kit-kredit sinovini keyin ochiladigan4195 brauzer oynasida bajaring.4194 o'z holida qoldi. Chop/qadam/ovoz va haqiqiy telefon sinovi egasi tomonidan alohida tekshiriladi.

## 2026-10-16 — yangi standart kit oynasi ochishga yuborildi

**http://127.0.0.1:4195/** hozir ishlaydi. Brauzerga ochish yuborildi;4194ga tegilmadi. Ishga tushgan serverni yana qayta ochmang. Bir mahalliy ishlatilmagan3-kreditli sinov kodi va admin kirishi `output/phase9/manual-testing.txt`da; kod/tokensni chatga yubormang. Bu alohida hisob/baza, eski4194 loyihalari u yerda qolgan.

1.500mm varaq yoki6 A4 andozani100%/Actual size chop eting. Fit o'chiq bo'lsin,50mmni o'lchang; keyin nuqtalarni belgilang/teshing. Tanlangan shaklning6 sektor sahifasini chop etib/kesib, ticklarni mixlarga tekislab yopishtiring. Avval sinov taxtasida haqiqiy mix/MDFni tekshiring.
2.Ilovada qog'ozdagi r1/shaklni tanlang. Surat/yuzlar/oq fon/kesishni tekshirib tasdiqlang(max2 Heart), hisoblang. Bepul metr/soatni ko'ring.2500 boshlang'ich limit sifat tavsiyasi qabul qilingan degani emas.
3.Saqlash → sinov kodi bilan kirish →1 kredit sarflab ochish → ko'rsatilgan birinchi mixdan boshlash. Tasdiqlamaguncha progress0. Qayta kirish/offline qadam saqlansin; bir natijani qayta ochish kredit olmaydi.
4.B-17 va uning76raqamli IDsi, PDF/TXT/JSON/ovozdagi mosligini ko'ring. Qizil tanlansa haqiqiy ikkinchi segment/jami vaqt/metrni tekshiring. Qurilma ovozi yoki matn ishlaydi;746 haqiqiy yozuv hali yo'q.

APK `output/mobile/ip-rasm-standard-kit-20261015-5f6c68918c50-debug.apk`; agent telefonga o'rnatmadi. Native kit uchun ishlab chiqarish serveri hali sozlanmagan, shu sabab to'liq kod-kredit sinovini4195da bajaring. O'xshashlik/QBRIX sifati o'tdi deb belgilanmagan: hozir burun/lab hududlari o'tmadi, tizza1500. Haqiqiy ikki kishilik asl surat va chop/yig'ish natijangiz keyingi qabul uchun kerak.

## 2026-10-16 — yuklangan suratning darhol ko'rinishi

Standart kitda surat yopiq yuz/fon bo'limlari ichida yashiringan edi. Tuzatishda galereyadan tanlash yoki kameradan olish bilanoq “Yuklangan surat” rasmi ko'rinadi; fon tayyorlanish holati ham ochiq. Rasmni ko'rish uchun yuz/qo'lda tuzatish bo'limini ochish kerak emas. Boshqa surat tanlasangiz yangi rasm chiqsin. Yuz va kesishni tasdiqlash → haqiqiy ip natijasi alohida qoladi.

Agent4195dagi tuzatishni tekshirib qo'ygach sahifani yangilang va suratni yana bir marta tanlang. Eski sahifadagi tanlangan surat faqat xotirada bo'lgani uchun yangilashda qayta tanlash kerak. Kit hisobi/kredit/server qayta yaratilmaydi,4194 o'z holida. Oldingi interfeys kerak bo'lsa “Maxsus / oldingi vositalar” tugmasi bor.

Tuzatish4195ga qo'yildi va yangi fayllar tekshirildi. Sahifani yangilang, suratni yana bir marta tanlang: “Yuklangan surat” yopiq bo'limlarsiz ko'rinsin; boshqa suratni tanlash ham ishlasin. Fon yuklanishi/xatosi rasm yonida ochiq ko'rinadi. Server, hisob va kreditlar qayta yaratilmagan.4194 o'z holida. APKning tuzatilgan nusxasi alohida yig'ilmoqda.

## 2026-10-16 — surat ko'rinishi tuzatilgan APK ham tayyor

`output/mobile/ip-rasm-photo-preview-20261016-f6cb7ddf0eea-debug.apk` — surat darhol ko'rinishini o'z ichiga olgan yangi APK.43 fayl/imzo/73 eski APK saqlangani tekshirildi, telefonga o'rnatilmadi. Native kit serveri hali sozlanmagan; to'liq kit sinovi4195da.

4195ni yangilang, rasmingizni yana tanlang: “Yuklangan surat” darhol ko'rinsin, yopiq yuz/fon bo'limlarini ochish shart bo'lmasin. Boshqa rasmga almashtirish va to'rt til tekshirilgan. Fon tayyorlash holati ochiq; yuz/kesishni tasdiqlash va haqiqiy ip natijasi alohida. Kit hisobi/kreditlar, server va4194 qayta yaratilmagan. Avvalgi ko'rinish uchun “Maxsus / oldingi vositalar” mavjud.


## Phase11 — kattaroq bosh joylashuvi tayyor
Yangi ilova: http://127.0.0.1:4197/ Kod: output/phase11/manual-testing.txt (3ta natija). Surat yuklang: tayyor nishonda bosh kattaroq, iyak osti oq bo‘lishi kerak. “Yelkani qoldirish”ni yoqib/o‘chirib solishtiring; har bir yuzni kattalashtirish va chap/o‘ng, yuqori/past surish mumkin. Heart juftligida yuzlar ikki yuqori bo‘lakda bo‘lsin. “Ip soni”2000/2500/3000: taxmin4.4/5.6/6.7soat. Har o‘zgarishdan keyin nishonni qayta tasdiqlang.

### Phase11 — egasi uchun tekshirish tartibi

1. `output/phase11/manual-testing.txt` dagi **yangi** manzilni oching. Shu fayldagi3-yig‘ish kodi yangi alohida sinov hisobi uchun. Eski4194/4195/4196 sahifalarini yangilash shart emas.
2. “Galereyadan yuklash” orqali yuz va soch to‘liq ko‘ringan portret tanlang. Yuklangan surat darhol ko‘rinsin. Oq fon tayyor bo‘lgach, tayyor nishonni tekshiring: Circle/Square’da bosh katta, markazdan sal yuqorida bo‘lsin. Asl suratdagi kesilgan soch qayta yaratilmaydi.
3. “Yelkani qoldirish” dastlab o‘chiq: belgilangan iyak osti silliq oqarsin. Uni yoqib/o‘chirib solishtiring. Har yuzning “Kattalashtirish”, “Chap / o‘ng”, “Yuqori / past” boshqaruvi bor. Iyak noto‘g‘ri aniqlansa asl suratdagi yuz chegarasini ham tuzating; tayyor nishon tasdiqlashdan oldin ko‘rinadi.
4. Heart’da ikki kishilik surat tanlang: har bosh bittadan yuqori bo‘lakda, iyaklar o‘rta chiziqqa yaqin bo‘lsin. Har yuzni alohida surish/kattalashtirish mumkin. Bitta odamda bosh yuqori2/3 qismini egallasin. Haqiqiy iplar shakl bo‘ylab tortilgani uchun nishondagi oq joyda ham ayrim uzun chiziqlar bo‘lishi mumkin.
5. “Ip soni”:2000≈4.4soat,2500≈5.6soat,3000≈6.7soat (har ulanishga8soniya taxmin). Dastlab2500. Yuz/fon/kesishni tasdiqlang, hisoblang. Ko‘rsatilgan natija haqiqiy0.12mm ip ketma-ketligi; tayyor surat ustiga chizilgan bezak emas.
6. Saqlash → yangi sinov kodi bilan kirish → bitta natijani ochish. Yo‘riqnoma ko‘rsatgan birinchi mixdan boshlang. Keyingi qadamni bosmaguncha progress0 bo‘lsin. Sektor belgisi, masalanB-17, player/PDF/TXT/JSON’da bir xil bo‘lsin. PDF muqovasi ilovadagi natijaga mos kelsin.
7. `output/phase11/report.html` da eski/yangi nishon va ip natijasini teng o‘lchamda solishtiring. APK ham alohida beriladi; agent telefonga o‘rnatmagan. Native kit serveri sozlanmaguncha to‘liq kod/kredit sinovini yangi brauzer manzilida bajaring. Chop qilishda oldingi50mm o‘lchov/andaza/mix-sektor tekshiruvi o‘z kuchida.


Phase11 APK: `output/mobile/ip-rasm-phase11-20261016-46bc061bd5c2-debug.apk`.35.99MB, imzo va43fayl tekshirildi;79oldingi APK o‘z holida. Telefonga agent o‘rnatmagan. To‘liq kod/kredit sinovi uchun yangi http://127.0.0.1:4197/ manzilidan foydalaning.


## Phase12 — sodda uch ekran

Yangi ilova: **http://127.0.0.1:4198/**. Uchta yig‘ish kodi: `output/phase12/manual-testing.txt`. Oldingi4194–4197 sahifalari o‘z holida qoladi.

1. Bosh ekranda faqat **Galereyadan tanlash**, **Rasmga olish**, **Doira / Kvadrat / Yurak** bo‘lsin. Doira dastlab tanlangan. Kit o‘lchamlari yoki murakkab sozlamalarni ochish shart emas.
2. Portret tanlang: **Moslash** o‘zi ochiladi. Surat darhol ko‘rinsin, keyin fon oqartirilsin. Sochdan iyakkacha bosh katta bo‘lsin. Yurakdagi ikki odam bittadan yuqori bo‘lakka joylashsin. Aniqlanmagan yuz uchun tiniqroq surat tanlang; ilova yuzni o‘zi to‘qimaydi.
3. Surat ustida barmoq/sichqoncha bilan suring. Ikki barmoq, g‘ildirak yoki pastdagi kattalashtirish bilan o‘lchamini o‘zgartiring. **Burish**90° aylantirsin, **Qaytarish** avtomatik joylashuvni qaytarsin. Yurak juftligida kerakli boshni bosib alohida suring.
4. **Oldin / Keyin** asl rangli surat va tayyor qora-oq nishonni shu joylashuvda ko‘rsatsin. **Yelkani ko‘rsatish** dastlab o‘chiq: iyak osti oq, eski katta qora uchburchaklar bo‘lmasin. Soch/iyak chegarasini tekshiring, kerak bo‘lsa joylashuvni moslang.
5. **Yaratish**ni bosing. Hech narsa moslamasangiz, galereya tugmasi + fayl tanlash + yaratish bilan natijaga yeting. Natijada katta ip rasmi va **3000 ip · ~6.7 soat** ko‘rinsin. Bu8soniya/ulanish taxmini; haqiqiy yig‘ish tezligi farq qiladi.2500/3000 solishtirishda3000 aniqroq topildi. Faqat kerak bo‘lsa kichik **Batafsil**da2000/2500/3000ni tanlash mumkin.
6. **Qayta moslash** oldingi surish/kattalashtirish/burishni saqlasin. O‘zgartirmay qayta yaratsangiz aynan o‘sha ip natijasi chiqsin. Tilni Menyuda UZ lotin / UZ kirill / RU / EN orasida almashtirib ko‘ring. Eski vositalar **Menyu → Mutaxassis rejimi**da.
7. **PDF yuklab olish** yoki **Yig‘ishni boshlash**ni bosing. Yangi mahalliy kit kodi bilan kiring, bitta natijani oching. PDF va player bir xil mix/sektor/qadamni ko‘rsatsin (masalanB-17), birinchi qadamdan boshlang. Bitta natijani qayta ochish yana kredit sarflamasin. Ruxsat olingach player shu qurilmada oflayn ishlasin.
8. Natijalarni `output/phase12/report.html`da teng o‘lchamda solishtiring; ekranlar `output/phase12/screens/`da. Egasi surati avvalgi lokal320px ishlov berilgan nusxa; haqiqiy telefon, yangi asl surat va taxtada o‘zingiz tekshiring. Chop etishda100%/Actual size va50mm belgini tekshirish, mix/sektor andozasi avvalgidek.3000ip uchun haqiqiy kerakli ip uzunligini PDFdan tekshiring; kit zaxirasi yetishini tasdiqlang.

APK: `output/mobile/ip-rasm-phase12-20261017-29f469aec06e-debug.apk`.261unit va38ta oxirgi brauzer holati o‘tdi;2PDFning1000px rasmi va barcha3000qadami tekshirildi.43fayl/imzo va82oldingi APK saqlangani tasdiqlandi. Kompyuterda10.08s, mobil brauzerda11.78s hisoblash qayd etildi. Telefonga agent o‘rnatmagan va haqiqiy telefonda hali sinamagan. Native ishlab chiqarish serveri hali sozlanmagan; to‘liq kod/kredit sinovini yangi brauzer manzilida bajaring. Eski4194–4197ga tegilmagan; endi4198ham alohida saqlanadi, push qilinmagan.

## Phase13 — tiniqroq portret

Yangi ilova: **http://127.0.0.1:4199/**. Uchta natija uchun kod `output/phase13/manual-testing.txt`da. Eski4194–4198 o‘z holida qoladi.

1. Yangi manzilda Doira/Kvadrat/Yurak tanlang, galereyadan portret yuklang. Uch ekranli yo‘l avvalgidek: surat → Moslash → Natija. Suratni surish, ikki barmoq/g‘ildirak/slider, Burish/Qaytarish, Oldin/Keyin va yelka tugmasi ishlasin.
2. Joylashuv ma’qul bo‘lsa **Yaratish**ni bosing. Yangi usul avtomatik ishlaydi; biror murakkab parametr kiritmang. Ko‘z, burun, lab va sochni avvalgi natija bilan teng o‘lchamda solishtiring. Bu haqiqiy0.12mm ip ketma-ketligi; tayyor surat ustiga bezak qo‘yilmaydi.
3. Kvadrat markazidagi oldingi tekis “+” yo‘qolsin. Egasi sinovida avval ikkita shunday ip bor edi, endi0. Mixlar va andoza siljimagan. Boshqa qiya iplar va to‘qima izi tabiiy qoladi.
4. Kichik **Batafsil**:2500≈5.6soat /3000≈6.7soat /3500≈7.8soat. Standart3000. Ayrim suratlarda3500 aniqroq, ammo bir soatcha qo‘shimcha yig‘ish talab qiladi; Yurak juftligi sinovida3000 yaxshiroq chiqdi. Har bir variant haqiqatan qayta hisoblansin.
5. **Qayta moslash** joylashuvni saqlasin; o‘zgartirmay qayta yaratsangiz bir xil natija chiqsin. **PDF yuklab olish** yoki **Yig‘ishni boshlash**da yangi kit kodi bilan bitta natijani oching, birinchi mix/qadamdan boshlang. Player/PDF/TXT/JSONdagi sektorlar (masalanB-17) mos bo‘lsin. Ruxsat olingach shu qurilmada player oflayn ishlasin.
6. `output/phase13/report.html`da bir xil tayyor nishon, v2 va v3 natijalarini ko‘ring. Egasi Kvadratida yuz ko‘rsatkichi0.512→0.574, Doirada0.545→0.612 bo‘ldi. Bular avvalgi320px ishlov berilgan lokal nusxa; yangi asl surat va haqiqiy telefon/taxtada o‘zingiz ham sinang. Hech qanday surat Gitga yoki tashqi saytga yuborilmagan.
7. Eski saqlangan yo‘riqnomani ham oching: oldingi usuli, natijasi va progressi saqlansin. Chop etishda100%/Actual size,50mm belgini tekshirish va mix/sektor andozasi avvalgidek. Kerakli ip uzunligi va zaxira yetishini PDFdan tekshiring.

APK: `output/mobile/ip-rasm-phase13-20261017-7b42969cd9ba-debug.apk`.268unit va41ta brauzer holati o‘tdi;11PDFning rasmlari va barcha3000qadami bir xil.43fayl/imzo/85eski APK saqlangani tekshirildi. Eng sekin sifat hisob9.22soniya; haqiqiy telefon emas, mobil brauzer emulyatsiyasi ham sinalgan. Kvadratdagi3000ip sinovi taxmin1546m ip talab qildi, vaqtinchalik1200m zaxira yetmaydi; haqiqiy kitdagi ip uzunligini tekshiring. Native kit serveri hali sozlanmagan; kod/kreditni yangi brauzerda sinang. Agent telefonga o‘rnatmagan. Eski4194–4198 va tmp/data saqlangan, push qilinmagan.

## Phase14 — avtomatik tekshiruvlar

Hozir qo‘lda sinash talab qilinmaydi. Menyu → Rasm turi orqali Odam/Hayvon/Avtomobil/Buyum/Yozuv tanlanadi. Lotin, kirill va arab yozuvi mahalliy shrift bilan ishlaydi. Foto moslashda eski suratlardagi joylashuv buzilmaydi. Yakuniy yangi manzil va qolgan ulash ishlari Phase14 tugaganda quyida yoziladi.

## Phase14 — yig‘ish rejimi avtomatik tekshirildi

Qo‘lda tekshirishingizni kutmayman. Qayta ochilganda oxirgi loyiha va qadam tiklanadi. Pastdagi katta tugma qadamni tasdiqlaydi; oldingi/keyingi tugmalar faqat ko‘rsatilayotgan qadamni almashtiradi. Foiz va qolgan vaqt tasdiqlangan ishlardan olinadi. Offline qayta ochish va davom etish desktop/mobile testlarda o‘tdi. Ilova ekranni yoqib turadi; qurilmada kerakli TTS ovozi bo‘lmasa matn ishlaydi. Yozib olingan ovozlar uchun docs/VOICE_RECORDING_UZ.md va docs/VOICE_RECORDING_LIST.csv ga amal qilinadi; haqiqiy yozuvlar hozircha qo‘shilmagan.

## Phase14 — to‘lov va Admin (avtomatik tekshirildi)

Egadan hozir qo‘lda test talab qilinmaydi. Yangi manzil yakuniy manual-testing.txt da bo‘ladi. Menyu → Hisob / Admin → Admin: bir sahifada kit kodlari, kredit sarfi, buyurtma, narx, dostavka va e’lonlar. Kit to‘plamini yaratib PDF / QR ni yuklash mumkin. Narx so‘mda kiritiladi. Shopdagi Click/Payme faqat sinov; haqiqiy pul olinmaydi. Kalitlarni ulash uchun docs/PAYMENTS_UZ.md ni o‘qing. Production Admin paroli qayta tasdiqdan so‘ng lokal HTTP va Docker HTTPSda sinaldi. Push manzili tasdig‘i hali kutilmoqda.

## Phase14 — VPS va APK ulash

Hozir egadan qo‘lda sinov talab qilinmaydi: Dockerning desktop/mobil HTTPS oqimi va bazani qayta ochish tekshirildi. Domen/VPSni docs/DEPLOY_VPS_UZ.md bilan, release kalitini docs/APK_SERVER_AND_SIGNING_UZ.md bilan ulang. Debug APKning lokal manzili http://127.0.0.1:4482/api; haqiqiy telefonda kompyuterga USB ulab `adb reverse tcp:4482 tcp:4482` kerak yoki Admin → Server manzili orqali o‘z HTTPS domeningizni kiriting. Agent telefonga o‘rnatmagan.


Phase14 APK tayyor: `output/mobile/ip-rasm-phase14-20261017-04f92e0d8c1d-debug.apk`.46fayl, imzo va88eski APK saqlangani tekshirildi; Android yangi ekran-yoqish qismi kompilyatsiya qilindi. Agent telefonga o‘rnatmagan.295unit va300ta oxirgi desktop/mobil holat o‘tdi; dastlabki16test xatosi tuzatilgan46ta qayta sinov bilan yopildi. Yangi sayt va uchta natija kodi yakuniy ko‘rsatmada beriladi; hozir qo‘lda test kutmaymiz.


## Phase14 yakuniy manzil — hozir qo‘lda test kutmaymiz

Yangi ilova **http://127.0.0.1:4200/**; uchta natija uchun ishlatilmagan kit kodi va lokal Admin kirishi `output/phase14/manual-testing.txt`da. Eski4194–4199ni to‘xtatmang. APK `output/mobile/ip-rasm-phase14-20261017-04f92e0d8c1d-debug.apk`;46fayl/imzo/88eski APK va barcha yangi funksiyalar tekshirildi.

Keyin vaqt bo‘lganda: shakl → galereya → suratni surish/kattalashtirish/Burish/Oldin-Keyin → Yaratish. Qayta moslash joylashuvni saqlaydi.3000ip≈6.7soat, boshqa variant Batafsilda. Yig‘ishni boshlash → yangi kit kodi → bitta natijani ochish → katta sektorlar bo‘yicha birinchi qadam. Tasdiq bajarilgan ishni saqlaydi, oldingi/keyingi faqat ko‘rsatadi. Internet o‘chganda qayta ochib davom etish avtomatik tekshirildi.

Admin → kit → PDF/QR, narx/stock/dostavka/e’lonlar bir sahifada. To‘lovlar sinov, haqiqiy pul olinmaydi. Chop etish100%/Actual size,50mm ni tekshirish, mix/sektor stikerlarini moslash va birinchi qadam uchun docs/PHYSICAL_BOARD_UZ.md. Hozir taxta/telefon sinovi bajarilgan deb da’vo qilinmaydi. Faqat egasi keyin ulaydigan besh narsa va aniq yo‘riqnomalar AGENT/FINAL_REPORT.mdda.


## Phase15 — ism/sana (avtomatik sinov, qo‘lda kutmaymiz)

Yakuniy yangi manzil Phase15 tugaganda beriladi;4200eski holida saqlanadi. Odam surati → Moslash → Ism/sana maydoniga qisqa matn. Yozuv nishonda va haqiqiy ip ketma-ketligida bo‘lsin; bo‘sh maydon avvalgi joylashuvni saqlaydi. Doira/lotin, Kvadrat/kirill, Yurak/arab desktop va mobilda kit orqali ochish/qayta yaratish/eksport bilan6/6o‘tdi. Batafsil docs/CAPTION_UZ.md; aralash yozuv/raqam tartibi C02da davom etadi. Agent qo‘lda sinov kutmaydi.


## Phase15 — aralash yozuv (avtomatik tekshirildi)

Ism/sana yoki Menyu → Rasm turi → Yozuvda `Ali سلام Мир 2026` kabi bitta qatorda aralash yozish mumkin. Arab harflari qo‘shiladi, raqamlar teskarilanmaydi; matnni o‘zingiz teskari yozmang. Mutaxassis rejimidagi kontur ham aralash matn bilan ishlaydi, mix oralig‘i sig‘masa kattaroq taxta/kamroq mix so‘raydi.23unit va16ta oxirgi desktop/mobil holat o‘tdi. Eski saqlangan matnli yo‘riqnomalar saqlanadi. Agent qo‘lda test kutmaydi.


## Phase15 — olmos materiali va yopiq bo‘yash chegaralari

Menyu → Mutaxassis rejimi → Menyu → donali hunarmandchilik. Olmos turida dumaloq/kvadrat, dona eni, taglik rangi va tajriba magnit+po‘lat variantini tanlash mumkin. Dona eni qadamdan katta bo‘lsa reja rad etiladi. Yaratish → saqlash → birinchi donani tasdiqlash → internetni uzib qayta ochish: material va jarayon saqlansin. SVG haqiqiy mm; PDFdagi kataklar tartib chizmasi.

Raqamli bo‘yashda hududni belgilaganda bo‘yalgan maydon foizi ham o‘zgarsin. Yopiq chegaralar SVG va JSONni yuklash mumkin; SVGdagi 50 mm chiziqni 100% chop etib keyin o‘lchang. Ichki bo‘shliqlar saqlanadi, raqam sig‘magan kichik hududning markazi JSONda bor. Batafsil docs/CRAFT_POLISH_UZ.md. Agent avtomatik tekshiradi, hozir egasining qo‘lda sinovini kutmaydi.


## Phase15 — QR lenta naqshi (avtomatik tekshirildi)

Menyu → Mutaxassis rejimi → Menyu → donali hunarmandchilik → QR ip naqshi. Qisqa matn/havola → yaratish. Old tasvir skanerlanadi; orqa ko‘rinish o‘tishlarni ko‘rsatadi. Qadamni tasdiqlab, oflayn qayta ochganda keyingi qadam saqlansin. JSON/CSV/SVG/PDF bir xil reja bo‘lsin. Bu oddiy 240 mixli kit uchun emas: alohida oq teshikli varaq va 1.4 mm yassi qora lenta kerak, dumaloq ip almashtirmaydi. Fizik teshik/lenta mosligi va tayyor buyumni telefon bilan skanerlash keyingi egasi sinovi. Andozada 50 mm belgini o‘lchang. Aniq yo‘l: docs/QR_CRAFT_UZ.md.6unit va4desktop/mobil holat o‘tdi; agent hozir qo‘lda sinovni kutmaydi.

## Phase15 — kitob buklash (avtomatik tekshirildi)

Mutaxassis rejimi → Menyu → donali hunarmandchilik → Kitob buklash. Yurak yoki ism/sana tanlang; haqiqiy varaq o‘lchami va sonini kiriting. Bitta varaqning ikki tomoni bor. Reja → kit kodi → 1 kredit bilan belgilarni ochish → shu varaqqacha tasdiqlash → internetsiz qayta ochish. PDF/SVGdagi50mmni100%chop etib o‘lchang; yuqori/pastki belgi varaq tepasidan, ikkinchi belgi tashqi chet bo‘ylab o‘lchanadi. Kesish kerak emas; burchak doim45°emas. Avval keraksiz qog‘ozda sinang. Aniq qadamlar docs/BOOK_FOLDING_UZ.md.9unit/4desktop-mobil tekshiruv o‘tdi; fizik sinovni kutmay keyingi kod ishlari davom etadi.

## Phase15 — ipdan video/GIF (avtomatik tekshirildi)

Natija → Batafsil → Ipdan video → Video yuklab olish yoki GIF yuklab olish. Shu oynani ochiq qoldiring; bekor qilish darhol to‘xtatsin. Yig‘ish oynasidagi Animatsiya orqali ham olinadi. Video ovozsiz, haqiqiy ip tartibidan; original surat qo‘shilmaydi. GIF kichikroq, ranglari soddalashtiriladi; video yo‘q qurilmada shu tugma ishlaydi. Internet uzilganda oldingi qo‘llanmaning GIFini ham olish mumkin. Aniq cheklovlar docs/SEQUENCE_VIDEO_UZ.md.9unit va4desktop/mobil test o‘tdi, haqiqiy fayllar mustaqil dekoderda ochildi; telefon kodek/ulashish sinovi keyin, agent uni kutmaydi.

## Phase15 — 3D geometriya oraliq holat

Ramka, qatlamli shakl va yozuvning STL geometriyasi5avtomatik testdan o‘tdi; fayllar mustaqil tekshirildi. Bo‘lim hali menyuga ulanmagan, PDF va yig‘ish oynasi keyingi ish. Hozir egasidan qo‘lda sinov kerak emas; agent davom etadi. Haqiqiy printer o‘lchami, material, ramka yelimi va tayoqcha mosligi keyin alohida tekshiriladi.

## Phase15 — 3D ramka, qatlamli haykal va yozuv (avtomatik tekshirildi)

Mutaxassis rejimi → Menyu → katakli ishlar → 3D shakllar. O‘lchamlarni kiriting, yarating, barmoq bilan aylantiring; slayder/qaytarish/bitta detal ko‘rinishi ishlasin. Kit kodi → 1 kredit aynan shu rejaning hamma detalini ochadi. STL bitta detal, PDF/SVG 100% va 50 mm belgili; yozuv/ramka uchun umumiy yig‘ish joylashuvi ham bor. Jarayonni tasdiqlab, oflayn qayta oching. Boshqa oynada o‘zgarsa rad etilsin, keyin Ochish eng yangi jarayonni olsin. Kitob/3D Qadamni aytish mahalliy UZ/RU/EN ovoziga mos; qadam yoki til almashganda eski ovoz to‘xtasin. Aniq qadamlar docs/SOLID_MODELS_UZ.md va BOOK_FOLDING_UZ.md.22unit/16so‘nggi desktop-mobil holat,176PDFsahifa va haqiqiySTLfayllar tekshirildi. Hozir egasining qo‘lda sinovi kutilmaydi; printer maydoni/material/rod/telefon keyingi shaxsiy tekshiruv.

## Phase15 — bepul ustaxona (keyinroq amaliy tekshiruv)

Kod sinovlari avtomatik bajarildi; hozir sizdan javob kerak emas. Yakuniy yangi preview tayyor bo‘lgach: Menyu → Mutaxassis rejimi → To‘rli ishlar → Bepul ustaxona. Uchala qo‘llanma kit kodisiz ochiladi. Kerakli materialni tayyorlang, Boshlash yoki davom etish tugmasini bosing. Qadamni bajarib Bajardim deb belgilang. Chizmani ko‘rish yoki avtomatik ko‘rsatish ishni bajarilgan deb belgilamasin. Ilovani qayta ochganda saqlangan joydan davom etsin. Qog‘oz/karton modelini barmoq bilan aylantiring. PDF oxiridagi andozani 100% chop etib 50 mm belgini o‘lchang; keyin qog‘oz/kartonda sinang. Ebru uchun mos tayyor material ko‘rsatmasiga amal qiling. O‘z foto/videongizni keyin qo‘shish tartibi: docs/FREE_WORKSHOPS_UZ.md. Haqiqiy kesish/buklash/bo‘yoq va telefon ovozi hali amalda tekshirilmagan.

## Phase15 — mijozlar galereyasi (keyinroq)

Avtomatik sinovlar alohida bazada, o‘zimiz chizgan rasm bilan bajarildi. Hozir haqiqiy fotosurat yuborishingiz kerak emas. Yakuniy yangi ilovada Menyu → Hisob va do‘kon → Mijozlar galereyasi. Kit kodi yoki ro‘yxatdan o‘tgan hisob bilan kiring, tayyor buyum rasmini tanlang, nom/taxallus/fikrni yozing va uchta rozilikni belgilang. Dastlab Tekshirilmoqda bo‘lsin; boshqaga ko‘rinmasin. Admin → Galereyani tekshirish orqali kattalashtirib ko‘ring va ruxsat bering; keyin ommaviy ro‘yxatda chiqsin. Mening yuborgan ishlarim ichidan o‘chiring: ommadan yo‘qolsin. Ilovaning dastlabki portretini bu yerga yubormang. To‘liq yo‘l, huquqlar, o‘chirish va saqlash muddatlari: docs/GALLERY_UZ.md. Eski4194–4200versiyalarda yangi galereya yo‘q; yakuniy yangi preview/APKni kutib tekshiriladi.

## 2026-10-20 — Phase15 chegirma va do‘st kodi tayyor

Hozir qo‘lda sinash shart emas:42unit,14brauzer va2HTTP holati avtomatik o‘tdi. Yakuniy Phase15manzilida Menyu → Hisob va do‘kon → Do‘kon: mahsulot qo‘shing, kod yozing, “Qo‘llash”ni bosing va chegirma/jami narxni ko‘ring. Savat o‘zgarsa qayta qo‘llash kerak. Javob yo‘qolsa avvalgi buyurtma ayni kalit bilan davom etadi.

Admin → “Chegirmalar va xarajatlar”da yangi kod/foiz/summa/muddat/limitni saqlang. Do‘st dasturi dastlab o‘chiq; yoqqach Hisob → “Do‘stni taklif qilish”dan kod oling. O‘z hisobingizda ishlamaydi, avtomatik mukofot yo‘q. Haqiqiy xarajatlar kiritilmaguncha qolgan summa o‘ylab topilmaydi. Aniq yo‘riqnoma: [OFFERS_UZ.md](../docs/OFFERS_UZ.md). Hisobot: `output/phase15/offers/report.html`. Eski4200sahifasi o‘zgarmagan; yangi manzil yakuniy qo‘llanmada beriladi.

## 2026-10-20 — Phase15 hamkor partiyasi asosi

B2B server sinovlari17unit va2HTTP holatida o‘tdi. Hamkor faqat o‘z partiyasini ko‘radi; egasi ruxsat bermaguncha kod chiqarilmaydi. Tasdiqlash haqiqiy mahsulot zaxirasini band qiladi, tarqatilgan kodni bekor qilish esa taxta qaytdi degani emas. Kit kodlari faqat bir hisobga bog‘lanadi. Hozir portal/claim/PDF ekranlari ulanishi davom etmoqda; qo‘lda sinashni kutmaymiz. Haqiqiy to‘lov yoki xabar yuborilmadi. Keyingi checkpointda aniq ekran yo‘riqnomasi beriladi.

## 2026-10-20 — Phase15 hamkor portali va QR tayyor

Hozir qo‘lda sinash shart emas.24unit,8brauzer va2HTTP holati o‘tdi; haqiqiy PDFdagi10QR mustaqil dekoderda aniq CSV havolasiga mos keldi. Hisobot: `output/phase15/partners/report.html`; haqiqiy kodlar rasmda yopilgan.

Yakuniy Phase15da Hisob → “Hamkor uchun”dan hisob raqamingizni oling. Egasi Admin → “Hamkorlar va partiyalar”da hisob/mahsulot/narx/miqdor/muddatni saqlaydi. Hamkor narx hisoblab partiyani yuboradi; egasi alohida ruxsat beradi; keyin hamkor PDF/QR va oluvchi havolalarini bir marta chiqarib saqlaydi. Havola kitni oluvchining bitta hisobiga biriktiradi. “Materialni yaratuvchiga qo‘llash” eski kitning aynan o‘z andozasini tanlaydi, keyin v3 va oflayn yig‘ish ishlaydi. Haqiqiy pul yoki xabar yuborilmadi. Aniq yo‘riqnoma: [PARTNERS_UZ.md](../docs/PARTNERS_UZ.md). Telefon/domen/bosilgan QR keyinchalik egasi ulaydigan ish; kutib qolmadik.

Desktopda ism/sana maydonidan keyin Yaratish tugmasi kesilib qolishi ham avtomatik topilib tuzatildi. Asl “to‘liq ko‘rinsin” testi saqlanib, desktop/mobil2/2o‘tdi; suratning500px hisobi va eski qo‘llanmalar o‘zgarmagan.

## 2026-10-20 — Phase15 katalog zaxirasi asosi

46unit va2HTTP sinovi o‘tdi. To‘plamdagi umumiy detal alohida sotilsa ham bir zaxiradan to‘g‘ri ayriladi; refund yoki bekor qilish avvalgi tarkibni faqat bir marta qaytaradi. Refill yangi yig‘ish krediti bermaydi, ichki ombor detali do‘konda alohida sotilmaydi. Hozir katalog, hudud, valyuta va dostavka ekranlari davom etmoqda — egasi qo‘lda sinashini kutmaymiz. Haqiqiy to‘lov yoki yetkazish yo‘q. Texnik dalil: [CATALOG_CHECKPOINT.md](../docs/CATALOG_CHECKPOINT.md).

### Phase15 C14b — hudud va valyuta serveri (UI hali keyingi bosqich)

Avtomatik tekshirildi: USD narxli to‘plam, mamlakatga mos dostavka, asl buyurtmani ayni so‘rov bilan qaytarish, eski dostavka narxini yangi buyurtmaga qo‘llashni rad etish. UZS/USD/RUB o‘z narxida saqlanadi; valyuta avtomatik aylantirilmaydi. Click/Payme faqat UZS uchun. Hozir qo‘lda sinash shart emas: keyingi checkpointda do‘kon/Admin boshqaruvlari va to‘plam kreditining haqiqiy amal muddati ko‘rinadi.

### Phase15 C14 — to‘plam, hudud, valyuta va kredit muddati tayyor

Hozir qo‘lda test qilish shart emas: desktop va mobil oqimlar avtomatik tekshirildi. Ko‘rmoqchi bo‘lsangiz, lokal hisobot: output/phase15/catalog/report.html. Yangi owner preview va APK yakuniy C26da beriladi; 4194–4200 eski ilovalari saqlangan.

Keyin sinash: Menu → Hisob / Admin → Admin → “To‘plam turlari va materiallar”. To‘plam yoki qo‘shimcha material yarating, material/narx/valyuta/tarkibini saqlang. “Mamlakatlar va dostavka”da faqat haqiqiy xizmat ko‘rsatiladigan joyni yoqing. Do‘konda mamlakatga mos mahsulot/narx ko‘rinadi. Valyuta aylantirilmaydi; Click/Payme faqat UZS uchun. Javob uzilib qolgan buyurtma qayta tekshirilganda asl narx/tarkib saqlanadi. Hisobdagi “Kit kreditining muddati” va chop etilgan kartochkada kredit muddati ko‘rinadi. To‘liq yo‘riqnoma: docs/CATALOG_UZ.md.

### Phase15 C15a — ilova krediti va sovg‘a xaridi serveri

Avtomatik sinov o‘tdi: ilova krediti va sovg‘a faqat tasdiqlangan sinov to‘lovidan keyin yaratiladi. Sovg‘ani bitta hisob oladi; qayta urinishda ikki marta kredit berilmaydi. Sovg‘ani olish muddati to‘lovdan keyin 30 kun; oluvchiga berilgan oddiy kredit muddatsiz. Olinmagan sovg‘aning qaytarilishi va xatoda butun tranzaksiyaning bekor bo‘lishi tekshirildi. Hozir qo‘lda test qilish shart emas: boshqaruv/xarid ekranlari va tayyor asar buyurtmasi keyingi C15 bosqichlarida ulanadi. Haqiqiy to‘lov yoki xabar yuborilmadi.

## Phase15 C15b — ilova krediti va sovg‘a (avtomatik tekshirildi)

Hozir qo‘lda sinash shart emas. Keyingi yangi ko‘rishda: Admin → ilova/sovg‘a mahsulotini yoqing; ro‘yxatdan o‘tgan hisob → Do‘kon → ilova krediti yoki sovg‘a. Lokal sinov to‘lovi bir marta kredit beradi. Sovg‘ani boshqa doimiy hisobda havola/kod bilan ochib, qabul qilish tugmasini bosing; takroran boshqa oluvchi ola olmaydi. Sovg‘a kodi dastlab yashirin, olingach ko‘rsatilmaydi. USD/RUBda Click/Payme chiqmaydi, asl sotuvchi rekvizitlari saqlanadi. Bu haqiqiy bank tasdig‘i emas. docs/JOURNEYS_UZ.md. Desktop/mobil va hisobdan chiqish sinovlari o‘tdi; tayyor asar buyurtmasi keyingi qismda.

## Phase15 C15c1 — tayyor asar serveri

Server sinovlari avtomatik o‘tdi. Chizma mijozning o‘z saqlangan qo‘llanmasi bo‘lishi kerak; surat yuborilmaydi. Egasining chizma/narx tasdig‘idan keyin mijoz alohida qabul qiladi. To‘lovsiz ishlab chiqarish va tayyor bo‘lmasdan jo‘natish bloklanadi. Hozircha yangi ekranlar keyingi qismda; eski serverlardan tekshirish talab qilinmaydi.

## Phase15 C15 tayyor asar — avtomatik sinovlar o‘tdi

Qo‘lda sinash hozir shart emas. Keyin docs/JOURNEYS_UZ.mddagi “Tayyor asar buyurtmasi”ni bajaring: o‘z ochilgan/saqlangan qo‘llanmangizni yuborish → Do‘konda alohida rozilik → Admin chizma va narxni ko‘rib tasdiqlash → mijoz aynan shu chizma/jami narxni qabul qilish → sinov to‘lovi → Admin tayyorlash/tayyor/jo‘natish → mijoz kuzatuvi. Asl surat yuborilmaydi. Hisobot output/phase15/commissions/report.html; ikki haqiqiy PDFning barcha40qadami chizma bilan teng tekshirildi. Bu real pul yoki taxta sifati tasdig‘i emas.

## Phase15 C16a — to‘lovni qayd qilish serveri

Avtomatik sinov o‘tdi: prod rejimida sinov to‘lovini imzolash/qabul qilish yopiq. Moliya xodimi keyinchalik tashqarida olingan yoki qaytarilgan pulning aniq summa/valyuta va kvitansiya raqamini alohida tasdiqlab qayd qiladi; ilova bankdan pul yechmaydi va bank tasdig‘ini o‘zi da’vo qilmaydi. Bir so‘rov ikki marta kredit bermaydi. Boshlangan provider to‘lovi bilan naqd qaydi to‘qnashsa, avval u hal qilinishi kerak. Ekranlar keyingi C16 qismida, hozir qo‘lda tekshirish talab qilinmaydi.

## Phase15 C16b — Moliya ekrani avtomatik tekshirildi

Hozir qo‘lda sinash shart emas. Keyin Admin → **To‘lov qaydlari**: aynan olingan summani kvitansiya raqami va alohida belgi bilan qayd qilish, mijoz qaytarish so‘ragach haqiqatan qaytarilgan pulni qayd qilish. Ilova bankdan pul olmaydi/qaytarmaydi. **Mahalliy to‘lov yozuvlarini olish** va **Hisobot fayli (JSON)** faqat mahalliy moslikni tekshiradi; bank tasdig‘i emas. Qo‘llanma: docs/FINANCE_UZ.md. Desktop/mobil6holat, qayta urinish, ruxsat almashish va to‘rt til o‘tdi; dalillar output/phase15/finance/report.html. Yangi umumiy preview/APK C26da, eski4194–4200ga tegilmadi.

## 2026-10-21 — Phase15 xabarlar asosi (hozir sinash shart emas)

Xabarlar navbati alohida baza va soxta xizmat bilan avtomatik sinaldi; haqiqiy email yuborilmadi. Hisobning email roziligi, boshqa hisobga ko‘rinmaslik, to‘lov bilan birga saqlanish, qayta ishga tushganda takroriy yubormaslik va yetkazilishning noma’lum holati tekshirildi. Ko‘rish/boshqarish ekranlari keyingi checkpointda ulanadi; eski4194–4200sahifasida izlamang. Keyin haqiqiy email ulash uchun [TRANSACTIONAL_MESSAGES_UZ.md](../docs/TRANSACTIONAL_MESSAGES_UZ.md): VPSdagi maxfiy joyga yuboruvchi domen va Resend kaliti kerak. Hozir buni kutmaymiz.

## 2026-10-21 — Phase15 Xabarlar tayyor (hozir qo‘lda sinash shart emas)

Desktop va mobil oqimlar avtomatik sinaldi. Keyingi yakuniy Phase15 manzilida Menyu → Hisob/Boshqaruv → hisobga kirish → Xabarlar. Email bilan ro‘yxatdan o‘tganda rozilik va tilni tanlab saqlash mumkin; o‘chirib saqlansa keyingi xabar ilovada qoladi. O‘qildi belgisi va tanlov qayta ochilganda saqlanadi. Boshqaruv → Xabar yetkazilishi: “Xizmat qabul qildi” hali “Pochta serveri qabul qildi” degani emas. Xavfsiz qayta urinish qabul qilingan xatni yangidan yubormaydi; faqat holatni tekshiradi. Sinovda haqiqiy email yuborilmasligi yozilgan. Kirishdan chiqish yoki xodimni almashtirish eski shaxsiy javobni qaytarmaydi. 12 skrinshot: output/phase15/messages/report.html. Haqiqiy ulanish keyin [TRANSACTIONAL_MESSAGES_UZ.md](../docs/TRANSACTIONAL_MESSAGES_UZ.md) bo‘yicha; hozir kalit yoki qo‘lda sinov kutilmaydi. Eski4194–4200sahifalarini o‘zgartirmang.

## 2026-10-21 — Phase15 ixtiyoriy statistika asosi (hozir sinash shart emas)

Rozilik, faqat o‘z hisobidan eksport, o‘chirish va eski so‘rovning qayta yozilmasligi alohida bazalarda avtomatik sinaldi. Oddiy ilovadagi boshqaruv ekranlari keyingi checkpointda ulanadi; hozir sukut bo‘yicha yig‘ish o‘chiq. Jismoniy tayyor asar deb avtomatik xulosa qilinmaydi. [ANALYTICS_UZ.md](../docs/ANALYTICS_UZ.md) ma’lumot chegaralarini tushuntiradi. Eski4194–4200sahifalarini bu sinov uchun ishlatmang; qo‘lda tekshirish kutilmaydi.

## 2026-10-21 — Phase15 ixtiyoriy statistika ekranlari tayyor (hozir sinash shart emas)

Desktop/mobil hamda oflayn yig‘ish avtomatik sinaldi. Yakuniy yangi Phase15 manzilida Menyu → Hisob/Boshqaruv → kirish → Foydalanish statistikasi. Dastlab o‘chiq. Rozilikni saqlab suratdan natija yaratilsa faqat shakl/bosqich soni qayd qilinadi. “Ijro” va keyingi qadam tasdiq emas; qo‘lda tasdiqlash va bekor qilish alohida tekshirildi. “Statistikamni yuklab olish” o‘z JSONingizni beradi; o‘chirish tasdig‘i va tugmasidan keyin holat o‘chiq, eksport voqealari bo‘sh bo‘lsin. Boshqaruv → Rozilik berilgan statistika faqat umumiy sonlarni ko‘rsatadi; bu jismoniy ish yoki barcha mijozlar uchun foiz isboti emas. Hisobdan chiqqandan keyin eski eksport yuklanmaydi. Menyudan Hisobga kirib Yaratishga qaytganda menyu surat tugmasini to‘smasligi ham tuzatildi.12skrinshot/2sun’iy metadataeksport: output/phase15/analytics/report.html. Batafsil [ANALYTICS_UZ.md](../docs/ANALYTICS_UZ.md). Eski4194–4200sahifalarini bu tekshiruvda ishlatmang.

## 2026-10-22 — Talab aniqlashtirildi
4211 hali avtomatik yuz joylashuvini ko‘rsatadi, yangi erkin moslash emas. Keyingi sinov: surat → shakl → oq fonda faqat fon qirqimi → erkin joylashuv → ipli natija → ovozli yig‘ish va “Dam olish”dan aniq qadamga qaytish. Hozir sizdan qo‘lda sinov talab qilinmaydi.

## 2026-10-22 — Erkin surat moslash tayyor
Ilova: http://127.0.0.1:4212/ . Namuna va tekshiruvlar: http://127.0.0.1:4212/free-photo/ . Sinov kit kodi: output/phase15/free-photo/manual-testing.txt (3ta yig‘ish; eski kodlar o‘zgarmagan).
1. “Galereyadan tanlash” bilan suratni yuklang. Shakllar surat tagida chiqadi.
2. Doira/Kvadrat/Yurakni tanlang. Faqat fon qirqiladi; yuz, soch, yelka va odamlar orasidagi joylashuv o‘zicha qoladi.
3. Surib joylashtiring, ikki barmoq/g‘ildirak/slayder bilan kattalashtiring, “Burish” yoki “Qaytarish”dan foydalaning.
4. Qirqim yoqmasa “Fonni qayta qirqish”; kerak bo‘lsa “Qirqimni tuzatish” → “O‘chirish” / “Qismini qaytarish”. Bu tahrir butun suratda ishlaydi. “Tuzatish tugadi”ni bosing.
5. “Yaratish” → haqiqiy ipli natija. “Qayta moslash” oldingi joylashuvni saqlaydi.
6. “Yig‘ishni boshlash”, kit kodi bilan oching. Ovoz va sektorlar bo‘yicha yuring. “Dam olish”ni bosib “qadam saqlandi” xabarini kuting. Qayta ochilganda aynan o‘sha qadam turadi, ovoz o‘zidan boshlanmaydi. Bajarilgan ipni alohida tasdiqlang.
Avtomatik sinovlar bajarildi, hozir sizdan majburiy sinov talab qilinmaydi. Ipli tiniqlik va haqiqiy taxta sifati hali alohida qabul qilinadi.

Sayt → app, hisoblar, dostavka/to‘lov va Instagram sinov aksiyasi rejasi: docs/WEB_FIRST_UZ.md. Click/Payme hozir sinov; haqiqiy pul/xabar yuborilmadi.

## 2026-10-23 — Suratni keyin tahrirlash (yangi build; 4212 o‘zgarmagan)

Hozir qo‘lda tekshirishingiz shart emas. Yakuniy yangi manzilda: suratni tanlang, shakl/joylashuv/fonni moslang → Menyu → “Suratni keyin davom ettirish” → “Shu qurilmada saqlash”. Bitta nusxa 30 kun saqlanadi, yangi saqlash eskisini almashtiradi; surat serverga yuborilmaydi. Sahifani yopib ochgach shu menyudan “Saqlangan suratni ochish”: shakl, burilish, kattalik va qo‘lda qirqilgan qismlar aynan qaytishi kerak. “Saqlangan suratni o‘chirish” faqat shu tahrir nusxasini o‘chiradi; tayyor yo‘riqnoma alohida qoladi. Eskirgan yoki buzilgan nusxa tiklanmaydi. Brauzer/app ma’lumotlari tozalansa bu mahalliy nusxa ham yo‘qoladi. Bu hali server zaxirasi emas; shaxsiy hisob zaxirasi keyingi bosqichda ulanadi.

## 2026-10-23 — Shaxsiy surat zaxirasi API
Server qismi avtomatik tekshirildi: nusxa faqat hisob egasiga ochiladi, rozilik talab qiladi, o‘chirilgan suratni eski so‘rov qayta saqlamaydi. Hozir qo‘lda test shart emas. Saqlash/ochish/o‘chirish oynasi keyingi bosqichda ulanadi; 4212 hali o‘zgarmagan. Boshqa qurilma sessiyasi oddiy chiqishda yopilmaydi.

## 2026-10-23 — Hisobdagi surat zaxirasi (yangi build)
Hozir qo‘lda sinov shart emas. Yakuniy yangi manzilda Menyu → Hisob orqali kiring. Suratni moslang → Menyu → Suratni keyin davom ettirish → “Zaxira holatini tekshirish”. Suratni serverga yuborish roziligini alohida belgilang, “Hisobimda saqlash”. Boshqa qurilmada shu hisobga kirib, shu oynadan “Hisobdagi suratni ochish” joylashuv va qirqimni aynan qaytaradi. Bitta nusxa 30 kungacha; keyingi saqlash eskisini almashtiradi. O‘chirish alohida tasdiqlanadi. Aloqa uzilsa “Avvalgi so‘rovni qayta yuborish”; “unutish” serverdagi nusxani o‘chirmaydi. Bu nusxa galereyada ommaga e’lon qilinmaydi. 4212 eski build; yangisi finalda ochiladi.
# 2026-10-24 — sifat sinovi, egadan hozir test talab qilinmaydi

Mahalliy `output/physical-route-ssim-v4/report.html` faylida yettita suratning tayyorlangan nishoni, oldingi ip ko‘rinishi va tajriba natijasi yonma-yon. Vaqt bo‘lsa bir xil o‘lchamda ko‘z, burun va yurakning yuqori qismini solishtirish mumkin. Natija ozgina yaxshilangan, lekin ortiqcha iplar yetarlicha kamaymagan; bu variant ilovaga qo‘shilmadi. 4212 sahifasi o‘zgarmagan. Hisobotdagi shaxsiy suratlar faqat kompyuterda qoladi. Jismoniy taxta sifati tasdiqlangani yo‘q; boshqa kod ishlari egadan javob kutmasdan davom etadi.

## 2026-10-24 — hisob almashganda surat maxfiyligi

Kompyuter va mobil ko‘rinishda avtomatik sinov o‘tdi: oyna yopilgan bo‘lsa ham hisobdan chiqish tugallanmagan so‘rovni tozaladi. Eski hisobning kechikkan surat javobi yangi hisobga o‘tmadi. Sizdan hozir test kerak emas. Keyingi yangi buildda tekshirish uchun: shaxsiy zaxira oynasini yoping → hisobdan chiqing → boshqa hisobga kiring; uning zaxirasi va surati alohida qolishi kerak. Hisobni butunlay o‘chirish keyingi kod bosqichi; oddiy chiqish qurilmada ataylab saqlangan shaxsiy loyihalarni o‘chirmaydi.

## 2026-10-25 — mushuk va yozuv tuzatmasi (yangi manzil keyin beriladi)

4213 eski taqqoslash uchun saqlanadi. Yangi nusxada rasm turini bosh ekranda tanlash mumkin: Avtomatik, Odam, Hayvon, Transport, Buyum yoki Yozuv. Mushuk rasmini yuklang: boshi/tanasi qolishi, fon oq bo'lishi kerak. Joylashuvni o'zingiz surib yoki kattalashtirib belgilang; turni almashtirib qayta qirqish joylashuvni buzmasligi kerak. Noma'lum buyum ishonchli ajratilmasa, rasm butun qoladi; O'chirish/Tiklash bilan to'g'rilang. Yozuvda arabcha va lotincha matnni birga sinash mumkin, masalan «سَلام Ali»; harf nuqtalari va belgilari saqlanadi. Ipli natijadagi burun/tiniqlik hali qabul qilinmagan, bu tuzatma faqat qirqish va matn joylashuvini yaxshilaydi. Avtomatik desktop/mobil tekshiruvlar egani kutmasdan bajariladi.

## 2026-10-25 — yangi sinov nusxasi

http://127.0.0.1:4214/ — Avtomatik/Hayvon orqali mushukni tanlang; bosh va tana qolishi,fon oq bo'lishi kerak. Shaklni tanlab,surish/kattalashtirish bilan o'zingiz joylashtiring. Yozuv rejimida «سَلام Ali» kabi aralash yozuvni sinash mumkin. Test kit kodi output/phase15/subject-repair/manual-testing.txt da. Yig'ishni boshlash orqali birinchi qadamni ko'ring. Burun tiniqligi hali to'liq tuzalmagan; yangi nusxada qirqish/yozuv tuzatmasi bor. Avtomatik desktop/mobil8/8 test o'tgan. Eski4213 va yangi4214 nusxalari saqlanadi.

## 2026-10-25 — yasash papkasi tekshirildi

`output/ip-rasm-yasash-paketi-500mm-20261025.zip` ni oching va BIRINCHI-OQING.html dan boshlang. Ichida500x500mm bitta PDF,6A4andoza,18sektor sahifasi va ustaga koordinatalar bor. 100%/Actual size chiqarib,50mm belgini chizg'ich bilan tekshiring. Har shaklda240mix; bitta ishga faqat tanlangan shakl mixlarini qo'ying. Qalinlik/pilot teshikni avval ortiqchaMDFda sinang. Keyin4214da rasmni yarating,kitni oching,birinchi qadamni ekrandan oling; dam olishdan keyin shu qo'llanma/brauzerga qayting. Batafsil docs/BUILD_TODAY_UZ.md. Bu bosqichning barcha desktop/mobil8/8sinovi avtomatik o'tdi; sizni kutib kod ishi to'xtamaydi. Burun sifati va haqiqiy taxta hali qabul qilinmagan.

## 2026-10-25 — backupdan keyingi hisob o'chirish himoyasi

Hozir sizdan qo'lda tekshiruv kerak emas. Eski backupni tiklashda ham o'chirilgan hisob qaytmasligi uchun alohida jurnal qo'shildi;20tegishli test o'tdi. VPSda tiklash vaqtida hozirgi erasure volume'ni saqlash kerak: docs/BACKUP_UZ.md. Docker/HTTP yakuniy sinovi agent tomonidan davom ettiriladi. Taxta yasash papkasi avvalgi ZIPda tayyor; burun sifati hali alohida ochiq masala.

## 2026-10-25 — C21 yakuniy tekshiruv

624/624unit va6/6desktop/mobil API/oyna testi o'tdi. Dockerproduction rejimida eskiDBni tiklash,o'chirilganhisob qaytmasligi,boshqahisob saqlanishi vaikkitabackup tekshirildi. RealVPSga kirilmagan,realpul/xabar yo'q. Sizdan bu bosqichda sinovtalabqilinmaydi. KeyingiC28sinovkodi/dostavka oqimi avtomatik tekshiriladi; taxtapaketi tayyor.


### C28 — Instagram sinov kodi (API tayyor, oynalar hali tugamagan)

Hozir qo‘lda sinash shart emas; server17unit va1HTTP sinovdan o‘tdi. Kampaniya o‘chiq qoladi. Kod faqat bitta raqamli yig‘ishga; taxta/dostavka alohida. Keyingi oynalar tayyor bo‘lganda to‘liq qadamlar yoziladi. docs/INSTAGRAM_TRIAL_UZ.md.


### C28 — sinov kodi va do‘kon tayyor

Avtomatik20unit va6desktop/mobil oqim o‘tdi; hozir qo‘lda sinash talab qilinmaydi. Keyin Menyu → Hisob/Admin → Instagram sinovi: muddat/budjetni saqlab, shaxsiy kod yarating/TXTsaqlang. Mijoz email hisobida Sinov kodi bo‘limidan yoki natijadagi yig‘ish oynasidan oladi. Bir kod bitta raqamli yig‘ish; taxta/dostavka pullik. Menyu → Do‘kon va buyurtmalar: savat, telefon/manzil, mahsulot+yetkazish+jami, sandbox to‘lov, holat/tracking. Dam olishdan keyin internetsiz qadam saqlanadi. To‘liq yo‘l docs/INSTAGRAM_TRIAL_UZ.md. Haqiqiy kampaniya/to‘lov o‘chiq.


### C22 — to‘rt til

Menyu → Til: O‘zbekcha / Ўзбекча / Русский / English. Surat tanlash, joylashuv, natija, yig‘ishni ochish va xato xabari shu tilda chiqadi; joylashuv va iplar o‘zgarmaydi. Admin kit andozasi/stiker PDF va yig‘ish TXT/PDF tanlangan tilda. Sektor B-17, rang kodi va raqamlar o‘zgarmaydi.19unit,4desktop/mobil va16PDF/144sahifa avtomatik tekshirildi; hozir qo‘lda sinash talab qilinmaydi. Eski taxta ZIP o‘zgarmagan.


### C23 — natija chiqqanda qotish tuzatildi

Yaratish tugagach rasmni chizish ham alohida hisoblash oqimida; eski iplar va barcha piksellar aynan saqlandi.17unit/17desktop-mobil oqim o‘tdi; do‘konni ochib qaytganda joylashuv/burilish saqlanadi. Chrome sahifasi4×sinovida yaratish4.2–5.8s, ekran javobidagi eng katta uzilish0.423s. Bu haqiqiy telefon yoki Workerning4×sinovi emas: Chrome uni sekinlatmadi, butun telefon uchun20smezon hali qabul qilinmagan. Keyin o‘z telefoningizda Doira/Kvadrat/Yurakni yaratib vaqtni tekshiring; hozir bu sinovni kutib turmayman. Tafsilot PHONE_PERFORMANCE_CHECKPOINT.md.


### C24a — xavfsizlik paketlari

Vite7.3.7/Vitest4.1.12 bilan npm auditi0ta zaiflik ko‘rsatdi.28tegishli unit va4desktop/mobil eski-yangi yo‘riqnoma/eksport/oflayn sinovi o‘tdi. Gitdagi barcha mavjud lokal tarix tekshirildi; tekshiruvchi maxfiy qiymatni chiqarmaydi. Tizim/telefon dasturi o‘rnatilmadi, eski saytlar o‘zgarmadi. ServerIP/rate-limit/galereya/CSP bosqichi hali davom etadi; hozir sizdan sinov talab qilinmaydi.

##2026-10-25 — Server xavfsizligi avtomatik tekshirildi

Hozir qo‘lda tekshirish shart emas: mobil rasm yuklash, ipli natija, kit bilan kirish va PDF haqiqiy lokal HTTPS/Caddy orqali o‘tdi. VPSni qo‘yishda docs/DEPLOY_VPS_UZ.md ga amal qiling; API portini internetga ochmang.429 chiqsa60soniya kuting. Galereya sig‘imi sozlamasi, proxy IP va tarmoqni faqat shu yo‘riqnoma bo‘yicha o‘zgartiring. Bu real telefon/taxta yoki yuz o‘xshashligi tasdig‘i emas.

##2026-10-25 — Oddiy ekran va eski loyihalar

Desktop va mobil avtomatik sinovida eski loyiha ochildi, tasdiqlangan qadam saqlandi, internet o‘chirilganda qayta ochilib JSON chiqarildi. Hozir sizdan qo‘lda sinov talab qilinmaydi; yakuniy yangi havola alohida beriladi. Arabcha shrift va eski qo‘llanmalar saqlangan.

##2026-10-25 — Ovozli buyruqlar tayyor (ixtiyoriy)

Avtomatik desktop/mobil sinovlari o‘tdi; hozir sizdan qo‘lda sinov talab qilinmaydi. Keyinchalik Android13+da yig‘ishni oching → Menyu → Mutaxassis rejimi → Ovozli buyruqlar. Rejimni belgilang, Bir marta tinglashni bosing. Qo‘llanma tilida keyingi/oldingi/takrorla/pauza/ijro deng. So‘z tanish modeli telefonda avvaldan bo‘lishi kerak; bo‘lmasa tugmalar ishlashda davom etadi. Ruxsat oynasidan keyin kerak bo‘lsa yana Bir marta tinglashni bosing. Ilova internetdagi tanishga yoki model yuklashga o‘tmaydi. Bajarilgan ipni faqat qo‘lda tasdiqlang; ovozli buyruq buni tasdiqlamaydi. Ekrandan chiqish, qo‘lda qadamni o‘zgartirish va dam olish tinglashni bekor qiladi. Qayta ochilganda mikrofon rejimi o‘chiq. Batafsil docs/ASSEMBLY_COMMANDS_CHECKPOINT.md.

##2026-10-26 — Taxta rasmi bilan qadamni tekshirish (ixtiyoriy)

Hozir qo‘lda sinov shart emas: kamera maketi, xotira xatosi, saqlash, internet o‘chiq qayta ochish va rasmni o‘chirish avtomatik tekshirildi. Keyin yig‘ish ekranida Menyu → Mutaxassis rejimi → Taxta rasmlari belgilang. Kamera yoki galereyadan taxtaning rasmini oling, qadamni solishtiring, yoqsa Shu qadam rasmini saqlashni bosing. Saqlangan rasm har doim o‘sha qadamga tegishli; Shu qadamni ochish faqat qadamga qaytaradi, ishni tasdiqlamaydi. To‘g‘riligini o‘zingiz tekshirib, odatiy tasdiqlash tugmasidan foydalaning. Rasm faqat shu qurilmada,30kungacha; har loyihada3ta/qurilmada20ta. Serverga yoki boshqa qurilmadagi hisobga ko‘chmaydi. Eski rasmni Rasmni o‘chirish bilan tozalang. Haqiqiy kamera/taxta aniqligi alohida sinov; ilova noto‘g‘ri ipni avtomatik topadi degan va’da yo‘q. docs/ASSEMBLY_PHOTOS_CHECKPOINT.md.

##2026-10-26 — Yakuniy tekshiruv tayyorgarligi

660ta unit sinovi to‘liq o‘tdi. Hozir qo‘lda tekshirish talab qilinmaydi; desktop/mobil sinov matritsasi va APK yakuni davom etadi. Yangi yakuniy havola va3ta kit kodi tayyor bo‘lganda output/phase15/manual-testing.txt da bo‘ladi; hozir bu fayl yaratilgan degan ma’no yo‘q. Eski4214 sahifangiz saqlangan. Egasi imzolaydigan release uchun scripts/build-release.ps1 va docs/APK_SERVER_AND_SIGNING_UZ.md, iPhone uchun docs/IOS_UZ.md qo‘llanadi; hech qanday yangi kalit/telefon o‘rnatish bajarilmagan.

##2026-10-26 — Mutaxassis muharriri

Avtomatik desktop/mobil sinovda rasm yuklash, Hayvon tanlash, maxsus sozlamani yoqish, belgilarni ko‘chirish va hisoblash tekshirildi. Sozlama yoqilganda butun ekran yo‘qolishi tuzatildi. Hozir qo‘lda tekshirish shart emas; yakuniy yangi havola hali tayyorlanmoqda.

##2026-10-26 — Eski loyihani davom ettirish

Avtomatik desktop/mobil sinovda eski loyiha → Hisoblashni davom ettirish natijasi kerakli muharrirda ochilishi tuzatildi. Sozlamalarni qayta ishlatish, asl piksel va eski qadamlarning saqlanishi ham tekshirildi. Hozir qo‘lda tekshirish talab qilinmaydi; yakuniy yangi build sinovi davom etadi.

## 2026-10-26 — quti kodi bilan sayt

Kodsiz rasm yuklab tayyor ipli ko‘rinishni ko‘ring. PDF/yig‘ish tugmasi kit kodini so‘rashi, ketma-ket video/GIF esa yopiq bo‘lishi kerak. Har qutining o‘z kodi parolsiz3ta yangi yo‘riqnomani ochadi; ayni ishni qayta ochish bepul. To‘rtinchi yangi rasm ko‘rinishi chiqadi, uning yo‘riqnomasi ochilmaydi. Telegram/telefonni keyin qo‘shamiz. Yangi havola tekshirilgan web builddan keyin manual-testing.txt ga yoziladi; hozir e’lon qilingan degan da’vo yo‘q.
