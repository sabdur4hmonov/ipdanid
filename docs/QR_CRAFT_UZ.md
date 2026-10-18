# QR lenta naqshi (tajriba)

Menyu → Mutaxassis rejimi → Menyu → donali hunarmandchilik → QR ip naqshi. Matn yoki havolani kiriting va reja yarating. Hisoblash, rasm va matn qurilmada qoladi; dastur QR ichidagi havolani o‘zi ochmaydi.

Bu oddiy 240 mixli portret kitidan boshqa mahsulot: oq, 1 mm qalinlikdagi teshiladigan varaq va eni 1.4 mm bo‘lgan YASSI qora lenta kerak. Modul 5.6 mm, har modul bo‘yicha 4 ta tekis lenta yo‘li. Teshik diametri 0.6 mm, eng yaqin markazlar 1.4 mm; lenta bukilib teshikdan o‘tishi amalda tekshiriladi. Oddiy dumaloq monofilament ip shu ko‘rinishni bermaydi. Bu o‘lchamlar dasturiy andoza, material yetkazilgan yoki fizik tasdiqlangan degani emas. Mos kelmagan qattiq lenta, katta igna yoki yupqa/yirtiladigan taglik bilan ishlatmang.

QR H xato tuzatish darajasida yaratiladi. To‘rt modul kenglikdagi oq chegara atrofida toza qoladi. Matn 80 UTF-8 baytdan oshmasin; H darajasida 5-versiyaga sig‘magan matn bundan oldinroq ham rad etiladi. Qisqa havola yoki qisqa matn tanlang. Bir xil qora modul qatorlari yaxlit yo‘lga birlashadi. Old tomondagi chiziqni tugatib, lentani teshikdan orqaga o‘tkazing; keyingi teshikka ORQA tomondan boring, so‘ng oldiga chiqing. Bitta lentaning barcha o‘tishlari ketma-ketlikda hisoblangan. Lenta cheti tekis bo‘lsin; qalin dumaloq ip bilan bo‘shliqlarni almashtirmang.

SVG teshik andozasi haqiqiy mm o‘lchamida. PDFda bitta to‘liq o‘lchamli varaq, A4 bo‘laklari va har bir qadamning old/orqa tomoni hamda teshik koordinatalari bor. PDF A4 bo‘laklarida X/Y boshlanish nuqtasi ko‘rsatiladi; ularni shu koordinata bo‘yicha birlashtiring. Andoza varag‘ini tayyor rasmning oldida qoldirmang. 100% chop eting, 50 mm chiziqni o‘lchang. Teshik raqamlari va aniq mm koordinatalari CSV/JSON/qadamlar PDFida; mayda teshiklar ustiga o‘qilmaydigan raqamlar tiqilmaydi.

Reja yaratilganda avtomatik saqlanadi. Qadamni bajarib tasdiqlang, ilovani yopib oflayn qayta oching: keyingi bajarilmagan qadamdan davom etadi. Old/orqa ko‘rinish va faqat bajarilganini ko‘rsatish tugmalari bor. Boshqa oynadagi eski holat yangi tasdiqni bosib ketolmaydi; loyihani qayta oching. Beshtagacha loyiha saqlanadi. JSON importi eski faylni alohida loyiha qilib ochadi; buzilgan geometriya, material yoki ketma-ketlik rad etiladi.

Dasturiy sinov haqiqiy old lenta chiziqlari rastrini QR dekoder bilan tekshiradi; ideal QR rasmi natijaning ustiga qo‘yilmaydi. Tayyor fizik buyumni turli masofa, yorug‘lik va telefonlarda skanerlash alohida egasi sinovidir. Dasturiy dekodlash bu fizik sinovni almashtirmaydi.
