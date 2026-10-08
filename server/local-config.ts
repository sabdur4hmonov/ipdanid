import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

// Stable local secrets prevent code/session invalidation on ordinary server restart.
// Only ignored local files contain these values; never return them from HTTP/logs.
mkdirSync("tmp/data", { recursive: true });
const file = "tmp/data/local-secrets.json";
const names = [
  "LOCAL_ADMIN_TOKEN",
  "CODE_PEPPER",
  "SANDBOX_PAYMENT_KEY",
] as const;
let saved: Record<string, string> = {};
if (existsSync(file)) {
  saved = JSON.parse(readFileSync(file, "utf8"));
  if (
    !saved ||
    names.some(
      (name) => typeof saved[name] !== "string" || saved[name].length < 32,
    )
  )
    throw new Error(
      "Incomplete private local configuration; restore its backup before starting the existing database.",
    );
}
for (const name of names) {
  saved[name] ??= randomBytes(32).toString("base64url");
  if (process.env[name] !== undefined && process.env[name]!.length < 32)
    throw new Error(`${name} must have at least 32 characters`);
  process.env[name] ??= saved[name];
}
if (!existsSync(file))
  writeFileSync(file, JSON.stringify(saved), { mode: 0o600, flag: "wx" });
