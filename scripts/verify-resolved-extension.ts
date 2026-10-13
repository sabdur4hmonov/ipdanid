import {readFileSync,writeFileSync} from 'node:fs';
import {generateDensity} from '../src/core/density';
import {defaultPhysicalContrast} from '../src/core/physical-contrast';
import {validateInstruction} from '../src/core/validation';
const f='output/portrait-dispatch',out='output/resolved-convergence';
const reference=JSON.parse(readFileSync(f+'/resolved240.json','utf8')).project.instruction;
const cp=JSON.parse(readFileSync(f+'/resolved240-fit.json','utf8'));
const pixels=new Uint8Array(readFileSync(f+'/target-320.bin'));
const options={profile:reference.profile,portrait:reference.params.portrait,resolution:320,mode:reference.params.mode,lines:reference.params.requestedLines,pixels};
const tuning={resolved:true,edgeWeight:2,sweeps:24,physical:defaultPhysicalContrast(),extension:{version:'resolved-convergence/1' as const,reference,checkpoint:cp,priorSweepLimit:8}};
const rows=[];
const badPixels=pixels.slice();badPixels[300]++;
const badRegion=structuredClone(options.portrait);badRegion.regions.nose.left+=.001;
const badCp=structuredClone(cp);badCp.counts[1]++;
for(const [name,o,t]of [
 ['target',{...options,pixels:badPixels},tuning],
 ['material',{...options,profile:{...options.profile,threadMm:.11}},tuning],
 ['regions',{...options,portrait:badRegion},tuning],
 ['checksum',options,{...tuning,extension:{...tuning.extension,checkpoint:badCp}}],
 ['unversioned-extension',options,{...tuning,extension:{...tuning.extension,version:undefined}}],
 ['over-budget',options,{...tuning,sweeps:25}],
] as const){let refused=false,error='';try{await generateDensity(o as any,t as any);}catch(e){refused=true;error=String(e);}if(!refused)throw Error('Accepted incompatible '+name);rows.push({name,refused,error});}
const final=await validateInstruction(JSON.parse(readFileSync(out+'/final.json','utf8')).project.instruction);
const bad=structuredClone(final);bad.params.optimization!.convergence!.version='density-convergence/1';let provenanceRejected=false;
try{await validateInstruction(bad);}catch{provenanceRejected=true;}if(!provenanceRejected)throw Error('Forged provenance accepted');
writeFileSync(out+'/extension-integrity.json',JSON.stringify({cases:rows,provenanceRejected,oldStateStillEqual:JSON.stringify(cp)===JSON.stringify(JSON.parse(readFileSync(f+'/resolved240-fit.json','utf8'))),finalHash:final.sequenceHash},null,2),{flag:'wx'});console.log('All6 incompatible states and forged provenance refused; old state preserved.');
