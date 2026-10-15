import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {freshTestDatabase} from './test-artifacts.mjs';
const webDir='output/phase9-dist',site='http://127.0.0.1:4195',api='http://127.0.0.1:4465/api';
if(!existsSync(`${webDir}/index.html`))throw Error('Build first: npm run build -- --outDir output/phase9-dist');
for(const url of [site,api+'/health']){
 try{await fetch(url,{signal:AbortSignal.timeout(2000)});throw Error('Port already in use. Existing service preserved: '+url);}
 catch(error){if(error.cause?.code!=='ECONNREFUSED')throw error;}
}
const isolated=freshTestDatabase('owner-standard'),admin=randomBytes(32).toString('base64url');
const child=spawn(process.execPath,['scripts/run-local.mjs'],{env:{...process.env,
 IP_RASM_LOCAL_PORT:'4195',IP_RASM_API_PORT:'4465',IP_RASM_WEB_DIR:webDir,
 IP_RASM_TEST_SERVER:'1',IP_RASM_TEST_ORIGIN:site,DATABASE_PATH:isolated.databasePath,
 LOCAL_ADMIN_TOKEN:admin,CODE_PEPPER:randomBytes(32).toString('base64url'),SANDBOX_PAYMENT_KEY:randomBytes(32).toString('base64url')},stdio:'inherit',windowsHide:true});
writeFileSync(join(isolated.directory,'launch.json'),JSON.stringify({pid:process.pid,childPid:child.pid,site,api,webDir,databasePath:isolated.databasePath,ownerDataUsed:false},null,2));
child.on('exit',code=>{process.exitCode=code??1;});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
let ready=false;
for(let attempt=0;attempt<60;attempt++){
 try{const r=await fetch(api+'/health');if(r.ok){ready=true;break;}}catch{}
 await new Promise(r=>setTimeout(r,250));
}
if(!ready){child.kill();throw Error('Preview API failed to start');}
const config=await(await fetch(api+'/kit-profiles')).json();
const response=await fetch(api+'/admin/kits/batch',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${admin}`},body:JSON.stringify({profile:`standard-base-r${config.revision}`,count:1,requestKey:crypto.randomUUID()})});
if(!response.ok){child.kill();throw Error('Cannot prepare isolated manual kit');}
const batch=await response.json(),credentialPath='output/phase9/manual-testing.txt';mkdirSync('output/phase9',{recursive:true});
writeFileSync(credentialPath,`IP RASM — ALOHIDA SINOV\nIlova: ${site}\nKit kodi (${batch.codes[0].quota} natija): ${batch.codes[0].code}\nAdministrator tokeni: ${admin}\nAPI: ${api}\nProfil: r${config.revision}\nAsl tmp/data va4194 ishlatilmagan. Bu fayl gitga kirmaydi; faqat mahalliy sinov hisobi.\n`,{mode:0o600});
console.log(`Standard kit ready: ${site}; local manual code/admin instructions: ${credentialPath}; isolated data: ${isolated.directory}`);
