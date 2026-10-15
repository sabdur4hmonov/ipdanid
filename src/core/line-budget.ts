import type { Instruction } from "./types";
import { inside } from "./geometry";
import { rasterSequence } from "./optical";
export interface QualityPoint { connections:number; mse:number; meters:number; hours:number }
export function qualityCurve(i:Instruction,target:Uint8Array,counts=[1000,1500,2000,2500,3000,3500]):QualityPoint[] {
  const n=i.params.resolution,p=i.profile;
  if(target.length!==n*n*3)throw Error("Invalid curve target");
  return [...new Set(counts.map(v=>Math.min(i.metrics.lines,v)))].filter(v=>v>0).sort((a,b)=>a-b).map(connections=>{
    const raster=rasterSequence(i,connections);let loss=0,pixels=0,meters=.5,at=0;
    for(let k=0;k<n*n;k++)if(inside(p.shape,k%n/(n-1),Math.floor(k/n)/(n-1)))for(let c=0;c<3;c++){loss+=(raster[k*3+c]-target[k*3+c]/255)**2;pixels++;}
    for(const s of i.segments)for(let j=1;j<s.path.length && at++<connections;j++){
      const a=p.pins[s.path[j-1]],b=p.pins[s.path[j]];
      meters+=(Math.hypot((b.x-a.x)*p.widthMm,(b.y-a.y)*p.heightMm)+p.wrapAllowanceMm)/1000*(1+p.wasteFraction);
    }
    return {connections,mse:loss/pixels,meters,hours:connections*8/3600};
  });
}
export function measuredKnee(points:QualityPoint[]) {
  if(points.length<3)return {status:"inconclusive" as const};
  const first=points[0],last=points.at(-1)!,gain=first.mse-last.mse;
  if(gain<=1e-8 || last.connections<=first.connections)return {status:"inconclusive" as const};
  const scores=points.slice(1,-1).map(p=>({point:p,distance:(first.mse-p.mse)/gain-(p.connections-first.connections)/(last.connections-first.connections)}));
  scores.sort((a,b)=>b.distance-a.distance);
  const best=scores[0];
  return best.distance>.01?{status:"measured" as const,...best.point,desiredRangeMet:best.point.connections>=2000 && best.point.connections<=3000}:{status:"inconclusive" as const};
}
