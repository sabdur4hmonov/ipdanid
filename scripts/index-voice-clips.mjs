import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  VOICE_LANGUAGES,
  INSTRUCTOR_IDS,
  requiredVoiceClips,
} from "../src/core/voice-catalog.ts";
import { voiceWavDuration } from "../src/core/voice-wav.ts";
import { availableRecordedVoices } from "../src/core/recorded-voices.ts";
const manifest = { version: "recorded-instructors/1", profiles: [] },
  missing = [];
for (const id of INSTRUCTOR_IDS) {
  const profile = {
    id,
    name: id === "instructor-a" ? "Instructor A" : "Instructor B",
    clips: {},
  };
  for (const lang of VOICE_LANGUAGES) {
    const clips = {};
    for (const clipId of Object.keys(requiredVoiceClips(lang))) {
      const path = `/voices/${lang}/${id}/${clipId}.wav`,
        file = "public" + path;
      if (!fs.existsSync(file)) {
        missing.push({ id, lang, clipId });
        continue;
      }
      if (!fs.lstatSync(file).isFile())
        throw Error("A voice clip must be a regular file");
      const bytes = fs.readFileSync(file);
      clips[clipId] = {
        path,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
        durationMs: voiceWavDuration(bytes),
      };
    }
    if (Object.keys(clips).length) profile.clips[lang] = clips;
  }
  manifest.profiles.push(profile);
}
fs.mkdirSync("public/voices", { recursive: true });
fs.writeFileSync(
  "public/voices/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
const catalogs = Object.fromEntries(
    VOICE_LANGUAGES.map((lang) => [lang, requiredVoiceClips(lang)]),
  ),
  ids = [
    ...new Set(VOICE_LANGUAGES.flatMap((lang) => Object.keys(catalogs[lang]))),
  ],
  csvCell = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
fs.writeFileSync(
  "docs/VOICE_RECORDING_LIST.csv",
  "clip_id,uz,ru,en\n" +
    ids
      .map((id) =>
        [id, ...VOICE_LANGUAGES.map((lang) => catalogs[lang][id] ?? "")]
          .map(csvCell)
          .join(","),
      )
      .join("\n") +
    "\n",
);
process.stdout.write(
  JSON.stringify({
    installedLanguageVoices: availableRecordedVoices(manifest).length,
    requiredClips:
      INSTRUCTOR_IDS.length *
      VOICE_LANGUAGES.reduce(
        (n, lang) => n + Object.keys(catalogs[lang]).length,
        0,
      ),
    presentClips:
      INSTRUCTOR_IDS.length *
        VOICE_LANGUAGES.reduce(
          (n, lang) => n + Object.keys(catalogs[lang]).length,
          0,
        ) -
      missing.length,
    missingClips: missing.length,
  }) + "\n",
);
