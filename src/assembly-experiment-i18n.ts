import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  en: {
    title: "Voice commands (experimental)",
    consent: "Enable local voice commands for this session",
    help: "Tap once to listen in the guide language. Say next, previous, repeat, pause or play. Confirm completed work by hand.",
    listen: "Listen once",
    cancel: "Cancel listening",
    off: "Microphone is off",
    permission: "Waiting for permission",
    preparing: "Preparing local recognition",
    listening: "Listening now",
    heard: "Heard",
    manual:
      "Use the buttons. Local recognition is unavailable or the words were unclear.",
    next: "Next step",
    previous: "Previous step",
    repeat: "Repeat",
    pause: "Pause",
    play: "Play",
  },
  uz: {
    title: "Ovozli buyruqlar (sinov)",
    consent: "Shu safar qurilmada ovozli buyruqlarni yoqish",
    help: "Qo‘llanma tilida tinglash uchun bir marta bosing. Keyingi, oldingi, takrorla, pauza yoki ijro deng. Bajarilgan ishni qo‘lda tasdiqlang.",
    listen: "Bir marta tinglash",
    cancel: "Tinglashni bekor qilish",
    off: "Mikrofon o‘chiq",
    permission: "Ruxsat kutilmoqda",
    preparing: "Qurilmada tanish tayyorlanmoqda",
    listening: "Hozir tinglayapti",
    heard: "Eshitildi",
    manual:
      "Tugmalardan foydalaning. Qurilmada tanish mavjud emas yoki so‘z aniq eshitilmadi.",
    next: "Keyingi qadam",
    previous: "Oldingi qadam",
    repeat: "Takrorlash",
    pause: "Pauza",
    play: "Ijro",
  },
  ru: {
    title: "Голосовые команды (пробная функция)",
    consent: "Включить команды на устройстве для этого сеанса",
    help: "Нажмите один раз для прослушивания на языке инструкции. Скажите дальше, назад, повтори, пауза или продолжить. Выполненную работу подтверждайте вручную.",
    listen: "Прослушать один раз",
    cancel: "Отменить прослушивание",
    off: "Микрофон выключен",
    permission: "Ожидание разрешения",
    preparing: "Подготовка распознавания на устройстве",
    listening: "Сейчас слушает",
    heard: "Распознано",
    manual:
      "Используйте кнопки. Распознавание на устройстве недоступно или слова неясны.",
    next: "Следующий шаг",
    previous: "Предыдущий шаг",
    repeat: "Повторить",
    pause: "Пауза",
    play: "Воспроизвести",
  },
};
export function assemblyExperimentText(
  locale: Locale,
  key: keyof typeof words.en,
) {
  return scriptText(words[baseLocale(locale)][key], locale);
}
