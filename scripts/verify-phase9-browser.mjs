import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const full='test-results/phase9-final-full-e2e/report.json';
const supplemental='test-results/phase9-final-targeted-e2e/report.json';
function read(path){return JSON.parse(readFileSync(path,'utf8'));}
function cases(report){
 const rows=[];
 function walk(suite){
  for(const spec of suite.specs||[])for(const test of spec.tests){
   const result=test.results.at(-1);
   rows.push({key:JSON.stringify([test.projectName,spec.file,spec.title]),project:test.projectName,file:spec.file,title:spec.title,
    passed:test.expectedStatus==='passed'&&test.status==='expected'&&result?.status==='passed',status:result?.status});
  }
  for(const child of suite.suites||[])walk(child);
 }
 for(const suite of report.suites)walk(suite);
 return rows;
}
const initial=read(full),original=cases(initial);
assert.equal(original.length,184);assert.equal(new Set(original.map(r=>r.key)).size,184);
if(process.argv.includes('--rerun')){
 const titles=[...new Set(original.filter(r=>!r.passed||r.file==='standard-kit.spec.ts'||(r.file==='kit-build.spec.ts'&&r.title.startsWith('admin configures'))).map(r=>r.title))];
 const pattern=titles.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 assert.equal(process.env.IP_RASM_TEST_REPORT,supplemental,'Use the dedicated fresh supplemental report');
 assert.equal(process.env.IP_RASM_TEST_WEB_DIR,'output/phase9-dist');
 console.log(JSON.stringify({originalStats:initial.stats,selectedTitles:titles}));
 const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','--grep',pattern],{stdio:'inherit',env:process.env,windowsHide:true});
 child.on('exit',code=>{process.exitCode=code??1;});
}else{
 const next=read(supplemental),updated=cases(next),latest=new Map(original.map(r=>[r.key,{...r,report:full}]));
 for(const row of updated){assert(latest.has(row.key),'Unexpected supplemental case');latest.set(row.key,{...row,report:supplemental});}
 const failures=[...latest.values()].filter(r=>!r.passed);
 assert.equal(failures.length,0,JSON.stringify(failures));
 assert.equal(next.stats.unexpected+next.stats.skipped+next.stats.flaky,0);
 const evidence={uniquePassingCases:latest.size,desktop:[...latest.values()].filter(r=>r.project==='desktop').length,
  mobile:[...latest.values()].filter(r=>r.project==='mobile-browser').length,
  fullRun:{path:full,stats:initial.stats},supplemental:{path:supplemental,stats:next.stats},
  scope:'Full run on pre-ruler-correction stable1965 bundle; latest PDF-only change verified by standard-kit/admin downloads and all diagnostic failures explicitly rerun. Raw failure reports retained; this is aggregate latest coverage, not a clean all-pass single full run.',cases:[...latest.values()]};
 mkdirSync('test-results/phase9-final',{recursive:true});
 writeFileSync('test-results/phase9-final/summary.json',JSON.stringify(evidence,null,2));
 console.log(JSON.stringify({...evidence,cases:undefined}));
}
