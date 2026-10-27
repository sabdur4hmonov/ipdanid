import { Worker } from "node:worker_threads";
import { DomainError } from "./store";
import { GenerationStore } from "./generation-store";
import type { PreparedGeneration } from "./generation-recipe";
export class GenerationQueue {
  private pending: { id: string; recipe: PreparedGeneration }[] = [];
  private active?: {
    id: string;
    worker: Worker;
    timer: ReturnType<typeof setTimeout>;
    retiring?: boolean;
    completion?: Promise<void>;
  };
  private stopped = false;
  constructor(
    readonly store: GenerationStore,
    private deadline = 45000,
  ) {}
  get size() {
    return this.pending.length + (this.active ? 1 : 0);
  }
  available() {
    if (this.stopped || this.size >= 2)
      throw new DomainError("Generation service is busy; retry later", 503);
  }
  enqueue(id: string, recipe: PreparedGeneration) {
    this.available();
    this.pending.push({ id, recipe });
    this.next();
  }
  cancel(id: string) {
    this.pending = this.pending.filter((p) => p.id !== id);
    if (this.active?.id === id && !this.active.retiring) {
      const current = this.active;
      current.retiring = true;
      clearTimeout(current.timer);
      void current.worker.terminate().finally(() => {
        if (this.active === current) this.active = undefined;
        this.next();
      });
    }
  }
  private next() {
    if (this.stopped || this.active) return;
    const next = this.pending.shift();
    if (!next) return;
    if (!this.store.running(next.id)) {
      this.next();
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker(new URL("./generation-thread.mjs", import.meta.url), {
        workerData: {
          options: next.recipe.options,
          enhanced: next.recipe.enhanced,
        },
        resourceLimits: { maxOldGenerationSizeMb: 512, stackSizeMb: 4 },
      });
    } catch {
      this.store.fail(next.id);
      this.next();
      return;
    }
    const timer = setTimeout(() => {
      this.store.fail(next.id);
      this.cancel(next.id);
    }, this.deadline);
    this.active = { id: next.id, worker, timer };
    let completing = false,
      lastProgress = 0;
    const finish = () => {
      if (this.active?.worker !== worker || this.active.retiring) return;
      const current = this.active;
      current.retiring = true;
      clearTimeout(timer);
      void worker.terminate().finally(() => {
        if (this.active === current) this.active = undefined;
        this.next();
      });
    };
    worker.on("message", (msg) => {
      if (this.active?.worker !== worker || this.active.retiring || completing)
        return;
      if (msg.type === "progress") {
        if (performance.now() - lastProgress > 250) {
          this.store.progress(next.id, msg.fraction);
          lastProgress = performance.now();
        }
      } else if (msg.type === "done") {
        completing = true;
        this.active.completion = (async () => {
          try {
            await this.store.complete(next.id, msg.instruction, msg.png);
          } catch (error) {
            if (process.env.IP_RASM_TEST_SERVER === "1")
              console.error(
                JSON.stringify({
                  diagnostic: "generation-completion",
                  name: error instanceof Error ? error.name : "Error",
                  frames:
                    error instanceof Error
                      ? String(error.stack)
                          .split("\n")
                          .slice(1)
                          .filter((s) => /^\s+at\s/.test(s))
                          .slice(0, 4)
                      : [],
                }),
              );
            this.store.fail(next.id);
          } finally {
            finish();
          }
        })();
      } else if (msg.type === "error") {
        this.store.fail(next.id);
        finish();
      }
    });
    worker.once("error", (error) => {
      if (process.env.IP_RASM_TEST_SERVER === "1")
        console.error(
          JSON.stringify({
            diagnostic: "generation-bootstrap",
            name: error.name,
            frames: String(error.stack)
              .split("\n")
              .slice(1)
              .filter((s) => /^\s+at\s/.test(s))
              .slice(0, 4),
          }),
        );
      this.store.fail(next.id);
      finish();
    });
    worker.once("exit", () => {
      if (!completing && this.active?.worker === worker) {
        this.store.fail(next.id);
        finish();
      }
    });
  }
  async close() {
    this.stopped = true;
    for (const item of this.pending) this.store.fail(item.id);
    this.pending = [];
    if (this.active) {
      const current = this.active;
      this.active = undefined;
      clearTimeout(current.timer);
      this.store.fail(current.id);
      await current.worker.terminate();
      await current.completion;
    }
  }
}
