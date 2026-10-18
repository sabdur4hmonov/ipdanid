import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { customerApi, customerCacheNamespace } from "./customer-api";
import type { Instruction } from "./core/types";
export type BuildAccessReference = {
  sequenceHash: string;
  params: Pick<Instruction["params"], "accessPolicy">;
};
export interface BuildReceipt {
  payload: {
    version: "iprasm.build-access/1";
    accountId: string;
    sequenceHash: string;
    deviceId: string;
    unlockId: string;
    issuedAt: number;
  };
  signature: string;
}
const KEY = `${customerCacheNamespace}:build-access-v1`;
type Cache = {
  deviceId: string;
  publicKey?: JsonWebKey;
  receipts: Record<string, BuildReceipt>;
};
function normalizedKey(key: JsonWebKey) {
  if (
    key.kty !== "OKP" ||
    key.crv !== "Ed25519" ||
    typeof key.x !== "string" ||
    !/^[\w-]{43}$/.test(key.x) ||
    key.d
  )
    throw Error("build-access/key");
  return { kty: "OKP", crv: "Ed25519", x: key.x };
}
export async function verifyBuildReceipt(
  r: BuildReceipt,
  key: JsonWebKey,
  expected: { accountId: string; sequenceHash: string; deviceId: string },
) {
  try {
    const p = r?.payload;
    if (
      !p ||
      p.version !== "iprasm.build-access/1" ||
      p.accountId !== expected.accountId ||
      p.sequenceHash !== expected.sequenceHash ||
      p.deviceId !== expected.deviceId ||
      !/^[-\w]{1,100}$/.test(p.accountId) ||
      !/^[a-f0-9]{64}$/.test(p.sequenceHash) ||
      !/^[-\w]{16,80}$/.test(p.deviceId) ||
      !/^[-\w]{1,100}$/.test(p.unlockId) ||
      !Number.isSafeInteger(p.issuedAt) ||
      p.issuedAt < 0 ||
      Object.keys(p).sort().join("|") !==
        "accountId|deviceId|issuedAt|sequenceHash|unlockId|version" ||
      typeof r.signature !== "string" ||
      !/^[-\w]{86}$/.test(r.signature)
    )
      return false;
    const imported = await crypto.subtle.importKey(
        "jwk",
        normalizedKey(key),
        { name: "Ed25519" },
        false,
        ["verify"],
      ),
      bytes = Uint8Array.from(
        atob(r.signature.replace(/-/g, "+").replace(/_/g, "/") + "=="),
        (c) => c.charCodeAt(0),
      );
    return await crypto.subtle.verify(
      "Ed25519",
      imported,
      bytes,
      new TextEncoder().encode(JSON.stringify(p)),
    );
  } catch {
    return false;
  }
}
async function read(): Promise<Cache> {
  const raw = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: KEY })).value
    : localStorage.getItem(KEY);
  if (raw) {
    const c = JSON.parse(raw) as Cache;
    if (
      !/^[-\w]{16,80}$/.test(c.deviceId) ||
      !c.receipts ||
      typeof c.receipts !== "object"
    )
      throw Error("build-access/storage");
    return c;
  }
  return { deviceId: crypto.randomUUID(), receipts: {} };
}
async function write(c: Cache) {
  const value = JSON.stringify(c);
  if (value.length > 2_000_000) throw Error("build-access/storage");
  if (Capacitor.isNativePlatform()) await Preferences.set({ key: KEY, value });
  else localStorage.setItem(KEY, value);
}
let queue = Promise.resolve();
function serial<T>(fn: () => Promise<T>) {
  const result = queue.catch(() => {}).then(fn);
  queue = result.then(
    () => {},
    () => {},
  );
  return result;
}
export const buildAccess = {
  async allowed(i: BuildAccessReference) {
    if (!i.params.accessPolicy) return true;
    try {
      const c = await read(),
        r = c.receipts[i.sequenceHash];
      return (
        !!r &&
        !!c.publicKey &&
        (await verifyBuildReceipt(r, c.publicKey, {
          accountId: r.payload.accountId,
          sequenceHash: i.sequenceHash,
          deviceId: c.deviceId,
        }))
      );
    } catch {
      return false;
    }
  },
  async login(code: string, attach = false) {
    await customerApi.restore();
    const s = await customerApi.request<{
      id: string;
      token: string;
      credits: number;
    }>(
      "/account/kit",
      { code, attach },
      attach ? customerApi.session?.token : "",
    );
    await customerApi.retain({ id: s.id, token: s.token });
    return s;
  },
  async account() {
    await customerApi.restore();
    return customerApi.request<{ id: string; credits: number }>(
      "/builds/account",
    );
  },
  async unlock(i: BuildAccessReference) {
    return serial(async () => {
      await customerApi.restore();
      if (!customerApi.session) throw Error("build-access/login");
      const c = await read(),
        key = normalizedKey(
          await customerApi.request<JsonWebKey>("/builds/key", undefined, ""),
        );
      if (
        c.publicKey &&
        JSON.stringify(normalizedKey(c.publicKey)) !== JSON.stringify(key)
      )
        throw Error("build-access/key");
      await crypto.subtle.importKey("jwk", key, { name: "Ed25519" }, false, [
        "verify",
      ]);
      c.publicKey = key;
      await write(c);
      const response = await customerApi.request<{
        receipt: BuildReceipt;
        credits: number;
        duplicate: boolean;
      }>("/builds/unlock", {
        sequenceHash: i.sequenceHash,
        deviceId: c.deviceId,
        requestKey: `unlock-${i.sequenceHash}`,
      });
      if (
        !(await verifyBuildReceipt(response.receipt, key, {
          accountId: customerApi.session.id,
          sequenceHash: i.sequenceHash,
          deviceId: c.deviceId,
        }))
      )
        throw Error("build-access/signature");
      c.receipts[i.sequenceHash] = response.receipt;
      await write(c);
      window.dispatchEvent(new Event("iprasm-build-access"));
      return response;
    });
  },
};
