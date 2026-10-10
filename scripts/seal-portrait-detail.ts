import { readFileSync, writeFileSync } from "node:fs";
import { parseProjectFile } from "../src/core/validation";
const edits = JSON.parse(
  readFileSync("output/circle-head-240/circle-settings.json", "utf8"),
).edits;
for (const root of ["output/portrait-detail", "output/portrait-detail/white"])
  for (const name of ["control", "candidate"]) {
    const raw = JSON.parse(readFileSync(`${root}/${name}.json`, "utf8")),
      file = {
        schema: "iprasm.project/1",
        project: { ...raw.project, edits },
        evidence: raw.evidence,
      },
      text = JSON.stringify(file, null, 2);
    const parsed = await parseProjectFile(text);
    if (
      !("instruction" in parsed) ||
      parsed.instruction.sequenceHash !== raw.project.instruction.sequenceHash
    )
      throw Error("Seal drift");
    writeFileSync(`${root}/${name}-guide.json`, text, { flag: "wx" });
  }
console.log(
  "Four complete importable project envelopes sealed; every instruction/hash/progress preserved.",
);
