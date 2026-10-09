import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const root='output/white-background';mkdirSync(root,{recursive:true});
const screen=readFileSync('C:/Users/user/AppData/Local/Temp/codex-clipboard-68140788-45d4-4fd4-8f3e-a10bebb59720.png').toString('base64');
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
page.on('pageerror',e=>console.error(e));await page.goto('http://127.0.0.1:5183/');
const data=await page.evaluate(async(screen)=>{
  const {segmentPeople,whiteBackground}=await import('/src/person-background.ts');
  const image=new Image();image.src='data:image/png;base64,'+screen;await image.decode();
  // Diagnostic crop from the owner's screenshot, not the original camera file.
  const source=document.createElement('canvas');source.width=source.height=462;
  source.getContext('2d').drawImage(image,57,198,462,462,0,0,462,462);
  const start=performance.now(),mask=await segmentPeople(source),prepared=whiteBackground(source,mask);
  const singlesMs=performance.now()-start;
  const group=document.createElement('canvas');group.width=924;group.height=462;
  const g=group.getContext('2d');g.drawImage(source,0,0);g.drawImage(source,462,0);
  const t=performance.now(),groupMask=await segmentPeople(group),groupPrepared=whiteBackground(group,groupMask);
  const m=document.createElement('canvas');m.width=mask.width;m.height=mask.height;
  const mc=m.getContext('2d'),pixels=mc.createImageData(mask.width,mask.height);
  mask.values.forEach((v,i)=>pixels.data.set([Math.round(v*255),Math.round(v*255),Math.round(v*255),255],i*4));mc.putImageData(pixels,0,0);
  function rgb(c,x,y){return Array.from(c.getContext('2d').getImageData(x,y,1,1).data);}
  return {source:source.toDataURL(),prepared:prepared.toDataURL(),mask:m.toDataURL(),group:group.toDataURL(),groupPrepared:groupPrepared.toDataURL(),
    measurements:{singlesMs,groupMs:performance.now()-t,maskSize:[mask.width,mask.height],background:rgb(prepared,448,210),face:rgb(prepared,235,245),sourceFace:rgb(source,235,245),leftPerson:rgb(groupPrepared,235,245),rightPerson:rgb(groupPrepared,697,245)}};
},screen);
for(const name of ['source','prepared','mask','group','groupPrepared'])writeFileSync(`${root}/${name}.png`,Buffer.from(data[name].split(',')[1],'base64'));
writeFileSync(`${root}/measurements.json`,JSON.stringify(data.measurements,null,2)+'\n');
writeFileSync(`${root}/report.html`,`<!doctype html><meta charset="utf-8"><title>Local white-background diagnostic</title><style>body{font:18px system-ui;background:#faf8f0;color:#254b3e;padding:28px}section{display:flex;flex-wrap:wrap;gap:24px}figure{margin:0}img{max-width:440px;width:100%}.group{max-width:900px}pre{white-space:pre-wrap}</style><h1>Local white-background diagnostic</h1><p>Source: cropped owner screenshot, not full-resolution camera input. Foreground likeness and physical strands still need human review.</p><section><figure><img src="source.png"><figcaption>Original screenshot crop</figcaption></figure><figure><img src="prepared.png"><figcaption>Automatic local separation</figcaption></figure><figure><img src="mask.png"><figcaption>Foreground confidence, not face detection</figcaption></figure></section><h2>Constructed two-person coverage check</h2><p>This repeats the same portrait side by side. It checks that both foreground regions survive; it is not validation on diverse group photographs.</p><img class="group" src="groupPrepared.png"><pre>${JSON.stringify(data.measurements,null,2)}</pre>`);
console.log(JSON.stringify(data.measurements));await browser.close();
