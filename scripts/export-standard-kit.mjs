import {mkdirSync,writeFileSync} from 'node:fs';
import {DEFAULT_STANDARD_KIT,standardProfiles,combinedHoles} from '../src/core/standard-kit.ts';
import {standardKitPdf,stickerMarks} from '../src/core/standard-kit-pdf.ts';
import {hash} from '../src/core/engine.ts';
const out='output/phase9/templates';mkdirSync(out,{recursive:true});
const profiles=standardProfiles(DEFAULT_STANDARD_KIT),configHash=await hash(DEFAULT_STANDARD_KIT);
for(const kind of ['sheet','tiles','stickers']){
 const bytes=await standardKitPdf(DEFAULT_STANDARD_KIT,kind);
 writeFileSync(`${out}/standard-kit-${kind}.pdf`,bytes);
}
writeFileSync(`${out}/coordinates.json`,JSON.stringify({config:DEFAULT_STANDARD_KIT,configHash,reference:'physical-mm/y-down/1',holes:combinedHoles(profiles),stickers:profiles.map(p=>({pattern:p.shape,marks:stickerMarks(p)}))},null,2));
console.log(JSON.stringify({out,configHash,holes:720,fullMm:500,a4Tiles:6,stickerPages:18}));
