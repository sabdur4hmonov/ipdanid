# Ip Rasm — telefonda uy Wi-Fi orqali yig‘ish

1. Kompyuter va telefonni o‘zingiz ishonadigan **bir xil uy Wi-Fi** tarmog‘iga ulang. Kompyuterda loyiha papkasidagi `scripts\start-lan-build.cmd`ni oching. Agar bir nechta IPv4 chiqsa, **Wi-Fi** qatoridagi manzilni kiriting. Ethernet orqali routerga ulangan bo‘lsangiz shu adapter manzilini tanlang. Birinchi ishga tushirishda alohida nusxa tayyorlanishini kuting.
2. Oynada chiqqan **Telefon URL**ni telefon brauzerida aynan ko‘rsatilganicha oching yoki QR’ni skanerlang. Manzil `http://PC-IP:4950/?k=…` ko‘rinishida. Ruxsat berilgach manzildan token olib tashlanadi. Bu oynani ochiq qoldiring. Qayta ishga tushirsangiz yangi QR ishlating.
3. Telefonda suratni tanlang → **Doira** → joylashuvni tekshiring → natijani hisoblang → **Yig‘ishni boshlash**. Birinchi marta **Kodim bor** orqali LAN oynasida ko‘rsatilgan `manual-testing.txt` faylidagi **P2 sandbox kit** kodini kiriting. Bu alohida sinov bazasida uchta yangi ish ochish mumkin. Shu ishni qayta ochish yangi kredit sarflamaydi.
4. Ekrandagi birinchi mixda tugun qiling. Taxtada har ulanishni bajargach tasdiqlang. **Natijani shu qadamgacha ko‘rish** tugmasi shu qadamdagi tasvir bilan yakuniy tasvirni yonma-yon ochadi. Qalin ip bilan yetarlicha to‘q ko‘rinsa, oxirgi haqiqiy qadamni tasdiqlab **Dam olish**ni bosing.
5. **Qadam saqlandi** degan yozuvni kuting. Keyin shu telefon, shu brauzer, shu IP va portda qayta oching. **Davom etish**ni bosing. Kompyuter brauzeridagi eski qadam telefonga avtomatik ko‘chmaydi. Telefon inkognito rejimida ishlamasin. Uzoq ishda routerdan kompyuter uchun barqaror ichki IP ajrating.

**Ovoz.** Player’da **Instruktor tili**ni va telefon ovozini tanlang, **Ovozli qo‘llanma**ni yoqing, **Takrorlash** tugmasini o‘zingiz bosing. Bu iPhone’da ovozni boshlash uchun kerak. Mos ovoz bo‘lmasa telefonning matnni o‘qish sozlamasidan o‘sha tilni yuklang yoki mavjud tilni tanlang. Tizim ovozni va tarmoq kerakligini o‘zi belgilaydi. Telefonda haqiqiy ovozni eshitib tekshiring.

**Telefon boshqaruvi.** Brauzeringiz qo‘llasa, shu menyudan to‘liq ekranni oching yoki qadamni tasdiqlaganda tebranishni yoqing. Tugmalar qo‘llov bor qurilmalarda chiqadi. Ekran tez o‘chsa, jim takrorlanuvchi videoni qo‘lda yoqib ko‘ring. Bu usul hamma telefonda ishlamaydi va quvvat sarflaydi. Tanaffusda yoki boshqa ilovaga o‘tganda video to‘xtaydi. Kerak bo‘lsa telefonning ekran kutish vaqtini uzaytiring.

## Windows xavfsizlik devori

Agar telefonda sahifa ochilmasa, avval ikkala qurilma bir routerda ekanini tekshiring. Guest Wi-Fi qurilmalarni bir-biridan ajratishi mumkin. Kompyuterda **Settings → Network & Internet → Wi-Fi → ulangan uy tarmog‘i → Network profile type → Private** ni tanlang. Buni faqat o‘zingiz ishonadigan uy tarmog‘ida bajaring.

Kerak bo‘lsa Administrator PowerShell oching. Quyidagi buyruqdagi `192.168.1.20` o‘rniga LAN oynasida chiqqan kompyuter IP’sini yozing.

```powershell
New-NetFirewallRule -DisplayName "Ip Rasm P2 LAN 4950" -Direction Inbound -Action Allow -Profile Private -Protocol TCP -LocalPort 4950 -LocalAddress 192.168.1.20 -RemoteAddress LocalSubnet -EdgeTraversalPolicy Block
```

Faqat TCP 4950 uchun ruxsat bering. 4951 ichki API bo‘lib, faqat kompyuterda ishlaydi. Routerda port forwarding, DMZ, tunnel yoki ommaviy URL ochmang. QR va URL tokenini faqat oilangizga ko‘rsating. Oddiy HTTP trafik shifrlanmagan. Bu rejimda haqiqiy parol, mijoz ma’lumoti yoki to‘lov ishlatmang. Tugatgach LAN oynasida **Ctrl+C** bosing. Qoida endi kerak bo‘lmasa Administrator PowerShell’da o‘chiring.

```powershell
Remove-NetFirewallRule -DisplayName "Ip Rasm P2 LAN 4950"
```

[Microsoft firewall qo‘llanmasi](https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule)

## HTTPS talab qiladigan imkoniyatlar

Foto faylini tanlash, ipli natija, sandbox kod, assembly, odatiy brauzer xotirasida qadamni saqlash va TTS so‘rovi HTTP’da ishlaydi. LAN rejimini to‘liq oflayn deb hisoblamang. Quyidagi imkoniyatlar brauzerning xavfsiz kontekstini talab qiladi:

- Screen Wake Lock orqali ekran yoqib turish. O‘rniga ixtiyoriy jim videoni sinash mumkin.
- Service worker, PWA’ning oflayn rejimda qayta ochilishi.
- Push va brauzer bildirishnomalari.
- Clipboard API orqali avtomatik nusxalash. Matnni qo‘lda belgilang va nusxalang.
- Sayt ichidan kamera/mikrofon ochish, jumladan taxtani surat bilan solishtirish uchun jonli kamera. Telefon kamerasi bilan oldin olingan suratni fayl sifatida tanlash mumkin.

[Brauzer xavfsiz kontekst talablari](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts) va [kamera ruxsati](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

## To‘rtta A3 va ip qalinligi

Admin → Kit kodlari → **Kit profillari va aniq andozalar** → shaklga mos **4 × A3 andoza**. Birinchi bet yo‘riqnoma. 2–5-betlarni A3, **100% / Actual size** bilan chop eting. Har varaqda 100 mm belgi aynan 10 sm chiqishini tekshiring. 500 × 500 mm taxtada har bo‘lak 250 × 250 mm. Ramka bo‘ylab qirqing: to‘q chiziqlar tashqi chet, och chiziqlar markaz. Doirada A yuqori o‘ng, B pastki o‘ng, C pastki chap, D yuqori chap va A-1 eng yuqorida. Kvadrat va yurakda har varaq istalgan sektordan mix olishi mumkin. Har bir mixning bosma nomini o‘qing.

**O‘lchangan ip qalinligi (mm)** maydoniga 0,05–0,50 mm oralig‘ida o‘lchovni yozib saqlang. Yangi kit versiyasi yaratiladi. 0,12 mm dan 25% dan ortiq farq bo‘lsa Admin’da va shu versiyadagi player’da taxtadagi ton haqida ogohlantirish chiqadi. Bu maydon hisoblash yoki ko‘rinishni kalibrlamaydi.
