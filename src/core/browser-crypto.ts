import { sha256 } from "@noble/hashes/sha2.js";

// Plain HTTP on the private build network has random bytes but no Web Crypto
// digest, Ed25519 or UUID methods. Prefer native crypto wherever it is available.
export async function sha256Bytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (crypto.subtle)
    return new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)));
  return sha256(bytes);
}

export function randomId(): ReturnType<Crypto["randomUUID"]> {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, n => n.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
