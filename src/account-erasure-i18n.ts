import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  title: ["Hisobni o‘chirish", "Удаление аккаунта", "Delete account"],
  info: [
    "Hisobdagi suratlar, yo‘riqnomalar va barcha kirishlar o‘chadi. To‘lov yozuvlari qoladi. Tugallanmagan buyurtma uchun kerakli manzil va rasm buyurtma yopilguncha saqlanadi.",
    "Фото, инструкции и все входы в аккаунт будут удалены. Записи платежей сохранятся. Адрес и рисунок для незавершённого заказа останутся до его закрытия.",
    "Account photos, guides and all sign-ins will be deleted. Payment records remain. The address and artwork needed for an unfinished order stay until it closes.",
  ],
  local: [
    "Qurilmada saqlangan loyihalar va surat alohida qoladi. Ularni Loyihalarim va Suratni keyin davom ettirish oynalarida o‘chiring. Boshqa qurilmadagi yuklangan nusxalar masofadan o‘chmaydi.",
    "Локальные проекты и фото остаются отдельно. Удалите их в библиотеке и окне сохранённого фото. Загруженные копии на других устройствах удалённо не стираются.",
    "Device-owned projects and the saved photo remain separate. Delete them in My projects and Continue editing later. Downloaded copies on other devices cannot be erased remotely.",
  ],
  review: [
    "Nimalar o‘chishini tekshirish",
    "Проверить удаление",
    "Review deletion",
  ],
  active: [
    "Tugallanmagan buyurtmalar",
    "Незавершённые заказы",
    "Unfinished orders",
  ],
  password: [
    "Hisob parolini qayta kiriting",
    "Повторите пароль аккаунта",
    "Re-enter account password",
  ],
  kit: [
    "Shu hisobning kit kodi",
    "Код набора этого аккаунта",
    "This account’s kit code",
  ],
  confirm: [
    "Hisobimni qaytarib bo‘lmas tarzda o‘chirishni tasdiqlayman",
    "Подтверждаю необратимое удаление аккаунта",
    "I confirm permanently deleting my account",
  ],
  remove: [
    "Hisobimni butunlay o‘chirish",
    "Удалить мой аккаунт навсегда",
    "Permanently delete my account",
  ],
  done: [
    "Hisob o‘chirildi. Barcha qurilmalardagi kirish yopildi.",
    "Аккаунт удалён. Вход на всех устройствах закрыт.",
    "Account deleted. All device sign-ins have been revoked.",
  ],
  failed: [
    "Bajarilmadi. Parol va aloqani tekshiring. Javob yo‘qolgan bo‘lsa, hisob holatini qayta kirib tekshiring.",
    "Не удалось. Проверьте пароль и связь. Если ответ потерян, войдите снова для проверки аккаунта.",
    "Could not finish. Check the credential and connection. If the response was lost, sign in again to check the account.",
  ],
  cleanup: [
    "Shu qurilmadagi hisob keshini tozalashni tugatish",
    "Завершить очистку кэша аккаунта на устройстве",
    "Finish clearing this device’s account cache",
  ],
  cleanupFailed: [
    "Serverdagi hisob o‘chirildi. Qurilmadagi kesh tozalanmadi; qayta urining.",
    "Аккаунт на сервере удалён. Очистка кэша не завершена; повторите.",
    "Server account deleted. Device cache cleanup did not finish; retry.",
  ],
  clean: [
    "Hisob keshi tozalandi. Bu tugma serverdagi hisobni o‘chirmaydi.",
    "Кэш аккаунта очищен. Эта кнопка не удаляет аккаунт на сервере.",
    "Account cache cleared. This button does not delete a server account.",
  ],
} as const;
export function erasureText(locale: Locale, key: keyof typeof words) {
  return scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
}
