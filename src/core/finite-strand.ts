import type { MaterialProfile } from './types';
import type { Footprint } from './optical';
type Point={x:number;y:number};
// Audit model only until separately validated/versioned. Pixel cells are centered
// on integer samples; physical axes have independent width/(n-1) scales.
function clip(poly:Point[],axis:'x'|'y',bound:number,greater:boolean):Point[]{
 const out:Point[]=[];if(!poly.length)return out;
 let prev=poly[poly.length-1],pin=greater?prev[axis]>=bound:prev[axis]<=bound;
 for(const curr of poly){const cin=greater?curr[axis]>=bound:curr[axis]<=bound;
  if(cin!==pin){const t=(bound-prev[axis])/(curr[axis]-prev[axis]);out.push({x:prev.x+(curr.x-prev.x)*t,y:prev.y+(curr.y-prev.y)*t});}
  if(cin)out.push(curr);prev=curr;pin=cin;
 }return out;
}
function area(poly:Point[]){let sum=0;for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length];sum+=a.x*b.y-b.x*a.y;}return Math.abs(sum)*.5;}
export function finiteStrandFootprint(p:MaterialProfile,from:number,to:number,n:number):Footprint{
 if(!Number.isInteger(n)||n<32||n>512||!p.pins[from]||!p.pins[to]||from===to||![p.widthMm,p.heightMm,p.threadMm,p.opacity].every(Number.isFinite)||p.widthMm<=0||p.heightMm<=0||p.threadMm<=0||p.opacity<=0||p.opacity>1)throw Error('Invalid finite strand audit');
 const a=p.pins[from],b=p.pins[to],dx=(b.x-a.x)*p.widthMm,dy=(b.y-a.y)*p.heightMm,length=Math.hypot(dx,dy);
 if(length<=0)throw Error('Zero finite strand length');
 const ox=-dy/length*p.threadMm*.5*(n-1)/p.widthMm,oy=dx/length*p.threadMm*.5*(n-1)/p.heightMm;
 const ax=a.x*(n-1),ay=a.y*(n-1),bx=b.x*(n-1),by=b.y*(n-1);
 const polygon=[{x:ax+ox,y:ay+oy},{x:bx+ox,y:by+oy},{x:bx-ox,y:by-oy},{x:ax-ox,y:ay-oy}];
 const pixels:number[]=[],alphas:number[]=[];
 for(let y=Math.max(0,Math.floor(Math.min(...polygon.map(v=>v.y))+.5));y<=Math.min(n-1,Math.floor(Math.max(...polygon.map(v=>v.y))+.5));y++){
  const strip=clip(clip(polygon,'y',y-.5,true),'y',y+.5,false);if(!strip.length)continue;
  const lo=Math.max(0,Math.floor(Math.min(...strip.map(v=>v.x))+.5)),hi=Math.min(n-1,Math.floor(Math.max(...strip.map(v=>v.x))+.5));
  for(let x=lo;x<=hi;x++){const value=area(clip(clip(strip,'x',x-.5,true),'x',x+.5,false))*p.opacity;
   if(value>1e-12){pixels.push(y*n+x);alphas.push(Math.min(1,value));}
  }
 }
 const alpha=Float32Array.from(alphas);
 return{pixels:Uint32Array.from(pixels),alpha,density:Float32Array.from(alpha,v=>v>=1?0:-Math.log1p(-v))};
}
