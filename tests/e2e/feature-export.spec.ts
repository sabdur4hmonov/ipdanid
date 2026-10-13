import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {PDFDocument,PDFName,PDFRawStream,decodePDFRawStream} from 'pdf-lib';
import {rasterSequence} from '../../src/core/optical';
test('experimental fine-feature path has exact zero-progress player and JSON/TXT/PNG/PDF exports',async({page},info)=>{
 test.setTimeout(180000);const file=JSON.parse(readFileSync('output/feature-contrast/features.json','utf8')),i=file.project.instruction;
 await page.goto('/');await page.getByLabel('Language').selectOption('en');await page.getByRole('button',{name:'My projects',exact:true}).click();
 await page.locator('input[accept=".json,.txt"]').setInputFiles('output/feature-contrast/features.json');
 await expect(page.getByTestId('player-hash')).toHaveText(i.sequenceHash);await expect(page.getByTestId('confirmed-step')).toContainText(`0/${i.metrics.lines}`);
 for(const [button,name]of[['Project JSON','guide.json'],['TXT sequence','guide.txt'],['Preview PNG','preview.png'],['PDF guide','guide.pdf']]){
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:button,exact:true}).last().click();const download=await pending;const path=(await download.path())!;
  if(name.endsWith('.json')){const actual=JSON.parse(readFileSync(path,'utf8'));expect(actual.project.instruction).toEqual(i);expect(actual.project.progress.confirmed).toBe(0);expect(actual.project.pixels).toBeUndefined();}
  if(name.endsWith('.txt'))expect(JSON.parse(readFileSync(path,'utf8').split('\n')[1])).toEqual(i);
  if(name.endsWith('.pdf')){
   const pdf=await PDFDocument.load(readFileSync(path));
   const resources=pdf.getPage(0).node.Resources()!;
   const images=resources.lookup(PDFName.of('XObject')) as any;
   expect(images,'Optical PDF cover must embed the exact raster, never fall back to opaque lines').toBeTruthy();
   const previews=images.entries().map((entry:any)=>pdf.context.lookup(entry[1])).filter((s:any)=>s instanceof PDFRawStream&&s.dict.get(PDFName.of('Subtype'))?.toString()==='/Image');
   expect(previews).toHaveLength(1);
   expect(previews[0].dict.get(PDFName.of('Width')).asNumber()).toBe(i.params.resolution);
   expect(Buffer.from(decodePDFRawStream(previews[0]).decode())).toEqual(Buffer.from(Uint8Array.from(rasterSequence(i),v=>Math.round(v*255))));
  }
  await download.saveAs(`output/feature-contrast/${info.project.name}-${name}`);
 }
 await page.screenshot({path:`output/feature-contrast/player-${info.project.name}.png`,fullPage:true});
});
