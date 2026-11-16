import { randomBytes, scrypt } from "node:crypto";
import { writeFileSync, existsSync, chmodSync } from "node:fs";
import { createInterface } from "node:readline/promises";
const target = process.argv[2] ?? ".env.production";
if (![".env", ".env.production"].includes(target)) throw Error("Private setup target must be .env or .env.production");
if (existsSync(target))
  throw Error("Existing private config will not be overwritten");
if (!process.stdin.isTTY || !process.stdout.isTTY)
  throw Error(
    "Interactive terminal required; secrets are never accepted on the command line",
  );
const rl = createInterface({ input: process.stdin, output: process.stdout });
const domain = (await rl.question("Domen (masalan iprasm.uz): ")).trim();
rl.close();
if (
  !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
    domain,
  )
)
  throw Error("Invalid public domain");
const password = await new Promise((resolve, reject) => {
  let value = "";
  process.stdout.write("Yangi Admin paroli (14–256 belgi, yashirin): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  const done = () => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.off("data", onData);
    process.stdout.write("\n");
  };
  const onData = (chunk) => {
    for (const c of chunk) {
      if (c === "\u0003") {
        done();
        reject(Error("Cancelled"));
        return;
      }
      if (c === "\r" || c === "\n") {
        done();
        resolve(value);
        return;
      }
      if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
      else if (c >= " ") value += c;
    }
  };
  process.stdin.on("data", onData);
});
if (password.length < 14 || password.length > 256)
  throw Error("Password must contain14–256 characters");
const salt = randomBytes(16).toString("base64url"),
  key = await new Promise((resolve, reject) =>
    scrypt(
      password,
      salt,
      32,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (e, k) => (e ? reject(e) : resolve(k)),
    ),
  );
const hash = ["scrypt", 32768, 8, 1, salt, key.toString("base64url")].join("$");
const text =
  "APP_DOMAIN=" +
  domain +
  "\nADMIN_PASSWORD_HASH=" +
  "'" +
  hash +
  "'" +
  "\nCODE_PEPPER=" +
  randomBytes(32).toString("base64url") +
  "\nSANDBOX_PAYMENT_KEY=" +
  randomBytes(32).toString("base64url") +
  "\nBACKUP_ENCRYPTION_KEY=" + randomBytes(32).toString("base64url") +
  "\nCLASSIC_TUNING=4\nFEATURES=\nPAYMENTS_SANDBOX=0\n";
writeFileSync(target, text, { mode: 0o600, flag: "wx" });
chmodSync(target, 0o600);
console.log(
  "Private environment created (0600). No passwords or keys printed. Keep the encryption key in a separate secure off-server location.",
);
