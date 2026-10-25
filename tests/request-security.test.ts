import { test, expect } from "vitest";
import {
  clientIp,
  trustedProxyIps,
  WindowBudget,
  BodyLeases,
  requestBodyLimit,
  securityConfig,
} from "../server/request-security";
test("only an explicitly trusted proxy may supply one canonical client address", () => {
  const proxies = trustedProxyIps("127.0.0.1,::1");
  expect(clientIp("127.0.0.1", { "x-real-ip": "203.0.113.20" }, proxies)).toBe(
    "203.0.113.20",
  );
  expect(
    clientIp(
      "198.51.100.9",
      { "x-real-ip": "203.0.113.20", "x-forwarded-for": "203.0.113.21" },
      proxies,
    ),
  ).toBe("198.51.100.9");
  expect(
    clientIp("::ffff:127.0.0.1", { "x-real-ip": "::ffff:c000:201" }, proxies),
  ).toBe("192.0.2.1");
});
test("body leases release once on success or error and reject excess concurrent readers", () => {
  const bodies = new BodyLeases(2),
    a = bodies.acquire(),
    b = bodies.acquire();
  expect(() => bodies.acquire()).toThrow("capacity");
  expect(bodies.active).toBe(2);
  a();
  a();
  expect(bodies.active).toBe(1);
  b();
  expect(bodies.active).toBe(0);
  const release = bodies.acquire();
  try {
    throw Error("Synthetic abort");
  } catch {
  } finally {
    release();
  }
  expect(bodies.active).toBe(0);
});
test("credential bodies are small, private photo limits preserved, invalid declared lengths fail before allocation", () => {
  expect(requestBodyLimit("/api/account/login", {})).toBe(64000);
  expect(requestBodyLimit("/api/photo-backup", {})).toBe(20000000);
  expect(requestBodyLimit("/api/orders", {})).toBe(4000000);
  expect(() =>
    requestBodyLimit("/api/account/login", { "content-length": "64001" }),
  ).toThrow("large");
  for (const v of ["-1", "1e9", "NaN", "9007199254740992"])
    expect(() =>
      requestBodyLimit("/api/orders", { "content-length": v }),
    ).toThrow();
});
test("security configuration rejects unbounded, invalid and ambiguous values before database startup", () => {
  expect(securityConfig({}).gallery).toEqual({
    maxItems: 10000,
    maxBytes: 268435456,
  });
  for (const env of [
    { GALLERY_MAX_ITEMS: "0" },
    { GALLERY_MAX_BYTES: "Infinity" },
    { GALLERY_MAX_BYTES: "10000000001" },
    { TRUSTED_PROXY_IPS: "*" },
  ])
    expect(() => securityConfig(env)).toThrow();
  const b = new WindowBudget(3);
  expect(() => b.take("read", "x", NaN, 0)).toThrow();
  expect(b.size).toBe(0);
});
test("trusted malformed or multiple forwarded addresses and invalid trust configuration fail closed", () => {
  for (const value of [
    "1.2.3.4, 5.6.7.8",
    "localhost",
    "1.2.3.4:80",
    "",
    "https://example.invalid",
  ])
    expect(() =>
      clientIp("127.0.0.1", { "x-real-ip": value }, ["127.0.0.1"]),
    ).toThrow();
  for (const value of [
    "*",
    "0.0.0.0/0",
    "example.invalid",
    ",",
    "127.0.0.1,garbage",
  ])
    expect(() => trustedProxyIps(value)).toThrow();
  expect(clientIp("198.51.100.9", { "x-real-ip": "garbage" }, [])).toBe(
    "198.51.100.9",
  );
});
test("rate scopes isolate users but global limits still cover distinct client addresses", () => {
  const b = new WindowBudget(10);
  const request = (ip: string) => {
    b.take("global-write", "all", 2, 0);
    b.take("ip-write", ip, 1, 0);
  };
  request("203.0.113.1");
  request("203.0.113.2");
  expect(() => request("203.0.113.3")).toThrow("Rate limit");
  b.take("read", "203.0.113.1", 1, 0);
  expect(() => b.take("read", "203.0.113.1", 1, 0)).toThrow();
});
test("new keys cannot exhaust limiter memory or evict active exhausted accounts", () => {
  const b = new WindowBudget(3);
  for (const ip of ["a", "b", "c"]) b.take("auth", ip, 1, 0);
  expect(() => b.take("auth", "d", 1, 0)).toThrow();
  expect(b.size).toBe(3);
  expect(() => b.take("auth", "a", 1, 0)).toThrow();
  b.take("auth", "d", 1, 60000);
  expect(b.size).toBe(1);
});
