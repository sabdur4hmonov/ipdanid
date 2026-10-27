import { test, expect, vi, afterEach } from "vitest";
import type { PreparedGeneration } from "../server/generation-recipe";
import type { GenerationStore } from "../server/generation-store";
const state = vi.hoisted(() => ({ workers: [] as any[] }));
vi.mock("node:worker_threads", async () => {
  const { EventEmitter } = await import("node:events");
  return {
    Worker: class extends EventEmitter {
      done!: () => void;
      termination = new Promise<number>((r) => {
        this.done = () => r(0);
      });
      terminate = vi.fn(() => this.termination);
      constructor(..._args: unknown[]) {
        super();
        state.workers.push(this);
      }
    },
  };
});
import { GenerationQueue } from "../server/generation-queue";
afterEach(() => {
  state.workers = [];
  vi.useRealTimers();
});
function setup(deadline = 45000) {
  const store = {
    running: vi.fn((_id: string) => true),
    fail: vi.fn(),
    progress: vi.fn(),
    complete: vi.fn(async () => true),
  };
  return {
    store,
    queue: new GenerationQueue(store as unknown as GenerationStore, deadline),
  };
}
const recipe = { options: {}, enhanced: false } as PreparedGeneration;
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}
test("cancellation holds the single worker slot until termination; late output cannot complete or start a parallel fit", async () => {
  const { queue, store } = setup();
  queue.enqueue("first", recipe);
  queue.enqueue("second", recipe);
  expect(state.workers).toHaveLength(1);
  expect(() => queue.enqueue("third", recipe)).toThrow("busy");
  queue.cancel("first");
  expect(queue.size).toBe(2);
  expect(() => queue.enqueue("third", recipe)).toThrow("busy");
  state.workers[0].emit("message", {
    type: "done",
    instruction: {},
    png: new Uint8Array(),
  });
  expect(store.complete).not.toHaveBeenCalled();
  state.workers[0].done();
  await flush();
  expect(state.workers).toHaveLength(2);
  expect(store.running.mock.calls.map((c) => c[0])).toEqual([
    "first",
    "second",
  ]);
  const close = queue.close();
  state.workers[1].done();
  await close;
});
test("hard deadline fails and terminates only its own job; queued work waits for retirement", async () => {
  vi.useFakeTimers();
  const { queue, store } = setup(100);
  queue.enqueue("first", recipe);
  queue.enqueue("second", recipe);
  await vi.advanceTimersByTimeAsync(100);
  expect(store.fail).toHaveBeenCalledWith("first");
  expect(state.workers[0].terminate).toHaveBeenCalledTimes(1);
  expect(state.workers).toHaveLength(1);
  state.workers[0].done();
  await flush();
  expect(state.workers).toHaveLength(2);
  const close = queue.close();
  state.workers[1].done();
  await close;
});
test("shutdown drains an in-flight validation before its caller can close SQLite", async () => {
  const { queue, store } = setup();
  let release!: () => void;
  store.complete.mockImplementation(
    () =>
      new Promise<boolean>((resolve) => {
        release = () => resolve(true);
      }),
  );
  queue.enqueue("first", recipe);
  state.workers[0].emit("message", {
    type: "done",
    instruction: {},
    png: new Uint8Array(),
  });
  let closed = false;
  const closing = queue.close().then(() => {
    closed = true;
  });
  state.workers[0].done();
  await flush();
  expect(closed).toBe(false);
  release();
  await closing;
  expect(closed).toBe(true);
});
