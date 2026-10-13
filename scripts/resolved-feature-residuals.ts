import {readFileSync,writeFileSync} from 'node:fs';
import {rasterSequenceAtResolution} from '../src/core/optical';
import {portraitRegions} from '../src/core/portrait';
import {regionPixels} from '../src/core/coordinates';
const n=512,src='output/portrait-dispatch',out='output/resolved-convergence';
const pixels=new Uint8Array(readFileSync(src+'/target-512.bin'));
const target=Float64Array.from({length:n*n},(_,k)=>(pixels[k*3]+pixels[k*3+1]+pixels[k*3+2])/765);
const reference=JSON.parse(readFileSync(src+'/resolved240.json','utf8')).project.instruction;
const regions=portraitRegions(reference.params.portrait),rows=[];
for(const[name,file]of[['baseline8',src+'/resolved240.json'],['total24',out+'/final.json']]){
 const i=JSON.parse(readFileSync(file,'utf8')).project.instruction,r=rasterSequenceAtResolution(i,n),lum=Float64Array.from(target,(_,k)=>(r[k*3]+r[k*3+1]+r[k*3+2])/3);
 for(const region of['eyes','nose','mouth'])for(const mm of[.8,1.25,400/159,800/159,1600/159]){
  const b=regionPixels(regions[region],n);let samples=0,tEnergy=0,rEnergy=0,err=0,dot=0;
  for(let y=b.top;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++)for(const axis of[0,1]){
   const k=y*n+x,pos=(axis?y:x)+mm*(n-1)/(axis?i.profile.heightMm:i.profile.widthMm),lo=Math.floor(pos),hi=Math.ceil(pos),fraction=pos-lo;
   if(hi>(axis?b.bottom:b.right))continue;const kb=axis?lo*n+x:y*n+lo,kc=axis?hi*n+x:y*n+hi;
   const a=target[k]-(1-fraction)*target[kb]-fraction*target[kc],c=lum[k]-(1-fraction)*lum[kb]-fraction*lum[kc];
   samples++;tEnergy+=a*a;rEnergy+=c*c;err+=(a-c)**2;dot+=a*c;
  }
  rows.push({name,region,distanceMm:mm,samples,targetContrastEnergy:tEnergy/samples,sequenceContrastEnergy:rEnergy/samples,residual:err/samples,energyRatio:rEnergy/tEnergy,gradientCorrelation:dot/Math.sqrt(tEnergy*rEnergy)});
 }
}
writeFileSync(out+'/feature-residuals.json',JSON.stringify({reference:'512 common sample centers; fixed actual region boxes, forward x/y mm distances with linear interpolation. Energy ratio/correlation are diagnostics, not likeness scores. .8/1.25mm are evaluation probes, not altered optimizer/materials.',rows},null,2),{flag:'wx'});console.log(rows.filter(r=>r.distanceMm===1.25));
