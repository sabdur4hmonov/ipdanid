import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const en = {
  consent:
    "By pressing Create, you agree to send your adjusted black-and-white picture to our server for calculation. Unopened results expire after 30 minutes. Your original photo stays on your device.",
  private: "Your original photo stays on your device",
  privacy:
    "Your original photo stays on your device. Creating a protected preview sends your reviewed black-and-white picture to our server. Unopened results expire after 30 minutes. Unlocked guides stay in your account and work offline after saving. Source-photo backup is separate and requires your consent.",
};
const uz: typeof en = {
  consent:
    "Yaratish tugmasini bosib, moslangan qora-oq rasmni hisoblash uchun serverga yuborishga rozilik berasiz. Ochilmagan natija 30 daqiqada o‘chadi. Asl surat qurilmangizda qoladi.",
  private: "Asl surat qurilmangizda qoladi",
  privacy:
    "Asl surat qurilmangizda qoladi. Natija yaratishda siz moslagan qora-oq rasm hisoblash uchun serverga yuboriladi. Ochilmagan natija 30 daqiqada o‘chadi. Ochilgan yo‘riqnoma hisobingizda saqlanadi, qurilmaga olingach internetsiz ishlaydi. Asl suratning serverdagi zaxirasi alohida rozilik bilan saqlanadi.",
};
const ru: typeof en = {
  consent:
    "Нажимая «Создать», вы соглашаетесь отправить настроенное чёрно-белое изображение на наш сервер для расчёта. Неоткрытые результаты удаляются через 30 минут. Исходное фото остаётся на устройстве.",
  private: "Исходное фото остаётся на устройстве",
  privacy:
    "Исходное фото остаётся на устройстве. При создании результата настроенное чёрно-белое изображение отправляется на наш сервер. Неоткрытые результаты удаляются через 30 минут. Открытые инструкции сохраняются в аккаунте и после загрузки работают офлайн. Резервная копия исходного фото требует отдельного согласия.",
};
export function protectedText(locale: Locale, key: keyof typeof en) {
  return scriptText({ en, uz, ru }[baseLocale(locale)][key], locale);
}
