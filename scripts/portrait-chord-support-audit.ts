import {readFileSync,writeFileSync} from 'node:fs';
import {strandFootprint} from '../src/core/optical';
import {inside} from '../src/core/geometry';
import {portraitRegions} from '../src/core/portrait';
import {validateInstruction} from '../src/core/validation';
// Necessary nonnegative-density bound, not a fitted graph or assembly guide.
const out='output/feature-contrast', n=320,started=performance.now();
const instruction=await validateInstruction(JSON.parse(readFileSync(out+'/features.json','utf8')).project.instruction);
const p=instruction.profile,regions=portraitRegions(instruction.params.portrait!);
const rgb=new Uint8Array(readFileSync('output/portrait-dispatch/target-320.bin'));
const target=Float64Array.from({length:n*n},(_,k)=>(rgb[k*3]+rgb[k*3+1]+rgb[k*3+2])/765);
const contains=(box:any,x:number,y:number)=>x>=box.left&&x<=box.left+box.width&&y>=box.top&&y<=box.top+box.height;
const light=new Uint8Array(n*n), masks:Record<string,Uint8Array>={},counts:Record<string,number>={};
for(const name of ['eyes','nose','mouth']){
 const mask=new Uint8Array(n*n);masks[name]=mask;counts[name]=0;
 for(let k=0;k<target.length;k++)if(contains(regions[name],k%n/(n-1),Math.floor(k/n)/(n-1))&&target[k]<.6){mask[k]=1;counts[name]++;}
}
let lightPixels=0;
for(let k=0;k<target.length;k++)if(inside(p.shape,k%n/(n-1),Math.floor(k/n)/(n-1))&&target[k]>=.75){light[k]=1;lightPixels++;}
const min:Record<string,any>={},support:Record<string,number>={};for(const name of Object.keys(masks)){min[name]={ratio:Infinity};support[name]=0;}
let chords=0;const minimum=p.pinBasis!.minimumAngularGapDegrees;
for(let a=0;a<p.pins.length;a++)for(let b=a+1;b<p.pins.length;b++){
 const angularGap=Math.min(b-a,p.pins.length-b+a)*360/p.pins.length;if(angularGap<minimum)continue;
 chords++;const f=strandFootprint(p,a,b,n);let spill=0;const sums={eyes:0,nose:0,mouth:0};
 for(let j=0;j<f.pixels.length;j++){const k=f.pixels[j],value=f.density[j];if(light[k])spill+=value;for(const name of Object.keys(sums))if(masks[name][k])sums[name as keyof typeof sums]+=value;}
 for(const [name,density]of Object.entries(sums))if(density>1e-10){support[name]++;const ratio=spill/density;if(ratio<min[name].ratio)min[name]={ratio,from:a,to:b,featureDensity:density,lightDensity:spill};}
}
const base=[1,3,5].reduce((sum,k)=>sum+parseInt(p.baseColor.slice(k,k+2),16)/255,0)/3;
const ink=[1,3,5].reduce((sum,k)=>sum+parseInt(instruction.segments[0].color.slice(k,k+2),16)/255,0)/3;
const rows=[];
for(const [name,mask]of Object.entries(masks))for(const tolerance of [.02,.05,.1]){
 let featureDensityRequired=0,lightDensityAllowed=0;
 for(let k=0;k<target.length;k++){
  if(mask[k])featureDensityRequired+=Math.max(0,-Math.log(Math.min(1,Math.max(1e-9,(target[k]+tolerance-ink)/(base-ink)))));
  if(light[k])lightDensityAllowed+=Math.max(0,-Math.log(Math.min(1,Math.max(1e-9,(target[k]-tolerance-ink)/(base-ink)))));
 }
 const minimumLightDensity=featureDensityRequired*min[name].ratio;
 rows.push({name,tolerance,featurePixels:counts[name],supportingChords:support[name],bestSingleChord:min[name],featureDensityRequired,lightDensityAllowed,minimumLightDensity,necessaryAggregateBoundViolated:minimumLightDensity>lightDensityAllowed+1e-6});
}
writeFileSync(out+'/chord-support-audit.json',JSON.stringify({version:'positive-density-support-audit/1',targetHash:instruction.imageHash,profile:p,reference:'320 direct target; actual reviewed normalized regions and sample centers',lightDefinition:'actual target luminance >= .75 inside board; includes face and background, not detected skin',featureDefinition:'actual target luminance < .6 inside reviewed eyes/nose/mouth',method:'For every legal positive chord, light-density / feature-density >= minimum ratio. Therefore every nonnegative combination obeys the same aggregate necessary bound. Fractional and unconstrained chords relax integer/continuity/distribution restrictions; passing cannot establish feasibility. This aggregate test does not constrain every pixel or local gradient.',base,ink,chords,lightPixels,rows,decision:rows.some(r=>r.necessaryAggregateBoundViolated)?'A necessary aggregate bound fails at the listed tolerance; this is only a model-specific sampled-region limitation.':'No aggregate representability obstruction demonstrated. This test cannot justify declaring the perimeter layout incapable. Next hypothesis: constrain local tone excess while retaining feature contrast, compared with full routed matched control; do not change materials or pins based on this audit.',physicalAcceptance:false,isAssemblyGuide:false,elapsedMs:performance.now()-started,rss:process.memoryUsage().rss},null,2),{flag:'wx'});
console.log({chords,rows:rows.map(r=>({region:r.name,tolerance:r.tolerance,ratio:r.bestSingleChord.ratio,violated:r.necessaryAggregateBoundViolated})),elapsedMs:performance.now()-started});
