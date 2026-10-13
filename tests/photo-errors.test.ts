import { expect, it } from "vitest";
import { customerError } from "../src/errors";
it("configuration advice remains specific and localized without leaking arbitrary worker errors", () => {
  expect(customerError('local-input/missing','en')).toContain('Exact calculation photo');
  expect(customerError('Error: local-input/missing','uz')).toContain('Aynan hisoblangan');
  expect(customerError("portrait-choice/off", "uz")).toContain(
    "portret hisoblash o‘chiq",
  );
  expect(customerError("portrait-choice/off", "ru")).toContain("выключен");
  expect(customerError("portrait-config/group", "en")).toContain("160/192");
  expect(customerError("portrait-config/group", "uz-Cyrl")).toContain("пиксел");
  expect(customerError("portrait-config/basis", "ru")).toContain("сохранены");
  expect(
    customerError("Error: Review every person's facial regions", "en"),
  ).toContain("every person's");
  expect(customerError("unknown PRIVATE_TOKEN=secret", "en")).not.toContain(
    "secret",
  );
});
