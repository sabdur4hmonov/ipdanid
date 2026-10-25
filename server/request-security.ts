import type { IncomingHttpHeaders } from "node:http";
import { isIP } from "node:net";
import { DomainError } from "./store";
function canonicalIp(value: string) {
  if (!isIP(value) || value.includes("%"))
    throw new DomainError("Invalid proxy client address");
  if (isIP(value) === 4) return value;
  const normalized = new URL(`http://[${value}]/`).hostname
    .slice(1, -1)
    .toLowerCase();
  const mapped = /^::ffff:([a-f0-9]+):([a-f0-9]+)$/.exec(normalized);
  if (mapped) {
    const n = (parseInt(mapped[1], 16) * 65536 + parseInt(mapped[2], 16)) >>> 0;
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  }
  return normalized;
}
export function trustedProxyIps(value = "") {
  if (!value) return [];
  const ips = value.split(",").map((v) => canonicalIp(v.trim()));
  if (ips.length > 16) throw Error("Too many trusted proxy addresses");
  return [...new Set(ips)];
}
export function clientIp(
  peer: string | undefined,
  headers: IncomingHttpHeaders,
  trusted: readonly string[] = [],
) {
  const address = peer ? canonicalIp(peer) : "unknown";
  if (!trusted.includes(address) || headers["x-real-ip"] === undefined)
    return address;
  const supplied = headers["x-real-ip"];
  if (
    typeof supplied !== "string" ||
    supplied.length > 64 ||
    supplied !== supplied.trim()
  )
    throw new DomainError("Invalid proxy client address");
  return canonicalIp(supplied);
}
export function securityConfig(env: NodeJS.ProcessEnv) {
  function integer(name: string, fallback: number, maximum: number) {
    const raw = env[name];
    if (raw === undefined || raw === "") return fallback;
    if (
      !/^[1-9]\d*$/.test(raw) ||
      !Number.isSafeInteger(Number(raw)) ||
      Number(raw) > maximum
    )
      throw Error("Invalid security configuration: " + name);
    return Number(raw);
  }
  return {
    proxies: trustedProxyIps(env.TRUSTED_PROXY_IPS),
    gallery: {
      maxItems: integer("GALLERY_MAX_ITEMS", 10000, 100000),
      maxBytes: integer("GALLERY_MAX_BYTES", 268435456, 10000000000),
    },
  };
}
export class WindowBudget {
  private entries = new Map<string, { start: number; count: number }>();
  private nextPrune = 0;
  constructor(
    private capacity = 10000,
    private windowMs = 60000,
  ) {
    if (
      !Number.isSafeInteger(capacity) ||
      capacity < 1 ||
      capacity > 1000000 ||
      !Number.isSafeInteger(windowMs) ||
      windowMs < 1
    )
      throw Error("Invalid request limiter configuration");
  }
  get size() {
    return this.entries.size;
  }
  take(scope: string, key: string, limit: number, now = Date.now()) {
    if (
      !/^[a-z][a-z0-9-]{0,31}$/.test(scope) ||
      typeof key !== "string" ||
      !key.length ||
      key.length > 128 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      !Number.isSafeInteger(now) ||
      now < 0
    )
      throw new DomainError("Invalid request budget");
    if (now >= this.nextPrune) {
      for (const [id, row] of this.entries)
        if (now - row.start >= this.windowMs) this.entries.delete(id);
      this.nextPrune = now + 1000;
    }
    const id = scope + ":" + key;
    if (!this.entries.has(id) && this.entries.size >= this.capacity)
      throw new DomainError("Request capacity exceeded; retry later", 429);
    const old = this.entries.get(id),
      row =
        old && now - old.start < this.windowMs ? old : { start: now, count: 0 };
    row.count++;
    this.entries.set(id, row);
    if (row.count > limit)
      throw new DomainError("Rate limit exceeded; retry later", 429);
  }
}
export class BodyLeases {
  private count = 0;
  constructor(private maximum = 16) {
    if (!Number.isSafeInteger(maximum) || maximum < 1)
      throw Error("Invalid body capacity");
  }
  get active() {
    return this.count;
  }
  acquire() {
    if (this.count >= this.maximum)
      throw new DomainError("Request body capacity is busy; retry later", 503);
    ++this.count;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        --this.count;
      }
    };
  }
}
export function requestBodyLimit(path: string, headers: IncomingHttpHeaders) {
  const limit =
    path === "/api/photo-backup"
      ? 20000000
      : /^\/api\/(?:account\/|admin\/login$|session$|trial\/claim$)/.test(path)
        ? 64000
        : 4000000;
  const declared = headers["content-length"];
  if (declared !== undefined) {
    if (
      typeof declared !== "string" ||
      !/^\d+$/.test(declared) ||
      !Number.isSafeInteger(Number(declared))
    )
      throw new DomainError("Invalid request length");
    if (Number(declared) > limit)
      throw new DomainError("Request too large", 413);
  }
  return limit;
}
