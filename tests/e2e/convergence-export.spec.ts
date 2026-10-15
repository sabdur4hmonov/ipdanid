import {test,expect} from './legacy-test';
import {readFileSync} from 'node:fs';
test('complete 24-sweep path has exact zero-progress player and JSON/TXT/PNG/PDF exports',async({page},info)=>{
 test.setTimeout(180000);const file=JSON.parse(readFileSync('output/resolved-convergence/final.json','utf8')),i=file.project.instruction;
 await page.goto('/');await page.getByLabel('Language').selectOption('en');await page.getByRole('button',{name:'My projects',exact:true}).click();
 await page.locator('input[accept=".json,.txt"]').setInputFiles('output/resolved-convergence/final.json');
 await expect(page.getByTestId('player-hash')).toHaveText(i.sequenceHash);await expect(page.getByTestId('confirmed-step')).toContainText(`0/${i.metrics.lines}`);
 for(const [button,name]of[['Project JSON','guide.json'],['TXT sequence','guide.txt'],['Preview PNG','preview.png'],['PDF guide','guide.pdf']]){
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:button,exact:true}).last().click();const download=await pending;const path=(await download.path())!;
  if(name.endsWith('.json')){const actual=JSON.parse(readFileSync(path,'utf8'));expect(actual.project.instruction).toEqual(i);expect(actual.project.progress.confirmed).toBe(0);expect(actual.project.pixels).toBeUndefined();}
  if(name.endsWith('.txt'))expect(JSON.parse(readFileSync(path,'utf8').split('\n')[1])).toEqual(i);
  await download.saveAs(`output/resolved-convergence/${info.project.name}-${name}`);
 }
 await page.screenshot({path:`output/resolved-convergence/player-${info.project.name}.png`,fullPage:true});
});
