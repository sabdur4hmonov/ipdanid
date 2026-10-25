import { test, expect } from "vitest";
import {
  registerAssemblyInput,
  cancelAssemblyInputs,
} from "../src/assembly-input-cancellation";
test("manual input synchronously cancels all active tools; one failure cannot retain another listener", () => {
  let a = 0,
    b = 0;
  const removeA = registerAssemblyInput(() => {
      a++;
      throw Error("Synthetic listener failure");
    }),
    removeB = registerAssemblyInput(() => b++);
  try {
    cancelAssemblyInputs();
    expect([a, b]).toEqual([1, 1]);
    removeA();
    cancelAssemblyInputs();
    expect([a, b]).toEqual([1, 2]);
  } finally {
    removeA();
    removeB();
  }
  cancelAssemblyInputs();
  expect(b).toBe(2);
});
