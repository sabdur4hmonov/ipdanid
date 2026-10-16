// Update only the4195 static preview, retaining every old hashed asset for open tabs.
import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync,copyFileSync,renameSync,realpathSync} from 'node:fs';
import {resolve,join,relative,dirname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=realpathSync('.'),source=realpathSync('output/photo-preview-fix-dist'),destination=realpathSync('output/phase9-dist');
for(const dir of [source,destination])assert(dir.startsWith(root+sep+'output'+sep));
assert.notEqual(source,destination);
const url='http://127.0.0.1:4195/';
assert.equal(await(await fetch(url)).text(),readFileSync(join(destination,'index.html'),'utf8'),'Unexpected preview; preserve it');
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
 assert(!entry.isSymbolicLink());const path=join(dir,entry.name);return entry.isDirectory()?files(path):[path];
});}
const digest=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const oldAssets=new Map(files(join(destination,'assets')).map(path=>[relative(destination,path),digest(path)]));
const entries=files(source),backup=resolve('output/photo-preview-fix');mkdirSync(backup,{recursive:true});
for(const name of ['index.html','sw.js'])if(!existsSync(join(backup,'previous-'+name)))copyFileSync(join(destination,name),join(backup,'previous-'+name));
for(const path of entries){
 const name=relative(source,path);if(['index.html','sw.js'].includes(name))continue;
 const target=join(destination,name);mkdirSync(dirname(target),{recursive:true});
 const parent=realpathSync(dirname(target));assert(parent===destination||parent.startsWith(destination+sep));
 if(existsSync(target))assert.equal(digest(target),digest(path),'Refuse changing an existing static/hashed asset: '+name);
 else copyFileSync(path,target);
}
// Publish navigation first, worker last, after all newly referenced assets exist.
for(const name of ['index.html','sw.js']){
 const next=join(destination,'.photo-preview-next-'+name);
 writeFileSync(next,readFileSync(join(source,name)));renameSync(next,join(destination,name));
}
for(const [name,hash] of oldAssets)assert.equal(digest(join(destination,name)),hash);
for(const path of entries)assert.equal(digest(join(destination,relative(source,path))),digest(path));
assert.equal(await(await fetch(url)).text(),readFileSync(join(source,'index.html'),'utf8'));
const html=readFileSync(join(source,'index.html'),'utf8'),main=html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
assert.equal(await(await fetch(new URL(main,url))).text(),readFileSync(join(source,main.slice(1)),'utf8'));
const proof={url,source:relative(root,source),servedDirectory:relative(root,destination),newFilesVerified:entries.length,
 oldHashedAssetsPreserved:oldAssets.size,oldAssetHashes:Object.fromEntries(oldAssets),htmlExact:true,mainAssetExact:true,
 serverRestarted:false,apiAndCustomerDataChanged:false,owner4194Contacted:false};
writeFileSync(join(backup,'publication.json'),JSON.stringify(proof,null,2));
console.log(JSON.stringify({...proof,oldAssetHashes:undefined}));
