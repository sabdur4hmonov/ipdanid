import type { Locale } from "./core/types";
const en = {
  upload: "Upload photo",
  camera: "Take photo",
  title: "Camera",
  capture: "Use this photo",
  cancel: "Cancel",
  front: "Front camera",
  back: "Back camera",
  facing: "Camera direction",
  waiting: "Opening camera…",
  loading: "Loading photo…",
  hint: "Upload a photo or take one, then adjust its position and size below.",
  denied:
    "Camera access was denied. Allow camera access in browser settings or upload a photo.",
  missing: "No camera is available. Connect a camera or upload a photo.",
  unavailable:
    "The camera could not open. Close other camera apps and try again, or upload a photo. Browser camera access needs HTTPS or localhost.",
  failed:
    "The photo could not be loaded. Use a JPEG or PNG up to 15 MB and 24 MP.",
};
type Key = keyof typeof en;
const uz: Record<Key, string> = {
  upload: "Rasm yuklash",
  camera: "Rasmga olish",
  title: "Kamera",
  capture: "Shu rasmni ishlatish",
  cancel: "Bekor qilish",
  front: "Old kamera",
  back: "Orqa kamera",
  facing: "Kamera tomoni",
  waiting: "Kamera ochilmoqda…",
  loading: "Rasm yuklanmoqda…",
  hint: "Rasm yuklang yoki hozir rasmga oling, keyin pastda joylashuvi va o‘lchamini moslang.",
  denied:
    "Kameraga ruxsat berilmadi. Brauzer sozlamalarida kameraga ruxsat bering yoki rasm yuklang.",
  missing: "Kamera topilmadi. Kamera ulang yoki rasm yuklang.",
  unavailable:
    "Kamera ochilmadi. Kamerani ishlatayotgan boshqa ilovalarni yoping va qayta urinib ko‘ring yoki rasm yuklang. Brauzer kamerasi HTTPS yoki localhostda ishlaydi.",
  failed:
    "Rasm yuklanmadi. 15 MB va 24 MP gacha bo‘lgan JPEG yoki PNG ishlating.",
};
const ru: Record<Key, string> = {
  upload: "Загрузить фотографию",
  camera: "Сделать фотографию",
  title: "Камера",
  capture: "Использовать фотографию",
  cancel: "Отмена",
  front: "Передняя камера",
  back: "Задняя камера",
  facing: "Выбор камеры",
  waiting: "Открываем камеру…",
  loading: "Загружаем фотографию…",
  hint: "Загрузите фотографию или сделайте снимок, затем настройте положение и размер ниже.",
  denied:
    "Доступ к камере запрещён. Разрешите его в настройках браузера или загрузите фотографию.",
  missing: "Камера не найдена. Подключите камеру или загрузите фотографию.",
  unavailable:
    "Камера не открылась. Закройте другие приложения камеры и повторите попытку или загрузите фотографию. В браузере требуется HTTPS или localhost.",
  failed:
    "Не удалось загрузить фотографию. Используйте JPEG или PNG до 15 МБ и 24 МП.",
};
export const photoSourceText = (locale: Locale, key: Key) =>
  ({ en, uz, ru })[locale][key];
