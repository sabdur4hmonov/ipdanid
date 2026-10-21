# To‘lov qaydlari va hisobot solishtirish

Menu → Hisob / Admin → Admin → **To‘lov qaydlari**. Bu bo‘lim egasi va **Moliya** ruxsatli xodimga ochiladi. Yordam, katalog yoki kit-kod xodimi undan foydalana olmaydi.

Bu yerda bankka pul yuborilmaydi yoki bankdan pul yechilmaydi. Egasi/xodim haqiqiy holatni tashqarida tekshirib, olingan yoki qaytarilgan pulni ilovaga qayd qiladi. Click/Payme hozir sandbox: haqiqiy merchant yoqish ma’lumotlari [PAYMENTS_UZ.md](PAYMENTS_UZ.md)da.

## Naqd yoki qo‘lda olingan pul

1. Buyurtmaning raqami, **Buyurtma summasi** va valyutasini tekshiring. Narx buyurtma yaratilgan paytdagi server summasi; keyingi katalog o‘zgarishi uni almashtirmaydi. Valyuta aylantirilmaydi.
2. Faqat shu summa haqiqatan olingan bo‘lsa, kvitansiya yoki ichki qayd raqamingizni kiriting. Maxfiy merchant kaliti, karta ma’lumoti yoki parolni bu maydonga yozmang.
3. **Aynan shu summani ilovadan tashqarida oldim** belgisini qo‘ying, **Olingan pulni qayd qilish**ni bosing. Bir xil so‘rov qayta yuborilsa ikkinchi to‘lov yoki kredit yaratilmaydi.
4. Internet javobi kelmasa, **Aynan shu qaydni takrorlash** asl summa/raqam/so‘rovni takrorlaydi. **Yangilash** serverdagi asl holatni oladi.
5. Providerda allaqachon boshlangan to‘lov bo‘lsa, uni avval tekshirib hal qiling. Ilova bir vaqtning o‘zida provider to‘lovi va naqd pulni ikki marta qayd qilmaydi. Hali boshlanmagan invoice qo‘lda qayd bilan bir tranzaksiyada yopiladi.

## Qo‘lda qaytarilgan pul

Mijoz buyurtmada **Qaytarish so‘rash**ni bosadi. Asl to‘lov qo‘lda qayd qilingan bo‘lsa, Moliya bo‘limida qaytarish shakli chiqadi. Qaytarilgan aniq summa/valyutani tashqarida tekshirib, raqamini kiriting va **Aynan shu summani ilovadan tashqarida qaytardim**ni belgilang. Bu tugma bankdan pul qaytarmaydi.

Kredit sarflangan, sovg‘a boshqa odamga berilgan yoki tayyor asar ishlab chiqarilishi boshlangan bo‘lsa, avtomatik bekor qilish mumkin emas. Pulni qaytarish shartlarini avval egasi hal qilsin; ilova begona odamdan yashirincha kredit tortib olmaydi yoki tayyorlangan mahsulotni zaxiraga sun’iy qaytarmaydi. Bir xil qabul qilingan qaytarish qayta yuborilganda kredit/zaxira ikki marta o‘zgarmaydi. Provider to‘lovi uchun merchant bilan qaytarish jarayoni alohida; ushbu qo‘lda qaytarish faqat asl qo‘lda qayd qilingan to‘lovga tegishli.

## Hisobot

Bo‘lim oxirgi200buyurtma va ularning mahalliy to‘lov yozuvlarini solishtiradi. Farq bo‘lsa ko‘rsatiladi: to‘langan buyurtmada yozuv yo‘qligi, summa/holat farqi, bir nechta to‘lov, tekshirilishi kerak bo‘lgan uzoq turgan provider tranzaksiyasi. Farqni topish buyurtmani o‘z-o‘zidan to‘lamaydi yoki pul qaytarmaydi.

**Mahalliy to‘lov yozuvlarini olish** ilovaning invoice yozuvlarini JSON faylga oladi. Bu bank hisoboti emas. Har buyurtmada to‘lovning ilovadagi to‘liq raqami ham ko‘rinadi. Providerdan tekshirilgan ma’lumotni shu invoice raqami bilan moslang. Mijoz manzili, surat, kit/sovg‘a kodi yoki merchant kaliti bu faylga kirmaydi.

**Hisobot fayli (JSON)** orqali mana bu shakldagi faylni solishtirish mumkin:

```json
{
  "rows": [
    {
      "invoiceId": "11111111-1111-4111-8111-111111111111",
      "provider": "click",
      "currency": "UZS",
      "amountMinor": 10000,
      "state": 2
    }
  ]
}
```

Bu UUID ishlaydigan hisob emas, namuna. Haqiqiy `invoiceId`ni ilova yozuvidan oling. `provider`: `click` yoki `payme`; hozir ikkisi ham UZS uchun. `amountMinor`: tiyin, masalan10000tiyin=100so‘m. `state`:0yaratilgan,1boshlangan,2to‘langan,-1bekor qilingan. Bir faylda1–200ta, takrorlanmagan invoice;100KBdan kichik fayl. Shu shaklga mos kelmagan fayl rad qilinadi. Providerning asl fayl formati boshqacha bo‘lsa, faqat tekshirilgan yozuvlarini shu ustunlarga moslang; kalit yoki parol qo‘shmang.

Solishtirish faqat mahalliy yozuvga moslik/farqni ko‘rsatadi. Xodim bergan faylning bankdan haqiqiy kelganini ilova da’vo qilmaydi. Natija/audit saqlanadi, oxirgi20solishtirish qayta ochganda ko‘rinadi; bir xodimga bir kunda100solishtirish chegarasi bor.

## Ishlab chiqarish rejimi

Prod rejimida eski sandbox imzolash, umumiy sinov callbacki, sinov to‘lovi va sandbox qaytarish endpointlari403bilan yopiq. Lokal sinovda ular avvalgi testlar uchun qoladi. Naqd qaydi va qo‘lda qaytarishning yuqoridagi alohida Moliya yo‘li ishlatiladi. Domen/HTTPS va egasining parol bilan kirishi uchun [DEPLOY_VPS_UZ.md](DEPLOY_VPS_UZ.md).

Hozir qo‘lda sinov kutilmaydi. Bular sun’iy hisoblar va alohida bazada avtomatik tekshiriladi; eski4194–4200ilovalari va asl ma’lumotlar ishlatilmaydi.
