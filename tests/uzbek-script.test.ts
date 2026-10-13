import { it, expect } from "vitest";
import { uzbekCyrillic, scriptText, baseLocale } from "../src/uzbek-script";
import { translate } from "../src/i18n";
import { customerText } from "../src/customer-i18n";
it("Uzbek digraphs and initial vowels are spelled correctly while identifiers remain intact", () => {
  expect(
    uzbekCyrillic("Yo‘q, yo‘riqnoma, ko‘z, g‘alaba, shahar, chiroy, e’tibor"),
  ).toBe("Йўқ, йўриқнома, кўз, ғалаба, шаҳар, чирой, эътибор");
  expect(
    uzbekCyrillic(
      "JSON PDF PNG QR API UZS +998901234567 https://example.com/uz source.jpg group-optical/15",
    ),
  ).toBe(
    "JSON PDF PNG QR API UZS +998901234567 https://example.com/uz source.jpg group-optical/15",
  );
});
it("static UI dictionaries use Cyrillic; Latin, Russian and English remain exact", () => {
  expect(baseLocale("uz-Cyrl")).toBe("uz");
  expect(translate("uz-Cyrl")("create")).toBe("Яратиш");
  expect(customerText("uz-Cyrl", "orders")).toBe("Буюртмалар");
  expect(scriptText("Alice / name.json", "en")).toBe("Alice / name.json");
  expect(translate("en")("create")).toBe("Create");
});
