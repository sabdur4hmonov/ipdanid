// Explicit disposable P1 names/tags only. Never starts/restarts a Compose stack.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, createWriteStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
const out=resolve("output/p1"),tag="p1-final-20261116",network="iprasm-"+tag,apiName=network+"-api",webName=network+"-web";
mkdirSync(out,{recursive:true});
const run=(args)=>execFileSync("docker",args,{encoding:"utf8",windowsHide:true,maxBuffer:4*1024**2}).trim();
async function build(target){const log=createWriteStream(resolve(out,"arm64-final-build-"+target+".log"),{flags:"wx"});const child=spawn("docker",["buildx","build","--platform","linux/arm64","--target",target,"--load","-t","iprasm-"+target+":"+tag,"."],{windowsHide:true,stdio:["ignore","pipe","pipe"]});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});const code=await new Promise((ok,no)=>{child.once("error",no);child.once("exit",ok);});await new Promise(ok=>log.end(ok));assert.equal(code,0,"ARM64 "+target+" build failed; inspect its log");}
for(const name of [apiName,webName])assert.equal(run(["ps","-aq","--filter","name=^/"+name+"$"]),"","Existing P1 container preserved");
assert(!run(["network","ls","-q","--filter","name=^"+network+"$"]),"Existing P1 network preserved");
await build("api");await build("web");
const key=randomBytes(32).toString("base64url"),salt=randomBytes(16).toString("base64url"),password="Synthetic-P1-ARM64-only",hash=["scrypt",32768,8,1,salt,scryptSync(password,salt,32,{N:32768,r:8,p:1,maxmem:64*1024**2}).toString("base64url")].join("$");
const envFile=resolve(out,"arm64-private.env");assert(!existsSync(envFile));writeFileSync(envFile,`CODE_PEPPER=${randomBytes(32).toString("base64url")}\nSANDBOX_PAYMENT_KEY=${randomBytes(32).toString("base64url")}\nADMIN_PASSWORD_HASH=${hash}\nBACKUP_ENCRYPTION_KEY=${key}\nAPP_ORIGIN=https://p1.example.invalid\nAPP_DOMAIN=p1.example.invalid\nDATABASE_PATH=/data/iprasm.sqlite\nERASURE_LEDGER_PATH=/privacy/erasure-intents.sqlite\nBACKUP_DIR=/backups\nFEATURES=\nSERVER_GENERATION=1\nCLASSIC_TUNING=4\nFCM_MODE=disabled\nTRANSACTIONAL_EMAIL_MODE=disabled\n`,{flag:"wx",mode:0o600});
let networkCreated=false,api=false,web=false;
try{
  run(["network","create",network]);networkCreated=true;
  run(["run","-d","--platform","linux/arm64","--name",apiName,"--network",network,"--network-alias","api","--env-file",envFile,"-p","127.0.0.1:5097:4311","iprasm-api:"+tag]);api=true;
  let ready=false;for(let i=0;i<80;i++){try{const response=await fetch("http://127.0.0.1:5097/api/health");if(response.ok){const health=await response.json();assert.equal(health.sandbox,false);assert.equal(health.livePayments,false);ready=true;break;}}catch{}await new Promise(ok=>setTimeout(ok,500));}assert(ready,"ARM64 API failed readiness");
  const runtime=JSON.parse(run(["exec",apiName,"node","--import","tsx","--input-type=module","-e",`import {serverClassicTuning} from './server/generation-recipe.ts'; import{createProductionBackup,restoreProductionBackup}from'./scripts/production-backup.mjs';const b=await createProductionBackup();const r=await restoreProductionBackup(b.path,'/tmp/p1-restore-drill');console.log(JSON.stringify({arch:process.arch,tuning:serverClassicTuning(),encrypted:b.encrypted,restored:r.authenticated,signer:r.kitSignerIncluded}));`]));assert.equal(runtime.arch,"arm64");assert.equal(runtime.tuning,"classic-reference/4");assert(runtime.encrypted&&runtime.restored&&runtime.signer);
  run(["run","-d","--platform","linux/arm64","--name",webName,"--network",network,"--env","APP_DOMAIN=:80","-p","127.0.0.1:5098:80","iprasm-web:"+tag]);web=true;
  let caddy=false;for(let i=0;i<40;i++){try{const response=await fetch("http://127.0.0.1:5098/");if(response.ok&&(await response.text()).includes('id="root"')){caddy=true;break;}}catch{}await new Promise(ok=>setTimeout(ok,500));}assert(caddy,"ARM64 Caddy failed readiness");
  const features=await(await fetch("http://127.0.0.1:5098/api/features")).json();assert(Object.values(features.features).every(v=>v===false));
  const version=run(["exec",webName,"caddy","version"]);
  const result={platform:"linux/arm64",emulatedOn:process.platform+"/"+process.arch,apiImage:run(["image","inspect","iprasm-api:"+tag,"--format","{{.Architecture}}"]),webImage:run(["image","inspect","iprasm-web:"+tag,"--format","{{.Architecture}}"]),runtime,caddy:true,caddyVersion:version,coreDefault:true,productionTlsOrOCI:false,onlyDisposablePorts:[5097,5098]};
  writeFileSync(resolve(out,"arm64-verification.json"),JSON.stringify(result,null,2),{flag:"wx"});console.log(JSON.stringify(result));
}finally{if(web)run(["rm","-f",webName]);if(api)run(["rm","-f",apiName]);if(networkCreated)run(["network","rm",network]);}
