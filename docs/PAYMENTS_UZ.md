# Click / Payme: faqat sandbox

Ilova haqiqiy pul olmaydi. `PAYMENTS_SANDBOX=0` bo‘lsa provayderlar yashiriladi. Naqd / olib ketish oqimi saqlangan. API buyurtma summasini serverdagi narxdan oladi; 1 so‘m = 100 tiyin. Admin narxni so‘mda kiritadi.

## Egasi oladigan ma’lumotlar

Click biznes shartnomasi orqali **test service_id** va **test SECRET_KEY**; Payme Business orqali **test login**, **test key** hamda hisob maydoni sifatida `order_id` ni kelishish kerak. Payme loginini taxmin qilmang: uni texnik mutaxassis beradi. Bularni VPSdagi xususiy `.env` faylga yozing, repoga yoki `VITE_` o‘zgaruvchilariga kiritmang:

```dotenv
PAYMENTS_SANDBOX=1
CLICK_SERVICE_ID=provider_test_service_id
CLICK_SECRET_KEY=provider_test_secret
PAYME_LOGIN=provider_test_login
PAYME_TEST_KEY=provider_test_key
```

Bu namunalar ishlaydigan kalitlar emas. Test callback manzillari: `https://SIZNING_DOMEN/api/payments/click` va `/api/payments/payme`. VPS/HTTPS ulash va maxfiy sozlamalar `DEPLOY_VPS_UZ.md` da yozilgan.

## Nima ishlaydi

Mijozga tegishli pending buyurtmadan invoice yaratiladi. Bitta buyurtmada faqat bitta faol invoice bo‘ladi; boshlanmagan invoice bekor qilinib boshqa usul tanlanishi mumkin. Prepare → Complete, o‘zgarmas qayta so‘rov, callback imzosi, aniq summa va kreditni bir marta berish SQLite tranzaksiyasida bajariladi. Boshqa akkaunt invoice holatini ko‘rolmaydi. Tayyorlangan buyurtma provayder bekor qilmaguncha zaxirada qoladi.

Click imzosi rasmiy MD5 ketma-ketligida; Complete da `merchant_prepare_id` ham qatnashadi. Payme Basic auth va JSON-RPC: CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction, CheckTransaction, GetStatement. 12 soatlik tugash, takroriy so‘rovlar va inklyuziv vaqt bo‘yicha statement sinovlari bor. Yetkazilgan kreditlar avtomatik qaytarilmaydi: Payme `-31007` qaytaradi, egasi merchant orqali qaytarishni hal qiladi.

Mustaqil lokal soxta provayder `scripts/mock-payment-provider.mjs` aynan HTTP callback yuboradi va faqat loopback APIga ishlaydi. “Sinov to‘lovini tasdiqlash” tugmasi faqat `IP_RASM_TEST_SERVER=1` va sandbox holatida chiqadi; mock endpoint ham lokal ulanish va mijoz sessiyasini talab qiladi. Kalitlar brauzerga berilmaydi.

## Ishga tushirishdan oldin

Bu bosqich **sandbox** bilan chegaralangan. Haqiqiy hosted checkout, live kalitlar, fiskal IKPU/QQS talablari va provayder sertifikatsiyasi alohida shartnoma bo‘yicha tasdiqlanishi kerak. Hozir live kalitni qo‘yish bilan real to‘lov ishga tushmaydi. Naqd buyurtmalarni Admin orqali boshqarish mumkin.

Manbalar: [Click so‘rov va imzolar](https://docs.click.uz/shop-api/requests), [Click xatolar](https://docs.click.uz/shop-api/errors), [Payme autentifikatsiyasi](https://developer.help.paycom.uz/protokol-merchant-api/skhema-vzaimodeystviya/), [CreateTransaction](https://developer.help.paycom.uz/metody-merchant-api/createtransaction/), [GetStatement](https://developer.help.paycom.uz/metody-merchant-api/getstatement/).
