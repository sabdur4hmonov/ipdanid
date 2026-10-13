import {it,expect} from 'vitest';
import {createProfile} from '../src/core/geometry';
import {finiteStrandFootprint} from '../src/core/finite-strand';
it('finite physical rectangle coverage conserves area across angles, grids and unequal axes',()=>{
 const p={...createProfile('rectangle',32),widthMm:400,heightMm:600,threadMm:.1,opacity:.85};
 for(const n of [160,320,512])for(const angle of [0,.01,.37,.8,1.1,Math.PI/2]){
  const dx=Math.cos(angle)*100,dy=Math.sin(angle)*100;p.pins=[{id:0,x:.5-dx/800,y:.5-dy/1200},{id:1,x:.5+dx/800,y:.5+dy/1200}];
  const a=finiteStrandFootprint(p,0,1,n),b=finiteStrandFootprint(p,1,0,n);
  const mass=Array.from(a.alpha).reduce((s,v)=>s+v,0),expected=.85*.1*100*(n-1)**2/(400*600);
  expect(Math.abs(mass-expected)/expected).toBeLessThan(1e-6);
  expect(a.pixels).toEqual(b.pixels);for(let k=0;k<a.alpha.length;k++)expect(a.alpha[k]).toBeCloseTo(b.alpha[k],6);
 }
});
it('bounds the audit and exposes actual cell coverage without a full-grid scan',()=>{
 const p={...createProfile('rectangle',32),threadMm:.1};p.pins=[{id:0,x:.2,y:.4},{id:1,x:.8,y:.4}];
 const f=finiteStrandFootprint(p,0,1,320);
 expect(f.pixels.length).toBeLessThan(640);expect([...f.alpha].every(v=>v>0&&v<1)).toBe(true);
 expect(()=>finiteStrandFootprint(p,0,1,513)).toThrow();expect(()=>finiteStrandFootprint(p,0,0,320)).toThrow();
});
