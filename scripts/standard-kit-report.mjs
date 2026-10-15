import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import UPNGModule from '@pdf-lib/upng';
import { generateClassic } from '../src/core/classic.ts';
import { generate,hash } from '../src/core/engine.ts';
import { classicCircleProfile,faceFill } from '../src/core/standard-preparation.ts';
import { rasterSequence } from '../src/core/optical.ts';
import { qualityCurve,measuredKnee } from '../src/core/line-budget.ts';
import { regionQuality,screenQuality } from '../src/core/quality-screen.ts';
import { inside } from '../src/core/geometry.ts';
import { validateInstruction } from '../src/core/validation.ts';
const UPNG=UPNGModule.default??UPNGModule,n=96;
const phase=process.argv.includes('--phase9')?'phase9':'phase8',out=`output/${phase}`;
mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const protocol={version:'standard-kit-ab/1',phase,grid:n,mainBudget:2500,curveBudget:3500,curveCounts:[1000,1500,2000,2500,3000,3500],a:'greedy-optical/4',b:'classic-greedy/1',sameTarget:true,computeBudgetEqual:false,secondsPerConnection:8,visualAcceptance:false};
const protocolPath=`${out}/protocol.json`;
if(existsSync(protocolPath) && JSON.stringify(JSON.parse(readFileSync(protocolPath)))!==JSON.stringify(protocol))throw Error('Frozen protocol mismatch');
writeFileSync(protocolPath,JSON.stringify(protocol,null,2));
function png(rgb,path){const rgba=new Uint8Array(n*n*4);for(let k=0;k<n*n;k++){rgba.set(rgb.subarray(k*3,k*3+3),k*4);rgba[k*4+3]=255;}writeFileSync(path,new Uint8Array(UPNG.encode([rgba.buffer],n,n,0)));}
function preview(i,path,count=i.metrics.lines){png(Uint8Array.from(rasterSequence(i,count),v=>Math.max(0,Math.min(255,Math.round(v*255)))),path);}
function proceduralFaces(count){
 const pixels=new Uint8Array(n*n*3).fill(255),faces=count===1?[{left:.3,top:.12,width:.4,height:.65}]:[{left:.08,top:.18,width:.35,height:.6},{left:.56,top:.2,width:.35,height:.6}];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)for(let face=0;face<count;face++){
  const f=faces[face],u=(x/n-f.left)/f.width,v=(y/n-f.top)/f.height;
  if((u-.5)**2/.25+(v-.5)**2/.25>1)continue;
  let grey=150+55*(u-.4)+25*v;
  if(v<.16 || Math.abs(v-.37)<.035 && (Math.abs(u-.3)<.1||Math.abs(u-.7)<.1) || Math.abs(u-.52)<.035 && v>.42&&v<.61 || Math.abs(v-.76)<.02&&u>.3&&u<.72)grey=30;
  for(let c=0;c<3;c++)pixels[(y*n+x)*3+c]=grey;
 }
 return {pixels,faces};
}
function applyFill(pixels,faces,profile){
 const scale=profile.standardKit?.patternScale??.92,fill=faceFill(faces,profile.shape,1,scale),s=fill.sourceBounds,d=fill.targetBounds;
 const result=new Uint8Array(n*n*3).fill(255);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=(x/(n-1)-d.left)/d.width,v=(y/(n-1)-d.top)/d.height;
  if(u<0||u>1||v<0||v>1)continue;
  const sx=Math.max(0,Math.min(n-1,Math.round((s.left+u*s.width)*(n-1)))),sy=Math.max(0,Math.min(n-1,Math.round((s.top+v*s.height)*(n-1))));
  result.set(pixels.subarray((sy*n+sx)*3,(sy*n+sx)*3+3),(y*n+x)*3);
 }
 const regions=faces.map((f,j)=>({name:`face${j+1}`,left:d.left+(f.left-s.left)/s.width*d.width,top:d.top+(f.top-s.top)/s.height*d.height,width:f.width/s.width*d.width,height:f.height/s.height*d.height}));
 return {pixels:result,regions,fill};
}
function screen(i,pixels,regions){
 const rendered=rasterSequence(i),target=Float64Array.from({length:n*n},(_,k)=>(pixels[k*3]+pixels[k*3+1]+pixels[k*3+2])/765),grey=Float64Array.from({length:n*n},(_,k)=>(rendered[k*3]+rendered[k*3+1]+rendered[k*3+2])/3);
 return Object.fromEntries(regions.map(b=>[b.name,regionQuality(target,grey,Uint8Array.from({length:n*n},(_,k)=>+((k%n)/(n-1)>=b.left && (k%n)/(n-1)<=b.left+b.width && Math.floor(k/n)/(n-1)>=b.top && Math.floor(k/n)/(n-1)<=b.top+b.height && inside(i.profile.shape,(k%n)/(n-1),Math.floor(k/n)/(n-1)))),n,i.profile)]));
}
let profiles=[classicCircleProfile()];
if(phase==='phase9'){
 const {standardProfiles,DEFAULT_STANDARD_KIT}=await import('../src/core/standard-kit.ts');profiles=standardProfiles(DEFAULT_STANDARD_KIT);
}
const results=[];
for(const profile of profiles)for(const kind of ['synthetic-one','synthetic-two','owner-existing-crop']){
 const name=`${profile.shape}-${kind}`,directory=`${out}/${name}`;mkdirSync(directory,{recursive:true});
 let target,regions,source;
 if(kind==='owner-existing-crop'){
  const path='output/portrait-dispatch/target-320.bin';
  if(!existsSync(path)){results.push({name,status:'waiting-owner-photo'});continue;}
  const raw=new Uint8Array(readFileSync(path));if(raw.length!==320*320*3)throw Error('Wrong frozen owner target');
  target=Uint8Array.from({length:n*n*3},(_,k)=>{const at=Math.floor(k/3),x=at%n,y=Math.floor(at/n);return raw[(Math.round(y/(n-1)*319)*320+Math.round(x/(n-1)*319))*3+k%3];});
  const root=JSON.parse(readFileSync('output/resolved-convergence/final.json','utf8'));const i=root.project?.instruction??root;
  regions=Object.entries(i.params.portrait.regions).filter(([key])=>['eyes','nose','mouth'].includes(key)).map(([name,b])=>({name,...b}));
  source={path,sha256:sha(raw),preparation:'Existing owner processed crop; no new automatic white-background/face-fill acceptance. Heart owner TWO-person source still missing.'};
 }else{
  const fixture=proceduralFaces(kind==='synthetic-two'?2:1),prepared=applyFill(fixture.pixels,fixture.faces,profile);
  target=prepared.pixels;regions=prepared.regions;source={procedural:true,people:fixture.faces.length,fill:prepared.fill};
 }
 const imageHash=await hash(target),profileHash=await hash(profile);
 png(target,`${directory}/target.png`);
 async function run(label,budget){
  const file=`${directory}/${label}.json`;
  if(existsSync(file)){
   const cached=await validateInstruction(JSON.parse(readFileSync(file,'utf8')));
   if(cached.imageHash!==imageHash || await hash(cached.profile)!==profileHash || cached.params.requestedLines!==budget || cached.algorithm!==(label==='a'?'greedy-optical/4':'classic-greedy/1'))throw Error('Cached experiment identity mismatch');
   return cached;
  }
  console.log(`${phase} ${name} ${label} ${budget}`);
  const options={pixels:target,resolution:n,profile,lines:budget,mode:'dark'};
  const i=label==='a'?await generate(options):await generateClassic(options);
  await validateInstruction(i);writeFileSync(file,JSON.stringify(i));return i;
 }
 const a=await run('a',2500),b=await run('b',2500),curveGuide=await run('curve',3500);
 if(JSON.stringify(curveGuide.segments[0].path.slice(0,b.metrics.lines+1))!==JSON.stringify(b.segments[0].path))throw Error('Classic prefix changed');
 const aq=screen(a,target,regions),bq=screen(b,target,regions),numericScreen=screenQuality(aq,bq),curve=qualityCurve(curveGuide,target),knee=measuredKnee(curve);
 preview(a,`${directory}/a.png`);preview(b,`${directory}/b.png`);
 const row={name,profileHash,imageHash,source,regions,numericScreen,a:{hash:a.sequenceHash,...a.metrics},b:{hash:b.sequenceHash,...b.metrics},aq,bq,curve,knee,status:'mechanics-measured-visual-owner-pending',ownerTwoPersonHeartPending:profile.shape==='heart'&&kind==='owner-existing-crop'};
 writeFileSync(`${directory}/metrics.json`,JSON.stringify(row,null,2));results.push(row);
 writeFileSync(`${out}/results.json`,JSON.stringify({protocol,results},null,2));
}
const escape=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
writeFileSync(`${out}/report.html`,`<!doctype html><meta charset="utf-8"><title>${phase} standard kit A/B</title><style>body{font:16px system-ui;max-width:1400px;margin:30px auto;color:#123}section{border-top:1px solid #bbb;padding:24px}.images{display:flex;gap:15px}.images figure{width:32%;margin:0}img{width:100%;image-rendering:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}.zoom img{width:768px;max-width:none}.zoom{overflow:auto;height:400px}</style><h1>${phase}: original standard-kit A/B</h1><p>No QBRIX output was supplied. These are our own targets and exact thread paths, not competitor reproduction or accepted likeness. Synthetic faces are procedural. Existing owner crop does not verify new automatic preparation. Heart's genuine two-person owner input remains pending. Time uses8 seconds/connection, not a measured4–6h claim.</p><pre>${escape(JSON.stringify(protocol,null,2))}</pre>${results.map(r=>`<section><h2>${escape(r.name)}</h2>${r.a?`<div class="images">${['target','a','b'].map((label,j)=>`<figure><figcaption>${['Same target','A: unchanged continuous','B: independent classic'][j]}</figcaption><img src="${r.name}/${label}.png"></figure>`).join('')}</div><div class="zoom">${['target','a','b'].map(label=>`<img src="${r.name}/${label}.png" alt="Enlarged ${label}">`).join('')}</div><pre>${escape(JSON.stringify({status:r.status,a:r.a,b:r.b,numericScreen:r.numericScreen,knee:r.knee,curve:r.curve,source:r.source},null,2))}</pre>`:escape(r.status)}</section>`).join('')}`);
console.log(JSON.stringify({phase,cases:results.length,report:`${out}/report.html`,numericScreensPassed:results.filter(r=>r.numericScreen?.metricsPass).length,visualAcceptance:false}));
