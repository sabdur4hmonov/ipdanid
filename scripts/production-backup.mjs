// Production archives contain the application DB (including kit_signer), privacy
// journal and required runtime secrets together. The encryption key is EXTERNAL.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync, lstatSync, renameSync, chmodSync, rmSync, unlinkSync, copyFileSync, openSync, readSync, closeSync } from "node:fs";
import { resolve, join, dirname, sep } from "node:path";
import { tmpdir } from "node:os";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { backupSqlite } from "./backup-sqlite.mjs";
import { assertTestDatabasePath } from "../server/test-safety.mjs";
import { uploadBackup } from "./s3-backup.mjs";

const MAGIC = Buffer.from("IPRASM-PRODUCTION-BACKUP/1\n"), MAX_BYTES = 2 * 1024 ** 3;
const required = ["CODE_PEPPER", "SANDBOX_PAYMENT_KEY", "ADMIN_PASSWORD_HASH"];
export function encryptionKey(env) {
  const raw = env.BACKUP_ENCRYPTION_KEY ?? "", key = Buffer.from(raw, "base64url");
  if (key.length !== 32 || key.toString("base64url") !== raw) throw Error("A separate 32-byte BACKUP_ENCRYPTION_KEY is required");
  return key;
}
function secrets(env) {
  if (required.some(k => typeof env[k] !== "string" || env[k].length < 16)) throw Error("Backup requires the matching production runtime secrets");
  return Object.fromEntries([...required, "APP_DOMAIN", "CLASSIC_TUNING", "FEATURES"].filter(k => env[k] !== undefined).map(k => [k, env[k]]));
}
function scratch() { const root = resolve(tmpdir()), path = mkdtempSync(join(root, "iprasm-production-")); chmodSync(path, 0o700); return { path, remove() { if (!path.startsWith(root + sep) || !lstatSync(path).isDirectory() || lstatSync(path).isSymbolicLink()) throw Error("Invalid scratch cleanup"); rmSync(path, {recursive:true}); } }; }
async function digest(file) { const h = createHash("sha256"); for await (const chunk of createReadStream(file)) h.update(chunk); return h.digest("hex"); }
function checkSqlite(file, signer = false) {
  const db = new DatabaseSync(file, { readOnly:true });
  try {
    if (db.prepare("PRAGMA quick_check").get().quick_check !== "ok") throw Error("Snapshot integrity failed");
    if (signer && !db.prepare("SELECT id FROM kit_signer WHERE id=1 AND length(private_jwk)>0 AND length(public_jwk)>0").get()) throw Error("Kit signer is missing from backup DB");
  } finally { db.close(); }
}
function range(file, start, end) { return createReadStream(file, {start, end}); }
function bytesAt(file, start, length) { const fd=openSync(file,"r"), b=Buffer.alloc(length); try { if(readSync(fd,b,0,length,start)!==length)throw Error("Truncated archive");return b; }finally{closeSync(fd);} }
export async function createProductionBackup(env = process.env, kind = "daily", now = new Date()) {
  if (!["daily","predeploy"].includes(kind) || !Number.isFinite(+now)) throw Error("Invalid backup kind/date");
  const key = encryptionKey(env), privateSecrets = secrets(env);
  if (!env.BACKUP_DIR || !env.ERASURE_LEDGER_PATH) throw Error("Explicit backup directory and privacy journal required");
  assertTestDatabasePath(join(env.BACKUP_DIR,"backup.sqlite"));
  const work=scratch(); let part, partOwned=false;
  try {
    // DB first, journal second: later erasure intents must not disappear on restore.
    const app=await backupSqlite(env.DATABASE_PATH,work.path,now), ledger=await backupSqlite(env.ERASURE_LEDGER_PATH,work.path,now,"erasure");
    checkSqlite(app.path,true); checkSqlite(ledger.path);
    const files=[{name:"iprasm.sqlite",source:app.path},{name:"erasure-intents.sqlite",source:ledger.path}];
    const manifest={version:"iprasm.production-backup/1",createdAt:now.toISOString(),secrets:privateSecrets,files:await Promise.all(files.map(async f=>({name:f.name,bytes:statSync(f.source).size,sha256:await digest(f.source)})))};
    if (manifest.files.reduce((n,f)=>n+f.bytes,0)>MAX_BYTES)throw Error("Backup exceeds the 2 GiB supported payload; configure a larger reviewed strategy");
    const meta=Buffer.from(JSON.stringify(manifest)), length=Buffer.alloc(4);length.writeUInt32BE(meta.length);
    async function* payload(){yield length;yield meta;for(const file of files)yield* createReadStream(file.source);}
    mkdirSync(env.BACKUP_DIR,{recursive:true,mode:0o700});
    const name=kind+"-"+now.toISOString().replaceAll(":","-")+".ipb", target=join(resolve(env.BACKUP_DIR),name);
    part=target+".part"; if(existsSync(target))throw Error("Backup already exists");
    const iv=randomBytes(12), cipher=createCipheriv("aes-256-gcm",key,iv);cipher.setAAD(MAGIC);
    writeFileSync(part,Buffer.concat([MAGIC,iv]),{flag:"wx",mode:0o600});
    partOwned=true;
    await pipeline(Readable.from(payload()),cipher,createWriteStream(part,{flags:"a",mode:0o600}));
    appendFileSync(part,cipher.getAuthTag());renameSync(part,target);part=undefined;
    if(kind==="daily")copyFileSync(target,join(resolve(env.BACKUP_DIR),name.replace(/^daily-/,"weekly-")));
    const removed=pruneProductionBackups(env.BACKUP_DIR);
    const uploaded=await uploadBackup(target,env,now);
    // Weekly copies also receive their own object key, not a fake upload receipt.
    if(kind==="daily")await uploadBackup(join(resolve(env.BACKUP_DIR),name.replace(/^daily-/,"weekly-")),env,now);
    return {path:target,bytes:statSync(target).size,kind,encrypted:true,uploaded,removed};
  } finally { if(partOwned&&part&&existsSync(part))unlinkSync(part);work.remove(); }
}
function week(day) { const d=new Date(day+"T00:00:00Z"), dow=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-dow);return d.toISOString().slice(0,10); }
export function pruneProductionBackups(directory) {
  assertTestDatabasePath(join(directory,"backup.sqlite"));const root=resolve(directory), names=readdirSync(root).filter(n=>/^(daily|weekly|predeploy)-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z\.ipb$/.test(n)).sort().reverse();
  let removed=0;
  for(const [kind,limit]of [["daily",14],["weekly",8],["predeploy",8]]){
    const groups=new Set();let kept=0;
    for(const name of names.filter(n=>n.startsWith(kind+"-"))){const day=name.slice(kind.length+1,kind.length+11),group=kind==="weekly"?week(day):kind==="daily"?day:name;
      if(!groups.has(group)&&kept<limit){groups.add(group);kept++;continue;}
      const file=join(root,name);if(lstatSync(file).isSymbolicLink())throw Error("Symlinked backup refused");unlinkSync(file);removed++;
    }
  }return removed;
}
export async function restoreProductionBackup(archive, destination, env = process.env) {
  const key=encryptionKey(env), target=resolve(destination);assertTestDatabasePath(join(target,"iprasm.sqlite"));
  if(existsSync(target))throw Error("Restore only into a NEW inactive directory");
  const work=scratch();let staged;
  try {
    const size=statSync(archive).size, prefix=bytesAt(archive,0,MAGIC.length);
    if(!prefix.equals(MAGIC)||size<MAGIC.length+32||size>MAX_BYTES+1024*1024)throw Error("Invalid archive format/size");
    const decipher=createDecipheriv("aes-256-gcm",key,bytesAt(archive,MAGIC.length,12));decipher.setAAD(MAGIC);decipher.setAuthTag(bytesAt(archive,size-16,16));
    const payload=join(work.path,"authenticated-payload");
    try { await pipeline(range(archive,MAGIC.length+12,size-17),decipher,createWriteStream(payload,{flags:"wx",mode:0o600})); }catch{throw Error("Backup authentication failed; no active data changed");}
    const length=bytesAt(payload,0,4).readUInt32BE();if(length>65536)throw Error("Invalid manifest length");
    const meta=JSON.parse(bytesAt(payload,4,length).toString());
    if(meta.version!=="iprasm.production-backup/1"||!Array.isArray(meta.files)||meta.files.length!==2||meta.files.map(f=>f.name).join(",")!=="iprasm.sqlite,erasure-intents.sqlite")throw Error("Invalid backup manifest");
    secrets(meta.secrets);
    let offset=4+length;
    for(const file of meta.files){if(!Number.isSafeInteger(file.bytes)||file.bytes<16||file.bytes>MAX_BYTES||!/^[a-f0-9]{64}$/.test(file.sha256))throw Error("Invalid snapshot bounds");const out=join(work.path,file.name);await pipeline(range(payload,offset,offset+file.bytes-1),createWriteStream(out,{flags:"wx",mode:0o600}));offset+=file.bytes;if(await digest(out)!==file.sha256)throw Error("Snapshot hash mismatch");checkSqlite(out,file.name==="iprasm.sqlite");}
    if(offset!==statSync(payload).size)throw Error("Unexpected backup payload");
    mkdirSync(dirname(target),{recursive:true});staged=mkdtempSync(join(dirname(target),".iprasm-restore-"));chmodSync(staged,0o700);
    for(const file of meta.files){copyFileSync(join(work.path,file.name),join(staged,file.name));chmodSync(join(staged,file.name),0o600);}
    writeFileSync(join(staged,"runtime-secrets.json"),JSON.stringify(meta.secrets),{flag:"wx",mode:0o600});
    if(existsSync(target))throw Error("Restore destination appeared; preserved");renameSync(staged,target);staged=undefined;
    return {directory:target,authenticated:true,activeDataReplaced:false,kitSignerIncluded:true};
  }finally{work.remove();if(staged&&staged.startsWith(dirname(target)+sep+".iprasm-restore-"))rmSync(staged,{recursive:true});}
}
export function nextDailyDelay(now=new Date()) { const next=new Date(now);next.setUTCHours(3,0,0,0);if(+next<=+now)next.setUTCDate(next.getUTCDate()+1);return +next-+now; }
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const daemon=process.argv.includes("--daemon");
  do{let delay;try{console.log(JSON.stringify(await createProductionBackup(process.env,process.argv.includes("--predeploy")?"predeploy":"daily")));delay=nextDailyDelay();}catch{console.error("Encrypted production backup failed; local archive retained when upload failed; check private configuration/storage");if(!daemon){process.exitCode=1;break;}delay=600000;}if(daemon)await new Promise(ok=>setTimeout(ok,delay));}while(daemon);
}
