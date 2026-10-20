import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { generate } from "../src/core/engine";
import { createProfile } from "../src/core/geometry";
import { checkedCommissionArt } from "../src/commission-art";
import { commissionText } from "../src/commission-i18n";
it("browser full-art digest matches server bytes and rejects a different valid guide or altered identity", async () => {
  const instruction = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(90),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 40,
    mode: "dark",
  });
  const artHash = createHash("sha256")
      .update(JSON.stringify(instruction))
      .digest("hex"),
    identity = { artHash, sequenceHash: instruction.sequenceHash };
  expect(
    await checkedCommissionArt({ artHash, instruction }, identity),
  ).toEqual(instruction);
  await expect(
    checkedCommissionArt({ artHash: "a".repeat(64), instruction }, identity),
  ).rejects.toThrow(/identity/);
  await expect(
    checkedCommissionArt(
      { artHash, instruction },
      { ...identity, sequenceHash: "b".repeat(64) },
    ),
  ).rejects.toThrow(/identity/);
  await expect(
    checkedCommissionArt(
      { artHash, instruction: { ...instruction, id: crypto.randomUUID() } },
      identity,
    ),
  ).rejects.toThrow(/identity/);
});
it("commission customer and manufacturing copy is available in all four locales", () => {
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const)
    for (const key of [
      "title",
      "consent",
      "approve",
      "confirm",
      "requested",
      "accepted",
      "queued",
      "making",
      "ready",
      "pdf",
      "tracking",
      "total",
    ] as const)
      expect(commissionText(locale, key)).toBeTruthy();
  expect(commissionText("uz-Cyrl", "title")).toContain("Тайёр");
});
