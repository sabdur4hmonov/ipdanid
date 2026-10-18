import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
export type CraftProject<T> = {
  id: string;
  name: string;
  guide: T;
  confirmed: number;
  revision: number;
};
const queues = new Map<string, Promise<unknown>>();
export function localCraftStore<T extends { sequenceHash: string }>(
  kind: string,
  validate: (g: T) => Promise<T>,
  length: (g: T) => number,
) {
  if (!/^[a-z-]{1,30}$/.test(kind)) throw Error("craft/storage");
  const key = `iprasm.craft.${kind}.v1`;
  async function check(p: CraftProject<T>) {
    if (
      !p ||
      !/^[a-f0-9-]{36}$/.test(p.id) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 80 ||
      !Number.isSafeInteger(p.confirmed) ||
      p.confirmed < 0 ||
      !Number.isSafeInteger(p.revision) ||
      p.revision < 0
    )
      throw Error("craft/storage");
    await validate(p.guide);
    if (p.confirmed > length(p.guide)) throw Error("craft/storage");
    return p;
  }
  async function read(): Promise<CraftProject<T>[]> {
    const raw = Capacitor.isNativePlatform()
      ? (await Preferences.get({ key })).value
      : localStorage.getItem(key);
    if (!raw) return [];
    if (raw.length > 8_000_000) throw Error("craft/storage");
    const all = JSON.parse(raw) as CraftProject<T>[];
    if (
      !Array.isArray(all) ||
      all.length > 5 ||
      new Set(all.map((p) => p.id)).size !== all.length
    )
      throw Error("craft/storage");
    for (const p of all) await check(p);
    return all;
  }
  async function mutate(
    fn: (all: CraftProject<T>[]) => Promise<CraftProject<T>[]>,
  ) {
    const work = async () => {
      const all = await fn(await read()),
        value = JSON.stringify(all);
      if (all.length > 5 || value.length > 8_000_000)
        throw Error("craft/limit");
      if (Capacitor.isNativePlatform()) await Preferences.set({ key, value });
      else localStorage.setItem(key, value);
      return all;
    };
    const run = async () =>
      !Capacitor.isNativePlatform() && navigator.locks
        ? await navigator.locks.request(key, work)
        : await work();
    const result = (queues.get(key) ?? Promise.resolve())
      .catch(() => {})
      .then(run);
    queues.set(
      key,
      result.then(
        () => {},
        () => {},
      ),
    );
    return result;
  }
  return {
    read,
    check,
    save: (p: CraftProject<T>, expected?: number) =>
      mutate(async (all) => {
        await check(p);
        const old = all.find((v) => v.id === p.id);
        if (
          old
            ? expected !== old.revision ||
              p.revision !== expected + 1 ||
              old.guide.sequenceHash !== p.guide.sequenceHash
            : expected !== undefined
        )
          throw Error("craft/conflict");
        return [p, ...all.filter((v) => v.id !== p.id)];
      }),
    remove: (id: string, revision: number) =>
      mutate(async (all) => {
        const p = all.find((v) => v.id === id);
        if (!p || p.revision !== revision) throw Error("craft/conflict");
        return all.filter((v) => v.id !== id);
      }),
  };
}
