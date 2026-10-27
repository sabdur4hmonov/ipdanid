// Explicit owner printing export; never logs codes or accepts a web-served path.
import {
  readFileSync,
  openSync,
  closeSync,
  fsyncSync,
  copyFileSync,
  unlinkSync,
  constants,
} from "node:fs";
import { join } from "node:path";
import { privateKitDirectory } from "./private-kit-paths";
import { readEncryptedKits, writeAll } from "../server/kit-export";
const args = Object.fromEntries(
  process.argv.slice(2).map((s) => {
    const at = s.indexOf("=");
    return [s.slice(0, at), s.slice(at + 1)];
  }),
);
let fd: number | undefined,
  temporary: string | undefined,
  created = false;
try {
  if (
    Object.keys(args).some((k) => !["--bundle", "--file"].includes(k)) ||
    !args["--bundle"]
  )
    throw Error("Private bundle is required");
  const dir = privateKitDirectory(args["--bundle"], "existing"),
    name = args["--file"] ?? "print-codes.csv";
  if (!/^[a-z0-9_-]+\.csv$/.test(name)) throw Error("Invalid private CSV name");
  const key = Buffer.from(
      JSON.parse(readFileSync(join(dir, "private-keys.json"), "utf8"))
        .EXPORT_KEY,
      "base64url",
    ),
    output = join(dir, name);
  temporary = output + ".partial";
  fd = openSync(temporary, "wx", 0o600);
  created = true;
  writeAll(fd, Buffer.from("ordinal,code,full_builds\n"));
  const result = readEncryptedKits(
    join(dir, "kit-codes.encrypted"),
    key,
    (ordinal, code) =>
      writeAll(fd!, Buffer.from(ordinal + "," + code + ",3\n")),
  );
  fsyncSync(fd);
  closeSync(fd);
  fd = undefined;
  copyFileSync(temporary, output, constants.COPYFILE_EXCL);
  unlinkSync(temporary);
  created = false;
  console.log(
    JSON.stringify({
      count: result.count,
      privateCsv: output,
      valuesPrinted: false,
    }),
  );
} catch {
  if (fd !== undefined)
    try {
      closeSync(fd);
    } catch {}
  if (created && temporary)
    try {
      unlinkSync(temporary);
    } catch {}
  console.error(
    "Private printing export failed; no code values printed and existing files were not overwritten.",
  );
  process.exitCode = 1;
}
