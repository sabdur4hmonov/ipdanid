import {test,expect} from '@playwright/test';
import {readFileSync,readdirSync} from 'node:fs';
test('real feature Worker materializes bound checkpoint and rejects altered target without losing job association',async({page})=>{
 test.setTimeout(180000);
 const seed=JSON.parse(readFileSync('output/resolved-convergence/final.json','utf8')).project.instruction;
 const expected=JSON.parse(readFileSync('output/feature-contrast/features.json','utf8')).project.instruction;
 const resume=JSON.parse(readFileSync('output/feature-contrast/features-fit.json','utf8'));
 const pixels=Array.from(readFileSync('output/portrait-dispatch/target-320.bin'));
 const name=readdirSync('dist/assets').find(n=>n.startsWith('generator.worker-'))!;
 await page.goto('/');
 const messages=await page.evaluate(async({seed,expected,resume,pixels,name})=>{
  const run=(bad:boolean)=>new Promise<any>((resolve,reject)=>{
   const worker=new Worker('/assets/'+name,{type:'module'}),events:any[]=[];
   const timeout=setTimeout(()=>{worker.terminate();reject(Error('Bound Worker materialization timed out'));},120000);
   worker.onmessage=({data})=>{events.push({type:data.type,jobId:data.jobId});if(['done','error'].includes(data.type)){clearTimeout(timeout);worker.terminate();resolve({data,events});}};
   worker.onerror=e=>{clearTimeout(timeout);worker.terminate();reject(Error(e.message));};
   const target=Uint8Array.from(pixels);if(bad)target[0]^=1;
   worker.postMessage({jobId:bad?'changed-target':'bound-features',strategy:'features',seed,pixels:target,profile:seed.profile,portrait:seed.params.portrait,resolution:320,mode:seed.params.mode,lines:seed.params.requestedLines,stockPolicy:'estimate',features:expected.params.optimization.features,totalSweeps:8,resume});
  });
  return [await run(false),await run(true)];
 },{seed,expected,resume,pixels,name});
 expect(messages[0].data.type).toBe('done');expect(messages[0].data.instruction.sequenceHash).toBe(expected.sequenceHash);
 expect(messages[0].data.instruction.segments).toEqual(expected.segments);
 expect(messages[0].data.instruction.params.optimization.features).toEqual(expected.params.optimization.features);
 expect(messages[0].events.every((e:any)=>e.jobId==='bound-features')).toBe(true);
 expect(messages[1].data.type).toBe('error');expect(messages[1].data.jobId).toBe('changed-target');
});
