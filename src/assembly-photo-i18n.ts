import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  en: {
    title: "Board photos (experimental)",
    consent: "Keep board photos only on this device for up to 30 days",
    help: "Compare the board yourself with the same saved step. The app does not check whether the threads are correct. Up to 3 photos per project and 20 on this device. Nothing is uploaded or included in account recovery.",
    save: "Save this step photo",
    delete: "Delete photo",
    discard: "Discard new photo",
    failed:
      "Photo could not be saved or opened. Try again; manual steps still work.",
    capacity: "Photo storage is full. Delete an old board photo first.",
    yourBoard: "Your board photo",
    expected: "Thread guide at this step",
    step: "Step",
    saved: "Saved board photos",
    open: "Compare photo",
    jump: "Open this step",
    saving: "Saving on this device",
  },
  uz: {
    title: "Taxta rasmlari (sinov)",
    consent: "Taxta rasmlarini faqat shu qurilmada 30 kungacha saqlash",
    help: "Taxtani aynan saqlangan qadam bilan o‘zingiz solishtiring. Ilova iplar to‘g‘ri o‘ralganini tekshirmaydi. Har loyihada 3 ta, qurilmada 20 tagacha rasm. Serverga yuborilmaydi va hisobni tiklashga kirmaydi.",
    save: "Shu qadam rasmini saqlash",
    delete: "Rasmni o‘chirish",
    discard: "Yangi rasmni bekor qilish",
    failed:
      "Rasm saqlanmadi yoki ochilmadi. Yana urinib ko‘ring; qo‘lda qadamlar ishlayveradi.",
    capacity: "Rasm xotirasi to‘ldi. Avval eski taxta rasmini o‘chiring.",
    yourBoard: "Taxtangiz rasmi",
    expected: "Shu qadamdagi ip qo‘llanmasi",
    step: "Qadam",
    saved: "Saqlangan taxta rasmlari",
    open: "Rasmni solishtirish",
    jump: "Shu qadamni ochish",
    saving: "Shu qurilmada saqlanmoqda",
  },
  ru: {
    title: "Фото основы (пробная функция)",
    consent: "Хранить фото основы только на этом устройстве до 30 дней",
    help: "Самостоятельно сравните основу с тем же сохранённым шагом. Приложение не проверяет правильность нитей. До 3 фото на проект и 20 на устройстве. Фото не загружаются на сервер и не входят в восстановление аккаунта.",
    save: "Сохранить фото этого шага",
    delete: "Удалить фото",
    discard: "Отменить новое фото",
    failed:
      "Не удалось сохранить или открыть фото. Повторите; ручные шаги работают.",
    capacity: "Хранилище фото заполнено. Сначала удалите старое фото основы.",
    yourBoard: "Ваше фото основы",
    expected: "Инструкция нитей на этом шаге",
    step: "Шаг",
    saved: "Сохранённые фото основы",
    open: "Сравнить фото",
    jump: "Открыть этот шаг",
    saving: "Сохранение на устройстве",
  },
};
export function assemblyPhotoText(locale: Locale, key: keyof typeof words.en) {
  return scriptText(words[baseLocale(locale)][key], locale);
}
