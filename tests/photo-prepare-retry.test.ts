import { test, expect, vi, afterEach } from "vitest";
import { preparePersonPhoto, disposePhotoAnalysis } from "../src/photo-prepare";
afterEach(() => {
  disposePhotoAnalysis();
  vi.unstubAllGlobals();
});
function setup(
  mode: "once" | "always" | "semantic" | "abort",
  controller = new AbortController(),
) {
  const instances: Mock[] = [];
  class Mock {
    onmessage?: (e: never) => void;
    onerror?: () => void;
    terminate = vi.fn();
    constructor() {
      instances.push(this);
    }
    postMessage(m: { id: number; dispose?: boolean }) {
      if (m.dispose) return;
      queueMicrotask(() => {
        if (mode === "abort") controller.abort();
        if (
          mode === "always" ||
          mode === "abort" ||
          (mode === "once" && instances.indexOf(this) === 0)
        )
          this.onerror?.();
        else
          this.onmessage?.({
            data:
              mode === "semantic"
                ? { id: m.id, error: "No reliable person mask" }
                : {
                    id: m.id,
                    faces: [],
                    mask: {
                      width: 1,
                      height: 1,
                      values: new Float32Array([1]),
                    },
                  },
          } as never);
      });
    }
  }
  vi.stubGlobal("Worker", Mock);
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ close: vi.fn() })),
  );
  return { instances, controller };
}
test("one startup crash recreates local worker and returns only real second analysis", async () => {
  const { instances, controller } = setup("once");
  const r = await preparePersonPhoto(
    {} as HTMLCanvasElement,
    controller.signal,
  );
  expect(instances).toHaveLength(2);
  expect(instances[0].terminate).toHaveBeenCalled();
  expect(r.mask.values[0]).toBe(1);
});
test("two startup failures stop rather than looping indefinitely", async () => {
  const { instances, controller } = setup("always");
  await expect(
    preparePersonPhoto({} as HTMLCanvasElement, controller.signal),
  ).rejects.toThrow("Local photo worker unavailable");
  expect(instances).toHaveLength(2);
});
test("semantic/model rejection never becomes a retry or fake face", async () => {
  const { instances, controller } = setup("semantic");
  await expect(
    preparePersonPhoto({} as HTMLCanvasElement, controller.signal),
  ).rejects.toThrow("No reliable person mask");
  expect(instances).toHaveLength(1);
});
test("superseded photo abort cannot start a replacement worker", async () => {
  const { instances, controller } = setup("abort");
  await expect(
    preparePersonPhoto({} as HTMLCanvasElement, controller.signal),
  ).rejects.toHaveProperty("name", "AbortError");
  expect(instances).toHaveLength(1);
});
