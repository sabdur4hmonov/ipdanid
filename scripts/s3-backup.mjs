// S3-compatible path-style PUT, AWS Signature V4. No SDK/browser secrets, query
// credentials, anonymous fallback, automatic bucket creation or public ACL.
import { createHash, createHmac } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import { basename } from "node:path";
const hash=s=>createHash("sha256").update(s).digest("hex"), hmac=(k,s)=>createHmac("sha256",k).update(s).digest();
export function s3Config(env) {
  const keys=["BACKUP_S3_ENDPOINT","BACKUP_S3_REGION","BACKUP_S3_BUCKET","BACKUP_S3_ACCESS_KEY","BACKUP_S3_SECRET_KEY"];
  if(keys.every(k=>!env[k]))return null;
  if(keys.some(k=>!env[k]))throw Error("Incomplete optional backup S3 configuration");
  const endpoint=new URL(env.BACKUP_S3_ENDPOINT);
  if(endpoint.protocol!=="https:"||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.pathname!=="/")throw Error("Backup S3 requires an HTTPS origin");
  if(!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(env.BACKUP_S3_BUCKET)||!/^[a-z0-9-]+$/.test(env.BACKUP_S3_REGION)||!/^[-a-zA-Z0-9_/]*$/.test(env.BACKUP_S3_PREFIX??"iprasm/"))throw Error("Invalid backup S3 location");
  return {endpoint:endpoint.origin,region:env.BACKUP_S3_REGION,bucket:env.BACKUP_S3_BUCKET,accessKey:env.BACKUP_S3_ACCESS_KEY,secret:env.BACKUP_S3_SECRET_KEY,prefix:env.BACKUP_S3_PREFIX??"iprasm/"};
}
export function signedPut(config, name, bodyHash, date=new Date()) {
  const path="/"+[config.bucket,...(config.prefix+name).split("/")].map(s=>encodeURIComponent(s).replace(/[!'()*]/g,c=>"%"+c.charCodeAt(0).toString(16).toUpperCase())).join("/"), stamp=date.toISOString().replace(/[:-]|\.\d{3}/g,""),day=stamp.slice(0,8),scope=`${day}/${config.region}/s3/aws4_request`;
  const headers={host:new URL(config.endpoint).host,"x-amz-content-sha256":bodyHash,"x-amz-date":stamp},names=Object.keys(headers).sort().join(";"),canonical=`PUT\n${path}\n\n${Object.keys(headers).sort().map(k=>k+":"+headers[k]+"\n").join("")}\n${names}\n${bodyHash}`;
  const key=hmac(hmac(hmac(hmac("AWS4"+config.secret,day),config.region),"s3"),"aws4_request"),signature=createHmac("sha256",key).update(`AWS4-HMAC-SHA256\n${stamp}\n${scope}\n${hash(canonical)}`).digest("hex");
  return {url:config.endpoint+path,headers:{...headers,authorization:`AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope}, SignedHeaders=${names}, Signature=${signature}`}};
}
export async function uploadBackup(file,env,date=new Date(),transport=fetch) {
  const config=s3Config(env);if(!config)return false;
  const h=createHash("sha256");for await(const chunk of createReadStream(file))h.update(chunk);
  const request=signedPut(config,basename(file),h.digest("hex"),date);
  const response=await transport(request.url,{method:"PUT",headers:{...request.headers,"content-length":String(statSync(file).size)},body:createReadStream(file),duplex:"half",redirect:"error",signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw Error("Backup S3 upload failed");await response.body?.cancel();return true;
}
