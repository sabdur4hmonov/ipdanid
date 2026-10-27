// Authenticated, bounded-memory private code export. Never used by the browser.
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";
import {
  openSync,
  closeSync,
  writeSync,
  readSync,
  fstatSync,
  fsyncSync,
} from "node:fs";
import type { InventoryRow } from "./kit-inventory";
const MAGIC = Buffer.from("IPKIT01\n");
export function writeAll(fd: number, bytes: Uint8Array) {
  let at = 0;
  while (at < bytes.length) {
    const n = writeSync(fd, bytes, at, bytes.length - at);
    if (!n) throw Error("Private export write failed");
    at += n;
  }
}
export function encryptedKitWriter(
  path: string,
  key: Buffer,
  row: InventoryRow,
) {
  if (key.length !== 32 || row.status !== "staging")
    throw Error("Invalid private export setup");
  const iv = randomBytes(12),
    meta = {
      version: 1,
      inventory: row.id,
      count: row.total,
      quota: 3,
      profile: row.profile,
      iv: iv.toString("base64url"),
    },
    json = Buffer.from(JSON.stringify(meta)),
    length = Buffer.alloc(4);
  length.writeUInt32BE(json.length);
  const header = Buffer.concat([MAGIC, length, json]),
    fd = openSync(path, "wx", 0o600),
    cipher = createCipheriv("aes-256-gcm", key, iv),
    digest = createHash("sha256");
  cipher.setAAD(header);
  let count = 0,
    closed = false;
  const write = (b: Buffer) => {
    writeAll(fd, b);
    digest.update(b);
  };
  try {
    write(header);
  } catch (error) {
    closeSync(fd);
    throw error;
  }
  return {
    append(
      codes: {
        code: string;
        quota: number;
        creditDays: number;
        expiresAt: number | null;
      }[],
    ) {
      if (closed || count + codes.length > row.total)
        throw Error("Private export bounds");
      const lines = codes
        .map((c) => {
          if (
            !/^[-\w]{32}$/.test(c.code) ||
            c.quota !== 3 ||
            c.creditDays !== 0 ||
            c.expiresAt !== null
          )
            throw Error("Invalid private code row");
          return ++count + "," + c.code + ",3\n";
        })
        .join("");
      write(cipher.update(Buffer.from(lines)));
    },
    finish() {
      if (closed || count !== row.total)
        throw Error("Private export incomplete");
      write(cipher.final());
      write(cipher.getAuthTag());
      fsyncSync(fd);
      closeSync(fd);
      closed = true;
      return {
        count,
        sha256: digest.digest("hex"),
        format: "IPKIT01/AES-256-GCM",
      };
    },
    abort() {
      if (!closed) {
        closeSync(fd);
        closed = true;
      }
    },
  };
}

// Authenticate the complete file before emitting any plaintext, then recheck the
// tag on the second bounded pass. Consumers must not publish partial results.
export function readEncryptedKits(
  path: string,
  key: Buffer,
  consume: (ordinal: number, code: string) => void,
) {
  if (key.length !== 32) throw Error("Invalid private export key");
  const fd = openSync(path, "r");
  try {
    const prefix = Buffer.alloc(12);
    if (
      readSync(fd, prefix, 0, 12, 0) !== 12 ||
      !prefix.subarray(0, 8).equals(MAGIC)
    )
      throw Error("Invalid private export header");
    const length = prefix.readUInt32BE(8),
      size = fstatSync(fd).size;
    if (length < 1 || length > 4096 || size < 12 + length + 16)
      throw Error("Invalid private export size");
    const json = Buffer.alloc(length);
    if (readSync(fd, json, 0, length, 12) !== length)
      throw Error("Invalid private export header");
    const meta = JSON.parse(json.toString("utf8")),
      iv = Buffer.from(String(meta.iv), "base64url");
    if (
      meta.version !== 1 ||
      meta.quota !== 3 ||
      !Number.isSafeInteger(meta.count) ||
      meta.count < 1 ||
      meta.count > 1000000 ||
      !/^inventory-[a-f0-9]{64}$/.test(meta.inventory) ||
      typeof meta.profile !== "string" ||
      !/^[a-z0-9][a-z0-9_-]{0,99}$/.test(meta.profile) ||
      iv.length !== 12 ||
      iv.toString("base64url") !== meta.iv
    )
      throw Error("Invalid private export metadata");
    const tag = Buffer.alloc(16);
    if (readSync(fd, tag, 0, 16, size - 16) !== 16)
      throw Error("Invalid private export tag");
    const header = Buffer.concat([prefix, json]),
      start = 12 + length,
      end = size - 16,
      buffer = Buffer.alloc(65536);
    function pass(output?: (bytes: Buffer) => void) {
      const d = createDecipheriv("aes-256-gcm", key, iv);
      d.setAAD(header);
      d.setAuthTag(tag);
      for (let at = start; at < end;) {
        const n = readSync(
          fd,
          buffer,
          0,
          Math.min(buffer.length, end - at),
          at,
        );
        if (!n) throw Error("Private export truncated");
        const b = d.update(buffer.subarray(0, n));
        output?.(b);
        at += n;
      }
      const last = d.final();
      output?.(last);
    }
    pass(); // no plaintext consumer called until entire authentication succeeds
    let pending = "",
      count = 0;
    pass((bytes) => {
      pending += bytes.toString("ascii");
      let newline: number;
      while ((newline = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, newline);
        pending = pending.slice(newline + 1);
        if (line.length > 70) throw Error("Invalid private export row");
        const match = /^(\d+),([-\w]{32}),3$/.exec(line);
        if (!match || Number(match[1]) !== count + 1 || count >= meta.count)
          throw Error("Invalid private export order");
        consume(++count, match[2]);
      }
      if (pending.length > 70) throw Error("Invalid private export row");
    });
    if (pending || count !== meta.count)
      throw Error("Private export incomplete");
    return {
      inventory: String(meta.inventory),
      count,
      profile: String(meta.profile),
    };
  } finally {
    closeSync(fd);
  }
}
