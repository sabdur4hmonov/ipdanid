import { expect, test } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { KitStore } from "../server/kit-store";
import { AccountErasureStore } from "../server/account-erasure-store";
import { createProductionBackup, restoreProductionBackup, pruneProductionBackups, nextDailyDelay } from "../scripts/production-backup.mjs";
import { s3Config, signedPut, uploadBackup } from "../scripts/s3-backup.mjs";

test("online encrypted restore drill retains kit codes, quota, signer and journal; corruption never replaces data", async () => {
  mkdirSync("test-results",{recursive:true});const dir=mkdtempSync(resolve("test-results/p1-backup-"));
  const env={DATABASE_PATH:join(dir,"live.sqlite"),ERASURE_LEDGER_PATH:join(dir,"journal.sqlite"),BACKUP_DIR:join(dir,"backups"),CODE_PEPPER:"p".repeat(32),SANDBOX_PAYMENT_KEY:"k".repeat(32),ADMIN_PASSWORD_HASH:"synthetic-hash-only".repeat(2),BACKUP_ENCRYPTION_KEY:randomBytes(32).toString("base64url"),CLASSIC_TUNING:"4",FEATURES:""};
  const store=new KitStore(env.DATABASE_PATH,env.CODE_PEPPER,env.SANDBOX_PAYMENT_KEY);store.seed();const erasure=new AccountErasureStore(store,{path:env.ERASURE_LEDGER_PATH,key:env.CODE_PEPPER});
  try{const issued=store.issueKitBatch("admin","standard-base-r1",1,"restore-drill"),publicKey=store.buildKey();
    const result=await createProductionBackup(env,"daily",new Date("2026-11-16T03:00:00Z"));
    const bytes=readFileSync(result.path);expect(bytes.includes(Buffer.from("SQLite format"))).toBe(false);expect(bytes.includes(Buffer.from(env.CODE_PEPPER))).toBe(false);expect(result.uploaded).toBe(false);expect(readdirSync(env.BACKUP_DIR).every(n=>n.endsWith(".ipb"))).toBe(true);
    store.db.prepare("UPDATE kit_codes SET quota=2").run();
    const destination=join(dir,"inactive"),restored=await restoreProductionBackup(result.path,destination,env);expect(restored.activeDataReplaced).toBe(false);
    const saved=JSON.parse(readFileSync(join(destination,"runtime-secrets.json"),"utf8")),copy=new KitStore(join(destination,"iprasm.sqlite"),saved.CODE_PEPPER,saved.SANDBOX_PAYMENT_KEY);
    try{expect(copy.buildKey()).toEqual(publicKey);const user=copy.createGuest();copy.redeemKit(user.id,issued.codes[0].code);expect(copy.kitBalance(user.id)).toBe(3);const journal=new DatabaseSync(join(destination,"erasure-intents.sqlite"),{readOnly:true});expect(journal.prepare("PRAGMA quick_check").get()!.quick_check).toBe("ok");journal.close();}finally{copy.close();}
    await expect(restoreProductionBackup(result.path,destination,env)).rejects.toThrow("NEW");
    const bad=join(dir,"tampered.ipb");bytes[Math.floor(bytes.length/2)]^=1;writeFileSync(bad,bytes);const rejected=join(dir,"rejected");await expect(restoreProductionBackup(bad,rejected,env)).rejects.toThrow("authentication");expect(existsSync(rejected)).toBe(false);
    await expect(restoreProductionBackup(result.path,rejected,{...env,BACKUP_ENCRYPTION_KEY:randomBytes(32).toString("base64url")})).rejects.toThrow("authentication");expect(existsSync(rejected)).toBe(false);
    await expect(createProductionBackup({...env,BACKUP_ENCRYPTION_KEY:""})).rejects.toThrow("BACKUP_ENCRYPTION_KEY");
  }finally{erasure.close();store.close();}
});
test("retention keeps14 distinct daily dates +8 weekly buckets +8 predeploy archives; unrelated files untouched", () => {
  const dir=mkdtempSync(resolve("test-results/p1-retention-"));writeFileSync(join(dir,"keep.txt"),"unrelated");
  for(let d=1;d<=90;d++){const at=new Date(Date.UTC(2026,0,d,3)).toISOString().replaceAll(":","-");for(const kind of ["daily","weekly","predeploy"])writeFileSync(join(dir,kind+"-"+at+".ipb"),"synthetic");}
  expect(pruneProductionBackups(dir)).toBeGreaterThan(0);const names=readdirSync(dir);expect(names.filter(n=>n.startsWith("daily-")).length).toBe(14);expect(names.filter(n=>n.startsWith("weekly-")).length).toBe(8);expect(names.filter(n=>n.startsWith("predeploy-")).length).toBe(8);expect(names).toContain("keep.txt");expect(nextDailyDelay(new Date("2026-11-16T02:59:00Z"))).toBe(60000);
});
test("S3 is opt-in, signed and fails closed; a mocked receipt is not live OCI acceptance", async () => {
  expect(s3Config({})).toBeNull();expect(()=>s3Config({BACKUP_S3_ENDPOINT:"https://example.invalid"})).toThrow();
  const env={BACKUP_S3_ENDPOINT:"https://namespace.compat.objectstorage.us-ashburn-1.oraclecloud.com",BACKUP_S3_REGION:"us-ashburn-1",BACKUP_S3_BUCKET:"private-backups",BACKUP_S3_ACCESS_KEY:"synthetic-access",BACKUP_S3_SECRET_KEY:"synthetic-secret",BACKUP_S3_PREFIX:"iprasm/"};
  const request=signedPut(s3Config(env)!,"daily-test.ipb","a".repeat(64),new Date("2026-11-16T03:00:00Z"));expect(request.url).toContain("/private-backups/iprasm/daily-test.ipb");expect(request.headers.authorization).toContain("20261116/us-ashburn-1/s3/aws4_request");expect(request.headers.authorization).not.toContain(env.BACKUP_S3_SECRET_KEY);
  const dir=mkdtempSync(resolve("test-results/p1-s3-")),file=join(dir,"archive.ipb");writeFileSync(file,"encrypted-fixture");let calls=0;
  const transport=(async (_url:unknown,init:any)=>{calls++;expect(init.redirect).toBe("error");for await(const _chunk of init.body){}return new Response("",{status:200});}) as typeof fetch;
  expect(await uploadBackup(file,{},undefined,transport)).toBe(false);expect(calls).toBe(0);expect(await uploadBackup(file,env,undefined,transport)).toBe(true);expect(calls).toBe(1);
  await expect(uploadBackup(file,env,undefined,(async (_url:unknown,init:any)=>{init.body.destroy();return new Response("",{status:403});}) as typeof fetch)).rejects.toThrow("upload failed");
});
