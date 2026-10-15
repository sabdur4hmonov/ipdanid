import {it,expect} from "vitest";
import {PDFDocument,PDFName,PDFArray,PDFRawStream,decodePDFRawStream} from "pdf-lib";
import {DEFAULT_STANDARD_KIT,standardProfiles,combinedHoles,validateStandardProfile,pinLabel,sectorPin} from "../src/core/standard-kit";
import {standardKitPdf,stickerMarks} from "../src/core/standard-kit-pdf";
import {KitStore} from "../server/kit-store";
import {adminRoutePermission} from "../server/admin-access";
import {connectionAllowed,insideProfile} from "../src/core/geometry";
it("one base has720 unique collision-free holes, actual460 circle, square470 and legal240 heart",()=>{
 const profiles=standardProfiles(DEFAULT_STANDARD_KIT),holes=combinedHoles(profiles);
 expect(holes).toHaveLength(720);
 let gap=Infinity;
 for(let j=0;j<holes.length;j++)for(let k=0;k<j;k++)gap=Math.min(gap,Math.hypot(holes[j].xMm-holes[k].xMm,holes[j].yMm-holes[k].yMm));
 expect(gap).toBeGreaterThanOrEqual(3);
 expect(profiles[0].pins[0].y*500).toBeCloseTo(20,9);
 expect(profiles[1].pins[0].y*500).toBeCloseTo(15,9);
 expect(profiles[2].standardKit!.maxPeople).toBe(2);
 for(const p of profiles){validateStandardProfile(p);const altered=structuredClone(p);altered.pins[4].x+=.0001;expect(()=>validateStandardProfile(altered)).toThrow("coordinate");}
 expect(()=>standardProfiles({...DEFAULT_STANDARD_KIT,squareSideMm:460})).toThrow(/collision/);
 expect(()=>standardProfiles({...DEFAULT_STANDARD_KIT,sectors:7})).toThrow();
 const heart=profiles[2];let accepted=0,rejected=0;
 for(let a=0;a<240;a+=13)for(let b=a+5;b<240;b+=17){
  if(connectionAllowed(heart,a,b)){
   accepted++;for(let j=1;j<100;j++){const t=j/100;expect(insideProfile(heart,heart.pins[a].x*(1-t)+heart.pins[b].x*t,heart.pins[a].y*(1-t)+heart.pins[b].y*t)).toBe(true);}
  }else rejected++;
 }
 expect(accepted).toBeGreaterThan(0);expect(rejected).toBeGreaterThan(0);
});
it("sectors keep exact numeric IDs and original physical sticker tick locations",()=>{
 for(const sectors of [4,8])for(const p of standardProfiles({...DEFAULT_STANDARD_KIT,sectors}))for(let id=0;id<240;id++){
  expect(sectorPin(p,pinLabel(p,id))).toBe(id);
  expect(sectorPin(p,pinLabel(p,id,false))).toBe(id);
  const tick=stickerMarks(p)[id];expect(tick.xMm).toBe(p.pins[id].x*500);expect(tick.yMm).toBe(p.pins[id].y*500);
 }
 const p=standardProfiles(DEFAULT_STANDARD_KIT)[0];expect(pinLabel(p,76)).toBe("B-17");expect(sectorPin(p,"D-61")).toBeUndefined();
});
it("admin revisions reject lost updates/collisions, default3 and existing grants stay unchanged",()=>{
 const s=new KitStore(":memory:","p".repeat(32),"k".repeat(32));
 try{
  expect(s.kitPolicy().quota).toBe(3);
  const code=s.issueKitBatch("admin","standard-circle-r1",1,"old-batch-1").codes[0].code;
  const account=s.loginKit(code);expect(account.credits).toBe(3);
  const old=standardProfiles(s.standardKit())[0],updated=s.setStandardKit("admin",{...s.standardKit(),sectors:8});
  expect(updated.revision).toBe(2);expect(()=>s.setStandardKit("admin",DEFAULT_STANDARD_KIT)).toThrow(/reload/);
  expect(()=>s.setStandardKit("admin",{...updated,squareSideMm:460})).toThrow(/collision/);
  validateStandardProfile(old);expect(s.kitBalance(account.id)).toBe(3);
  s.setKitPolicy("admin",{...s.kitPolicy(),quota:4});
  expect(s.issueKitBatch("admin","standard-circle-r2",1,"new-batch-2").codes[0].quota).toBe(4);
  expect(s.kitBalance(account.id)).toBe(3);
  expect(adminRoutePermission("POST","/api/admin/kits/profiles")).toBe("codes");
 }finally{s.close();}
});
it("full sheet is exactly500mm, A4 tiles have real-size board coordinates and50mm calibration",async()=>{
 const mm=72/25.4;
 const sheet=await PDFDocument.load(await standardKitPdf(DEFAULT_STANDARD_KIT,"sheet"));
 expect(sheet.getPageCount()).toBe(1);expect(sheet.getPage(0).getWidth()).toBeCloseTo(500*mm,8);
 expect(sheet.getPage(0).getHeight()).toBeCloseTo(500*mm,8);
 const tiles=await PDFDocument.load(await standardKitPdf(DEFAULT_STANDARD_KIT,"tiles"));
 expect(tiles.getPageCount()).toBe(6);
 const holes=combinedHoles(standardProfiles(DEFAULT_STANDARD_KIT));
 for(let page=0;page<6;page++){
  const p=tiles.getPage(page);expect(p.getWidth()).toBeCloseTo(210*mm,8);
  const streams=p.node.lookup(PDFName.of("Contents"),PDFArray);
  const content=streams.asArray().map(s=>Buffer.from(decodePDFRawStream(tiles.context.lookup(s) as PDFRawStream).decode()).toString()).join("\n");
  // PDF circles start with x-r,y m. Every hole's board-space transform must exist,
  // including clipped copies on overlapping tiles; no fit-to-page scaling.
  const move=[...content.matchAll(/(-?[\d.]+) (-?[\d.]+) m/g)].map(m=>[Number(m[1]),Number(m[2])]);
  const ox=page%3*180,oy=Math.floor(page/3)*247;
  for(const h of holes){const x=(10+h.xMm-ox)*mm-DEFAULT_STANDARD_KIT.shaftMm/2*mm,y=(297-25-h.yMm+oy)*mm;expect(move.some(v=>Math.abs(v[0]-x)<1e-6&&Math.abs(v[1]-y)<1e-6)).toBe(true);}
  expect(content).toContain(`${10*mm} ${9*mm} m`);
 }
 const stickers=await PDFDocument.load(await standardKitPdf(DEFAULT_STANDARD_KIT,"stickers"));expect(stickers.getPageCount()).toBe(18);
});
