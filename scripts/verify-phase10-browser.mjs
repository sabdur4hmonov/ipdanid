import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const paths=['test-results/phase10-acceptance-v3/report.json','test-results/phase10-final-regression/report.json','test-results/phase10-final-heart/report.json'];
const latest=new Map(),runs=[];
for(const path of paths){
 const report=JSON.parse(readFileSync(path,'utf8'));runs.push({path,stats:report.stats});
 function visit(suite){
  for(const spec of suite.specs??[])for(const test of spec.tests??[]){
   const result=test.results.at(-1),key=[test.projectName,(spec.file??suite.file??'').replaceAll('\\','/'),spec.title].join(' / ');
   latest.set(key,{key,status:result?.status,report:path});
  }
  for(const child of suite.suites??[])visit(child);
 }
 for(const suite of report.suites??[])visit(suite);
}
const rows=[...latest.values()],failed=rows.filter(r=>r.status!=='passed');
if(rows.length!==36||failed.length)throw Error(JSON.stringify({unique:rows.length,failed}));
const unit=JSON.parse(readFileSync('test-results/phase10-full-unit.json','utf8'));
if(unit.numFailedTests!==0||unit.numPassedTests!==248)throw Error('Full unit regression evidence incomplete');
mkdirSync('test-results/phase10-final',{recursive:true});
const summary={latestUniqueBrowserCases:rows.length,allLatestPassed:true,fullUnitPassed:unit.numPassedTests,runs,rows,note:'The24-case focused run had22passes/2red-selection failures. Both were fixed and passed on both devices in the4-case final supplemental run. This verifies36 unique latest outcomes, not a claim of an uninterrupted36-case run or the full historical200-case suite.'};
writeFileSync('test-results/phase10-final/summary.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({latestUniqueBrowserCases:rows.length,fullUnitPassed:unit.numPassedTests,allLatestPassed:true}));
