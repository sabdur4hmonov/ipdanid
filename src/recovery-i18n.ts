import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  title: [
    "Qolgan joyni boshqa qurilmada davom ettirish",
    "Продолжить на другом устройстве",
    "Continue on another device",
  ],
  info: [
    "Yo‘riqnoma va qolgan joy saqlanadi. Asl surat yuborilmaydi.",
    "Сохраняются инструкция и место остановки. Исходное фото не отправляется.",
    "Save your guide and position. The original photo is not uploaded.",
  ],
  refresh: ["Serverdan yangilash", "Обновить с сервера", "Refresh from server"],
  save: [
    "Shu qurilmadagini saqlash",
    "Сохранить с этого устройства",
    "Save this device’s copy",
  ],
  restore: [
    "Serverdagi nusxani tiklash",
    "Восстановить с сервера",
    "Restore server copy",
  ],
  retry: ["Qayta yuborish", "Повторить отправку", "Retry upload"],
  discard: [
    "Yuborilmagan nusxani bekor qilish",
    "Отменить ожидающую копию",
    "Discard pending copy",
  ],
  last: ["Oxirgi saqlash", "Последнее сохранение", "Last saved"],
  confirmed: ["Bajarilgan qadam", "Выполненный шаг", "Confirmed step"],
  cursor: ["To‘xtagan qadam", "Место остановки", "Paused step"],
  pending: ["Yuborishni kutmoqda", "Ожидает отправки", "Waiting to upload"],
  conflict: [
    "Serverda yangi nusxa bor. Yangilang, so‘ng qaysi nusxani saqlashni tanlang.",
    "На сервере новая копия. Обновите и выберите нужную копию.",
    "A newer copy is on the server. Refresh, then choose which copy to keep.",
  ],
  failed: [
    "Saqlanmadi. Aloqani tekshirib qayta urinib ko‘ring.",
    "Не сохранено. Проверьте связь и повторите.",
    "Not saved. Check your connection and retry.",
  ],
  saved: ["Serverda saqlandi", "Сохранено на сервере", "Saved on server"],
  empty: [
    "Avval loyihani hisobga yuklang.",
    "Сначала загрузите проект в аккаунт.",
    "Upload a project to your account first.",
  ],
} as const;
export function recoveryText(locale: Locale, key: keyof typeof words) {
  return scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
}
