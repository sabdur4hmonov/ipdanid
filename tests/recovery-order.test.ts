import { it, expect } from "vitest";
import { RecoveryOrder } from "../src/recovery-order";

it("completion removes a delayed checkpoint before a later job writes its own state", async () => {
  const queue = new RecoveryOrder(),
    events: string[] = [];
  let release!: () => void, stored: string | undefined;
  const delayed = new Promise<void>((r) => {
    release = r;
  });
  const old = queue.run(async () => {
    await delayed;
    stored = "old";
    events.push("old");
  });
  const done = queue.run(async () => {
    stored = undefined;
    events.push("clear");
  });
  const next = queue.run(async () => {
    stored = "next";
    events.push("next");
  });
  await Promise.resolve();
  expect(events).toEqual([]);
  release();
  await Promise.all([old, done, next]);
  expect(events).toEqual(["old", "clear", "next"]);
  expect(stored).toBe("next");
});

it("a failed checkpoint does not poison completion or the next recovery write", async () => {
  const queue = new RecoveryOrder();
  let stored = "old";
  const failed = queue.run(async () => {
    throw Error("disk full");
  });
  const done = queue.run(async () => {
    stored = "";
  });
  await expect(failed).rejects.toThrow("disk full");
  await done;
  await queue.run(async () => {
    stored = "new";
  });
  expect(stored).toBe("new");
});
