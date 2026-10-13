// A finished job's deletion must not be overtaken by an older checkpoint write.
// A failed write must not block recovery for subsequent jobs.
export class RecoveryOrder {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation);
    this.tail = result.catch(() => undefined);
    return result;
  }
}
