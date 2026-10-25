function publicOrigin(value: string) {
  try {
    return new URL(value);
  } catch {
    throw Error("Invalid APP_ORIGIN");
  }
}
import { isAbsolute, resolve } from "node:path";
export function assertProductionConfig(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV !== "production") return;
  const needed = [
    "DATABASE_PATH",
    "CODE_PEPPER",
    "SANDBOX_PAYMENT_KEY",
    "ADMIN_PASSWORD_HASH",
    "APP_ORIGIN",
  ];
  for (const name of needed)
    if (!env[name]) throw Error("Missing production configuration: " + name);
  for (const name of ["CODE_PEPPER", "SANDBOX_PAYMENT_KEY"])
    if (env[name]!.length < 32)
      throw Error("Invalid production secret: " + name);
  if (
    !/^scrypt\$32768\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/.test(
      env.ADMIN_PASSWORD_HASH!,
    )
  )
    throw Error("Invalid ADMIN_PASSWORD_HASH format");
  const u = publicOrigin(env.APP_ORIGIN!);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== "/" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
  )
    throw Error("APP_ORIGIN must be the public HTTPS app origin");
  const db = env
    .DATABASE_PATH!.split(String.fromCharCode(92))
    .join("/")
    .toLowerCase();
  if (
    !isAbsolute(env.DATABASE_PATH!) ||
    db.includes("/tmp/data") ||
    db.endsWith(".env")
  )
    throw Error(
      "Production requires an explicit isolated absolute DATABASE_PATH",
    );
  const ledger = env.ERASURE_LEDGER_PATH;
  if (
    ledger &&
    (!isAbsolute(ledger) ||
      /(^|\/)tmp\/data(\/|$)/.test(
        ledger.replaceAll("\\", "/").toLowerCase(),
      ) ||
      resolve(ledger) === resolve(env.DATABASE_PATH!))
  )
    throw Error(
      "Production erasure ledger must be an isolated separate absolute path",
    );
}
export function allowedOrigin(origin: string, env: NodeJS.ProcessEnv) {
  if (
    env.NODE_ENV !== "production" &&
    env.IP_RASM_TEST_SERVER === "1" &&
    origin === env.IP_RASM_TEST_ORIGIN &&
    origin.startsWith("http://127.0.0.1:") &&
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
  )
    return true;
  return env.NODE_ENV === "production"
    ? [
        new URL(env.APP_ORIGIN!).origin,
        "http://localhost",
        "https://localhost",
        "capacitor://localhost",
      ].includes(origin)
    : [
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:4310",
        "http://127.0.0.1:5183",
        "http://127.0.0.1:4183",
        "http://localhost:5183",
        "http://localhost:4183",
        "http://127.0.0.1:4194",
        "http://127.0.0.1:4195",
        "http://localhost",
        "https://localhost",
        "capacitor://localhost",
      ].includes(origin);
}
