import type { Locale } from "./core/types";
import type { SubjectPlan } from "./core/subject-plan";
import { baseLocale, scriptText } from "./uzbek-script";
const en = {
  title: "Subject details",
  enable: "Use experimental subject fitter",
  hint: "Same full optical fitter for 1–3 subjects. Quality is not yet accepted; the usual method remains available.",
  mark: "Mark the subject and real details on the processed target. Changing crop or shape requires review again.",
  subject: "Subject",
  bounds: "Subject / silhouette bounds",
  detail: "Detail",
  eyes: "Eyes",
  nose: "Muzzle / nose",
  mouth: "Mouth",
  addSubject: "Add subject",
  removeSubject: "Remove subject",
  addDetail: "Add detail",
  removeDetail: "Remove detail",
  review: "I checked this subject and all details",
  left: "Left",
  top: "Top",
  width: "Width",
  height: "Height",
  preview: "Processed target with manual regions",
  inspect:
    "Inspect every subject at ordinary size and enlarged. A numerical screen cannot approve likeness.",
  screenPass:
    "All subject metrics passed the comparison with the saved reference. Visual review is still required.",
  screenFail:
    "Rejected by the worst-subject screen: at least one subject or marked detail worsened. Keep the saved reference.",
};
const uz: typeof en = {
  title: "Obyekt qismlari",
  enable: "Tajriba obyekt usulini ishlatish",
  hint: "1–3 obyekt uchun bir xil to‘liq optik hisoblash. Sifat hali qabul qilinmagan; odatiy usul ham mavjud.",
  mark: "Tayyorlangan suratda obyekt va haqiqiy qismlarni belgilang. Kesish yoki shakl o‘zgarsa qayta tekshiring.",
  subject: "Obyekt",
  bounds: "Obyekt / tashqi chegara sohasi",
  detail: "Qism",
  eyes: "Ko‘zlar",
  nose: "Tumshuq / burun",
  mouth: "Og‘iz",
  addSubject: "Obyekt qo‘shish",
  removeSubject: "Obyektni olib tashlash",
  addDetail: "Qism qo‘shish",
  removeDetail: "Qismni olib tashlash",
  review: "Obyekt va barcha qismlarni tekshirdim",
  left: "Chap",
  top: "Yuqori",
  width: "Kenglik",
  height: "Balandlik",
  preview: "Qo‘lda belgilangan tayyor surat",
  inspect:
    "Har bir obyektni oddiy va kattalashtirilgan ko‘rinishda tekshiring. Raqamli sinov o‘xshashlikni tasdiqlamaydi.",
  screenPass:
    "Barcha obyekt metrikalari saqlangan namuna bilan solishtirishdan o‘tdi. Ko‘z bilan tekshirish hali kerak.",
  screenFail:
    "Eng yomon obyekt tekshiruvida rad etildi: kamida bitta obyekt yoki qism yomonlashgan. Saqlangan namunani qoldiring.",
};
const ru: typeof en = {
  title: "Детали объекта",
  enable: "Экспериментальный метод для объектов",
  hint: "Один полный оптический метод для 1–3 объектов. Качество ещё не принято; обычный метод доступен.",
  mark: "Отметьте объект и реальные детали на подготовленном изображении. После изменения кадра или формы проверьте заново.",
  subject: "Объект",
  bounds: "Границы объекта / силуэта",
  detail: "Деталь",
  eyes: "Глаза",
  nose: "Морда / нос",
  mouth: "Рот",
  addSubject: "Добавить объект",
  removeSubject: "Удалить объект",
  addDetail: "Добавить деталь",
  removeDetail: "Удалить деталь",
  review: "Я проверил объект и все детали",
  left: "Слева",
  top: "Сверху",
  width: "Ширина",
  height: "Высота",
  preview: "Подготовленное изображение с отмеченными областями",
  inspect:
    "Проверьте каждый объект в обычном и увеличенном виде. Численная проверка не подтверждает сходство.",
  screenPass:
    "Метрики всех объектов прошли сравнение с сохранённым образцом. Визуальная проверка ещё нужна.",
  screenFail:
    "Отклонено проверкой худшего объекта: хотя бы один объект или деталь ухудшились. Сохраните прежний образец.",
};
export function subjectFitText(locale: Locale, key: keyof typeof en) {
  return scriptText({ en, uz, ru }[baseLocale(locale)][key], locale);
}
export function subjectMetricLabel(
  locale: Locale,
  key: string,
  plan: SubjectPlan,
) {
  const [id, part] = key.split("."),
    index = plan.subjects.findIndex((s) => s.id === id),
    role =
      part === "whole"
        ? "bounds"
        : (part.split("-")[0] as "eyes" | "nose" | "mouth" | "detail");
  return `${subjectFitText(locale, "subject")} ${index + 1} · ${subjectFitText(locale, role)}`;
}
