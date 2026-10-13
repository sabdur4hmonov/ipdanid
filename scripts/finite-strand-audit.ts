import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {finiteStrandFootprint} from '../src/core/finite-strand';
import {strandFootprint,rasterSequenceAtResolution} from '../src/core/optical';
import {validateInstruction} from '../src/core/validation';
import {inside} from '../src/core/geometry';
import {hash} from '../src/core/engine';
import {anatomicalImportance} from '../src/core/anatomical-importance';
const folder='output/head-quality';mkdirSync(folder,{recursive:true});if(existsSync(folder+'/kernel-audit.json'))throw Error('Preserve completed audit');
const payload=JSON.parse(readFileSync('output/portrait-resolved/candidate.json','utf8')),i=await validateInstruction(payload.project.instruction),start=performance.now(),rows=[];
for(const n of [160,320,512]){
 const grid=new Float32Array(n*n*3);const base=[1,3,5].map(k=>parseInt(i.profile.baseColor.slice(k,k+2),16)/255);for(let k=0;k<grid.length;k++)grid[k]=base[k%3];
 let traversals=0,coverageError=0,cells=0;
 for(const s of i.segments){const ink=[1,3,5].map(k=>parseInt(s.color.slice(k,k+2),16)/255);
  for(let j=1;j<s.path.length;j++){const f=finiteStrandFootprint(i.profile,s.path[j-1],s.path[j],n),a=i.profile.pins[s.path[j-1]],b=i.profile.pins[s.path[j]],length=Math.hypot((a.x-b.x)*i.profile.widthMm,(a.y-b.y)*i.profile.heightMm);
   const expected=i.profile.opacity*i.profile.threadMm*length*(n-1)**2/(i.profile.widthMm*i.profile.heightMm),actual=f.alpha.reduce((sum,v)=>sum+v,0);coverageError=Math.max(coverageError,Math.abs(expected-actual)/expected);cells+=f.pixels.length;traversals++;
   f.pixels.forEach((pixel,k)=>{if(!inside(i.profile.shape,pixel%n/(n-1),Math.floor(pixel/n)/(n-1)))return;for(let c=0;c<3;c++)grid[pixel*3+c]+=(ink[c]-grid[pixel*3+c])*f.alpha[k];});
  }
 }
 writeFileSync(`${folder}/finite-${n}.bin`,Uint8Array.from(grid,v=>Math.round(v*255)));writeFileSync(`${folder}/bilinear-${n}.bin`,Uint8Array.from(rasterSequenceAtResolution(i,n),v=>Math.round(v*255)));
 rows.push({n,traversals,cells,maxRelativeCoverageError:coverageError,elapsedMs:performance.now()-start});console.log(rows.at(-1));
}
// Explicit manual audit box for this prepared target, not automatic hair detection.
const hair={left:.175,top:.045,width:.66,height:.51},importance=anatomicalImportance(i.params.portrait!),n=320;let count=0,weight=0,low=0;
for(let y=0;y<n;y++)for(let x=0;x<n;x++){const nx=x/(n-1),ny=y/(n-1);if(nx<hair.left||nx>hair.left+hair.width||ny<hair.top||ny>hair.top+hair.height)continue;const w=importance(nx,ny);count++;weight+=w;if(w===1)low++;}
writeFileSync(folder+'/kernel-audit.json',JSON.stringify({sourceHash:i.imageHash,sequenceHash:i.sequenceHash,unchangedExecutableSequence:true,model:'finite-width-cell-area-audit/1',isGenerationGuide:false,physicalAcceptance:false,rows,hairWindow:{placement:'manual diagnostic bounding box; includes white edges',reference:'processed-target/sample-centers-v1',box:hair,pixels:count,lowWeightPixels:low,fractionLowWeight:low/count,meanWeight:weight/count},rss:process.memoryUsage().rss,totalMs:performance.now()-start},null,2));
