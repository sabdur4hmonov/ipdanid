import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true});
try{
 const rows=[];
 for(const [name,width,height] of [['desktop',1400,1100],['touch',412,915]]){
  const page=await browser.newPage({viewport:{width,height}});
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:5183/output/portrait-resolved/report.html');
  await page.locator('img').first().waitFor();
  const evidence=await page.evaluate(()=>({images:Array.from(document.images).map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),overflow:document.documentElement.scrollWidth>innerWidth}));
  if(evidence.overflow||evidence.images.some(i=>!i.loaded))throw Error('Incomplete report/overflow: '+name);
  await page.screenshot({path:`output/portrait-resolved/${name}-report.png`});rows.push({name,...evidence});await page.close();
 }
 writeFileSync('output/portrait-resolved/report-review.json',JSON.stringify(rows,null,2));
}finally{await browser.close();}
