import{readFileSync,writeFileSync,existsSync}from'node:fs';
import{validateInstruction,parseProjectFile,toTxt,fromFile}from'../src/core/validation';
import{rasterSequenceAtResolution}from'../src/core/optical';
import{Distribution}from'../src/core/distribution';
import{assemblyEffort}from'../src/core/simplify';
import{regionPixels}from'../src/core/coordinates';
import{portraitRegions}from'../src/core/portrait';
const f='output/portrait-dispatch',a=JSON.parse(readFileSync(f+'/audit.json','utf8'));
const target=new Uint8Array(readFileSync(f+'/target-512.bin'));
const regions=portraitRegions(a.rows.find((r:any)=>r.n===512).portrait);
const face=regions.face;
const bounds={...regions,leftEye:{...regions.eyes,width:regions.eyes.width*.48},rightEye:{...regions.eyes,left:regions.eyes.left+regions.eyes.width*.52,width:regions.eyes.width*.48},jaw:{left:face.left,top:face.top+face.height*.75,width:face.width,height:face.height*.25}};
const rows=[];
for(const name of['owner-baseline','guarded120','physical120','resolved240']){
 if(!existsSync(`${f}/${name}.json`))continue;
 const file=JSON.parse(readFileSync(`${f}/${name}.json`,'utf8')),i=await validateInstruction(file.project.instruction);
 await parseProjectFile(JSON.stringify(file));
 const txt=toTxt(i);if((await fromFile(txt)).sequenceHash!==i.sequenceHash)throw Error('TXT mismatch');
 writeFileSync(`${f}/${name}.txt`,txt);
 const d=new Distribution(i.profile.pins.length,i.segments),measurements:any={};
 for(const n of[i.params.resolution,512]){const r=rasterSequenceAtResolution(i,n);writeFileSync(`${f}/${name}-${n}.rgb`,Uint8Array.from(r,v=>Math.round(v*255)));if(n!==512)continue;
 for(const[key,box]of Object.entries(bounds)){const b=regionPixels(box,512);let count=0,sq=0,dark=0,t=0,v=0,contrastSq=0,pairs=0;
 for(let y=b.top;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++){const k=y*512+x,lum=(r[k*3]+r[k*3+1]+r[k*3+2])/3,goal=(target[k*3]+target[k*3+1]+target[k*3+2])/765;count++;sq+=(lum-goal)**2;dark+=Math.max(0,goal-lum);t+=goal;v+=lum;for(const j of[x<b.right?k+1:-1,y<b.bottom?k+512:-1])if(j>=0){const delta=lum-(r[j*3]+r[j*3+1]+r[j*3+2])/3-(goal-(target[j*3]+target[j*3+1]+target[j*3+2])/765);contrastSq+=delta*delta;pairs++;}}
 measurements[key]={pixels:count,mse:sq/count,meanDarkExcess:dark/count,meanTarget:t/count,meanSequence:v/count,localContrastResidual:contrastSq/pairs,bounds:b};
 }}
 rows.push({name,hash:i.sequenceHash,targetHash:i.imageHash,algorithm:i.algorithm,profile:i.profile,params:i.params,metrics:i.metrics,effort:assemblyEffort(i,8),maxChord:Math.max(...d.pairs.values()),maxIncident:Math.max(...d.degree),measurements,evidence:file.evidence,progress:file.project.progress});
}
writeFileSync(`${f}/integrity.json`,JSON.stringify({rows,reference:'512-pixel freshly sampled current prepared source, grayscale-only, actual normalized regions mapped through unchanged crop; all complete sequences evaluated with same optical renderer. Historical target mismatch and material/sampling differences disclosed.',bounds:Object.fromEntries(Object.entries(bounds).map(([k,b])=>[k,regionPixels(b,512)])),physicalAcceptance:false},null,2));
console.log(rows.map(r=>({name:r.name,lines:r.metrics.lines,meters:r.metrics.estimatedMeters,maxChord:r.maxChord,maxIncident:r.maxIncident,eyes:r.measurements.eyes.mse,nose:r.measurements.nose.mse,mouth:r.measurements.mouth.mse})));
