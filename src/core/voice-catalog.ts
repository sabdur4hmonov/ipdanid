export type VoiceLanguage = "uz" | "ru" | "en";
export const VOICE_LANGUAGES: VoiceLanguage[] = ["uz", "ru", "en"];
export const INSTRUCTOR_IDS = ["instructor-a", "instructor-b"] as const;
export type InstructorId = (typeof INSTRUCTOR_IDS)[number];
const small: Record<VoiceLanguage, string[]> = {
  uz: "nol|bir|ikki|uch|to‘rt|besh|olti|yetti|sakkiz|to‘qqiz|o‘n|o‘n bir|o‘n ikki|o‘n uch|o‘n to‘rt|o‘n besh|o‘n olti|o‘n yetti|o‘n sakkiz|o‘n to‘qqiz".split(
    "|",
  ),
  ru: "ноль|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать|тринадцать|четырнадцать|пятнадцать|шестнадцать|семнадцать|восемнадцать|девятнадцать".split(
    "|",
  ),
  en: "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen".split(
    "|",
  ),
};
const tens: Record<VoiceLanguage, string[]> = {
  uz: "yigirma|o‘ttiz|qirq|ellik|oltmish|yetmish|sakson|to‘qson".split("|"),
  ru: "двадцать|тридцать|сорок|пятьдесят|шестьдесят|семьдесят|восемьдесят|девяносто".split(
    "|",
  ),
  en: "twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety".split("|"),
};
const hundreds: Record<VoiceLanguage, string[]> = {
  uz: "yuz|ikki yuz|uch yuz|to‘rt yuz|besh yuz|olti yuz|yetti yuz|sakkiz yuz|to‘qqiz yuz".split(
    "|",
  ),
  ru: "сто|двести|триста|четыреста|пятьсот|шестьсот|семьсот|восемьсот|девятьсот".split(
    "|",
  ),
  en: "one hundred|two hundred|three hundred|four hundred|five hundred|six hundred|seven hundred|eight hundred|nine hundred".split(
    "|",
  ),
};
// Exact recording script. These strings describe required owner recordings, not installed speech.
export const VOICE_PHRASES: Record<
  string,
  Record<VoiceLanguage, string>
> = Object.fromEntries(
  [
    ["step", "Qadam", "Шаг", "Step"],
    ["from-pin", "Boshlang‘ich mix", "С номера", "From pin"],
    ["to-pin", "Keyingi mix", "На номер", "To pin"],
    [
      "start-knot",
      "Ipni boshlang‘ich mixga tugun bilan mahkamlang.",
      "Закрепите нить узлом на начальном гвозде.",
      "Tie the thread securely to the starting pin.",
    ],
    [
      "finish-knot",
      "Oxirgi mixda yakuniy tugunni mahkamlang.",
      "Закрепите завершающий узел на последнем гвозде.",
      "Secure the finishing knot at the final pin.",
    ],
    [
      "color-change",
      "Keyingi rang uchun yangi ipni mahkamlang.",
      "Закрепите новую нить следующего цвета.",
      "Secure a new thread for the next colour.",
    ],
    [
      "wrap-pin",
      "Mixni aylanib o‘ting.",
      "Обведите нить вокруг гвоздя.",
      "Wrap around the pin.",
    ],
    [
      "keep-tension",
      "Ip tarangligini bir xil tuting.",
      "Сохраняйте одинаковое натяжение нити.",
      "Keep an even thread tension.",
    ],
    [
      "confirm-completed",
      "Faqat tugallagan qadamni tasdiqlang.",
      "Подтверждайте только выполненный шаг.",
      "Confirm only a completed step.",
    ],
    [
      "not-confirmed",
      "Bu qadam hali tasdiqlanmagan.",
      "Этот шаг ещё не подтверждён.",
      "This step is not confirmed yet.",
    ],
    ["next-step", "Keyingi qadam.", "Следующий шаг.", "Next step."],
    ["previous-step", "Oldingi qadam.", "Предыдущий шаг.", "Previous step."],
    ["paused", "To‘xtatildi.", "Пауза.", "Paused."],
    ["resume", "Davom etamiz.", "Продолжаем.", "Let us continue."],
    ["slower", "Sekinroq.", "Медленнее.", "Slower."],
    ["faster", "Tezroq.", "Быстрее.", "Faster."],
    ["repeat", "Qadamni takrorlayman.", "Повторяю шаг.", "Repeating the step."],
    ["check-pin", "Mixni tekshiring.", "Проверьте гвоздь.", "Check the pin."],
    [
      "check-number",
      "Mix raqamini tekshiring.",
      "Проверьте номер гвоздя.",
      "Check the pin number.",
    ],
    [
      "check-direction",
      "Yo‘nalishni tekshiring.",
      "Проверьте направление.",
      "Check the direction.",
    ],
    [
      "front-side",
      "Taxtaning old tomoni sizga qarasin.",
      "Лицевая сторона доски должна быть перед вами.",
      "Keep the front of the board facing you.",
    ],
    [
      "do-not-flip",
      "Shablonni teskari aylantirmang.",
      "Не переворачивайте шаблон зеркально.",
      "Do not mirror the template.",
    ],
    [
      "print-full-size",
      "Shablonni yuz foiz o‘lchamda chop eting.",
      "Печатайте шаблон в масштабе сто процентов.",
      "Print the template at one hundred percent scale.",
    ],
    [
      "check-ruler",
      "Ellik millimetrlik chizg‘ichni o‘lchang.",
      "Измерьте линейку длиной пятьдесят миллиметров.",
      "Measure the fifty millimetre ruler.",
    ],
    [
      "align-tiles",
      "Shablon varaqlarini belgilar bo‘yicha moslang.",
      "Совместите листы шаблона по меткам.",
      "Align the template sheets using their marks.",
    ],
    [
      "check-spacing",
      "Mixlar oralig‘ini tekshiring.",
      "Проверьте расстояние между гвоздями.",
      "Check the spacing between pins.",
    ],
    [
      "hammer-carefully",
      "Mixlarni ehtiyotkorlik bilan qoqing.",
      "Забивайте гвозди осторожно.",
      "Hammer the pins carefully.",
    ],
    [
      "protect-surface",
      "Ish joyi yuzasini himoyalang.",
      "Защитите рабочую поверхность.",
      "Protect your work surface.",
    ],
    [
      "keep-thread",
      "Ipni qo‘lingizda ushlab turing.",
      "Удерживайте нить в руке.",
      "Keep hold of the thread.",
    ],
    [
      "avoid-tangle",
      "Ip chigallashmaganini tekshiring.",
      "Убедитесь, что нить не запуталась.",
      "Check that the thread is not tangled.",
    ],
    [
      "thread-low",
      "Qolgan ipni tekshiring.",
      "Проверьте оставшуюся нить.",
      "Check the remaining thread.",
    ],
    [
      "new-thread",
      "Yangi ipni ta’mirlash ko‘rsatmasi bo‘yicha ulang.",
      "Соедините новую нить по инструкции ремонта.",
      "Join new thread using the repair instructions.",
    ],
    [
      "repair-break",
      "Ip uzilsa, joriy qadamda to‘xtang.",
      "Если нить порвалась, остановитесь на текущем шаге.",
      "If the thread breaks, pause at the current step.",
    ],
    [
      "secure-end",
      "Ip uchini mahkamlang.",
      "Закрепите конец нити.",
      "Secure the end of the thread.",
    ],
    [
      "trim-tail",
      "Tugun mahkam bo‘lgach ortiqcha uchni kesing.",
      "Обрежьте лишний конец после закрепления узла.",
      "Trim the tail after securing the knot.",
    ],
    [
      "keep-loop",
      "Ip mixdan chiqib ketmasin.",
      "Не допускайте соскальзывания нити с гвоздя.",
      "Keep the loop on the pin.",
    ],
    [
      "no-extra-wrap",
      "Yo‘riqnomada yo‘q qo‘shimcha o‘ram qo‘shmang.",
      "Не добавляйте витки, которых нет в инструкции.",
      "Do not add wraps outside the guide.",
    ],
    [
      "follow-order",
      "Qadamlar tartibiga amal qiling.",
      "Следуйте порядку шагов.",
      "Follow the step order.",
    ],
    [
      "no-shortcut",
      "Mixlarni tashlab o‘tmang.",
      "Не пропускайте гвозди.",
      "Do not skip pins.",
    ],
    [
      "do-not-cut",
      "Ketma-ketlik davomida ipni kesmang.",
      "Не разрезайте нить внутри последовательности.",
      "Do not cut the thread within a sequence.",
    ],
    [
      "keep-board-still",
      "Taxtani barqaror tuting.",
      "Держите доску устойчиво.",
      "Keep the board steady.",
    ],
    [
      "check-lighting",
      "Mix raqamlari yaxshi ko‘rinsin.",
      "Номера гвоздей должны быть хорошо видны.",
      "Make sure the pin numbers are visible.",
    ],
    [
      "take-break",
      "Tanaffusdan oldin qadamni saqlang.",
      "Сохраните шаг перед перерывом.",
      "Save your step before taking a break.",
    ],
    [
      "save-progress",
      "Tugallangan qadamni tasdiqlab saqlang.",
      "Подтвердите и сохраните выполненный шаг.",
      "Confirm and save the completed step.",
    ],
    [
      "progress-saved",
      "Jarayon saqlandi.",
      "Прогресс сохранён.",
      "Progress saved.",
    ],
    [
      "offline-ready",
      "Ochilgan yo‘riqnoma internetsiz ishlaydi.",
      "Открытая инструкция работает офлайн.",
      "The unlocked guide works offline.",
    ],
    [
      "guide-ready",
      "Yo‘riqnoma tayyor.",
      "Инструкция готова.",
      "The guide is ready.",
    ],
    [
      "build-complete",
      "Yig‘ish tugadi.",
      "Сборка завершена.",
      "The build is complete.",
    ],
    [
      "first-pin",
      "Birinchi mixni toping.",
      "Найдите первый гвоздь.",
      "Find the first pin.",
    ],
    [
      "last-pin",
      "Oxirgi mixni tekshiring.",
      "Проверьте последний гвоздь.",
      "Check the final pin.",
    ],
    [
      "same-color",
      "Shu rangdagi ip bilan davom eting.",
      "Продолжайте нитью того же цвета.",
      "Continue with the same thread colour.",
    ],
    [
      "different-color",
      "Rangni yo‘riqnoma bo‘yicha almashtiring.",
      "Смените цвет согласно инструкции.",
      "Change colour as shown in the guide.",
    ],
    [
      "undo-confirmation",
      "Oxirgi tasdiq bekor qilindi.",
      "Последнее подтверждение отменено.",
      "The last confirmation was undone.",
    ],
    [
      "jump-check",
      "O‘tgan qadamni ip bilan solishtiring.",
      "Сверьте выбранный шаг с нитью.",
      "Check the selected step against the thread.",
    ],
    [
      "help",
      "Yordam ko‘rsatmasini oching.",
      "Откройте справку.",
      "Open the help instructions.",
    ],
    [
      "use-text",
      "Ekrandagi matnli ko‘rsatmaga amal qiling.",
      "Следуйте текстовой инструкции на экране.",
      "Follow the text instruction on screen.",
    ],
    [
      "voice-unavailable",
      "Ovoz mavjud emas. Matnli ko‘rsatmani o‘qing.",
      "Голос недоступен. Прочитайте текстовую инструкцию.",
      "Voice is unavailable. Read the text instruction.",
    ],
    ["ready", "Boshlashga tayyor.", "Готово к началу.", "Ready to begin."],
    [
      "check-instruction",
      "Joriy yo‘riqnomani tekshiring.",
      "Проверьте текущую инструкцию.",
      "Check the current guide.",
    ],
    ["thousand-one", "ming", "тысяча", "thousand"],
  ].map(([id, uz, ru, en]) => [id, { uz, ru, en }]),
);
export function requiredVoiceClips(lang: VoiceLanguage) {
  const clips: Record<string, string> = {};
  small[lang].forEach((text, n) => (clips[`number-${n}`] = text));
  tens[lang].forEach((text, n) => (clips[`number-${(n + 2) * 10}`] = text));
  hundreds[lang].forEach(
    (text, n) => (clips[`number-${(n + 1) * 100}`] = text),
  );
  for (const [id, text] of Object.entries(VOICE_PHRASES))
    clips[id] = text[lang];
  if (lang === "ru")
    Object.assign(clips, {
      "number-1f": "одна",
      "number-2f": "две",
      "thousand-few": "тысячи",
      "thousand-many": "тысяч",
    });
  return clips;
}
export function numberVoiceClips(lang: VoiceLanguage, n: number) {
  if (
    !VOICE_LANGUAGES.includes(lang) ||
    !Number.isSafeInteger(n) ||
    n < 0 ||
    n > 999999
  )
    throw Error("Invalid spoken number");
  const below = (v: number, feminine = false) => {
    const out: string[] = [];
    if (v >= 100) {
      out.push(`number-${Math.floor(v / 100) * 100}`);
      v %= 100;
    }
    if (v >= 20) {
      out.push(`number-${Math.floor(v / 10) * 10}`);
      v %= 10;
    }
    if (v || !out.length)
      out.push(`number-${v}${feminine && (v === 1 || v === 2) ? "f" : ""}`);
    return out;
  };
  if (n < 1000) return below(n);
  const q = Math.floor(n / 1000),
    remainder = n % 1000,
    last = q % 100,
    plural =
      lang === "ru"
        ? last >= 11 && last <= 14
          ? "many"
          : q % 10 === 1
            ? "one"
            : q % 10 >= 2 && q % 10 <= 4
              ? "few"
              : "many"
        : "one";
  return [
    ...(lang === "uz" && q === 1 ? [] : below(q, lang === "ru")),
    `thousand-${plural}`,
    ...(remainder ? below(remainder) : []),
  ];
}
export function stepVoiceClips(
  lang: VoiceLanguage,
  step: number,
  from: number,
  to: number,
  start: "first" | "color" | undefined,
) {
  return [
    "step",
    ...numberVoiceClips(lang, step),
    "from-pin",
    ...numberVoiceClips(lang, from),
    "to-pin",
    ...numberVoiceClips(lang, to),
    ...(start ? [start === "first" ? "start-knot" : "color-change"] : []),
  ];
}
