import { uzbekCyrillic } from "./uzbek-script";
export type AssemblyCommand = "next" | "previous" | "repeat" | "pause" | "play";
export type CommandLanguage = "uz" | "ru" | "en";
const aliases: Record<
  CommandLanguage,
  Record<AssemblyCommand, readonly string[]>
> = {
  en: {
    next: ["next", "next step"],
    previous: ["previous", "previous step", "back"],
    repeat: ["repeat", "repeat step"],
    pause: ["pause", "stop"],
    play: ["play", "continue"],
  },
  ru: {
    next: ["дальше", "следующий", "следующий шаг"],
    previous: ["назад", "предыдущий", "предыдущий шаг"],
    repeat: ["повтори", "повторить"],
    pause: ["пауза", "стоп"],
    play: ["продолжить", "воспроизвести"],
  },
  uz: {
    next: ["keyingi", "keyingi qadam"],
    previous: ["oldingi", "oldingi qadam"],
    repeat: ["takrorla", "qaytar"],
    pause: ["pauza", "to‘xta"],
    play: ["ijro", "davom et"],
  },
};
function normalize(text: string) {
  if (
    text.length > 80 ||
    /[\x00-\x1f\x7f-\x9f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/.test(text)
  )
    return;
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]$/, "")
    .trim();
}
function exact(
  text: string,
  language: CommandLanguage,
): AssemblyCommand | undefined {
  const normalized = normalize(text);
  if (!normalized) return;
  for (const [command, phrases] of Object.entries(aliases[language]))
    for (const phrase of phrases)
      if (
        normalized === normalize(phrase) ||
        (language === "uz" && normalized === normalize(uzbekCyrillic(phrase)))
      )
        return command as AssemblyCommand;
}
/** Conservative fixed vocabulary. There is deliberately no confirmation/purchase/unlock command. */
export function recognizedAssemblyCommand(
  value: unknown,
  language: CommandLanguage,
): AssemblyCommand | undefined {
  if (
    !["uz", "ru", "en"].includes(language) ||
    !Array.isArray(value) ||
    !value.length ||
    value.length > 3
  )
    return;
  const candidates = value as { text?: unknown; confidence?: unknown }[];
  if (
    candidates.some(
      (c) =>
        !c ||
        typeof c.text !== "string" ||
        typeof c.confidence !== "number" ||
        !Number.isFinite(c.confidence) ||
        c.confidence < 0 ||
        c.confidence > 1,
    )
  )
    return;
  if ((candidates[0].confidence as number) < 0.88) return;
  const command = exact(candidates[0].text as string, language);
  if (!command) return;
  if (
    candidates.some(
      (c) =>
        (c.confidence as number) >= 0.5 &&
        exact(c.text as string, language) !== command,
    )
  )
    return;
  return command;
}
export type CommandScope = {
  projectId: string;
  sequenceHash: string;
  current: number;
  total: number;
  language: CommandLanguage;
};
export function commandScopeKey(scope: CommandScope | undefined) {
  if (
    !scope ||
    typeof scope.projectId !== "string" ||
    !scope.projectId.trim() ||
    scope.projectId.length > 200 ||
    !/^[a-f0-9]{64}$/.test(scope.sequenceHash) ||
    !Number.isInteger(scope.current) ||
    !Number.isInteger(scope.total) ||
    scope.total < 1 ||
    scope.total > 20000 ||
    scope.current < 1 ||
    scope.current > scope.total ||
    !["uz", "ru", "en"].includes(scope.language)
  )
    return;
  return JSON.stringify([
    scope.projectId,
    scope.sequenceHash,
    scope.current,
    scope.total,
    scope.language,
  ]);
}
