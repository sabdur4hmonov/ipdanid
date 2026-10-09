"""Equal source-relative windows; rendering only real sealed paths, no source overlay."""
from pathlib import Path
import json, math, html
from collections import Counter
import numpy as np
from PIL import Image, ImageDraw
f=Path('output/outline');names=['baseline','rectangle','outline'];n=160
projects={k:json.loads((f/('baseline.json' if k=='baseline' else k+'-guide.json')).read_text())['project'] for k in names}
settings={k:json.loads((f/(k+'-settings.json')).read_text()) for k in names}
selection=json.loads((f/'selection.json').read_text())
def forward(x,y,e):
    scale=n/960*e['zoom'];a=math.radians(e['rotation']);dx=(x-480)*scale+e['panX']*n;dy=(y-640)*scale+e['panY']*n
    return ((n/2+math.cos(a)*dx-math.sin(a)*dy-.5)/(n-1),(n/2+math.sin(a)*dx+math.cos(a)*dy-.5)/(n-1))
def inverse(x,y,e):
    scale=n/960*e['zoom'];a=math.radians(e['rotation']);dx=x*(n-1)+.5-n/2;dy=y*(n-1)+.5-n/2
    return ((math.cos(a)*dx+math.sin(a)*dy-e['panX']*n)/scale+480,(-math.sin(a)*dx+math.cos(a)*dy-e['panY']*n)/scale+640)
regions={}
for name,b in settings['baseline']['portrait']['regions'].items():
    if not isinstance(b,dict):continue
    regions[name]=[inverse(b['left'],b['top'],settings['baseline']['edits']),inverse(b['left']+b['width'],b['top']+b['height'],settings['baseline']['edits'])]
images={};stats={};diagnostics={};full=Image.new('RGB',(720,3*280),'#faf8ef');d=ImageDraw.Draw(full)
feature_sheet=Image.new('RGB',(9*150,len(regions)*184),'white');fd=ImageDraw.Draw(feature_sheet)
for row,k in enumerate(names):
    p=projects[k];i=p['instruction'];raster=np.frombuffer((f/(k+'-sequence.f32')).read_bytes(),dtype='<f4').reshape(n,n,3)
    sequence=Image.fromarray(np.clip(np.floor(raster*255+.5),0,255).astype('uint8'));sequence.save(f/(k+'-sequence.png'))
    images[k]={'source':Image.open(f/(k+'-source.png')).convert('RGB'),'target':Image.open(f/(k+'-target.png')).convert('RGB'),'sequence':sequence}
    for col,kind in enumerate(['source','target','sequence']):
        full.paste(images[k][kind].resize((224,224)),(col*240,row*280+40));d.text((col*240,row*280+10),k+' / '+kind,fill='black')
    pairs=Counter();degree=Counter()
    for s in i['segments']:
        for a,b in zip(s['path'],s['path'][1:]):pairs[tuple(sorted([a,b]))]+=1;degree.update([a,b])
    assert sum(pairs.values())==i['metrics']['lines'];assert max(pairs.values())<=32 and max(degree.values())<=160
    compute=json.loads((f/(k+'-compute.json')).read_text()) if k!='baseline' else None
    stats[k]={'sequenceHash':i['sequenceHash'],'targetHash':i['imageHash'],'connections':i['metrics']['lines'],'threadMeters':i['metrics']['estimatedMeters'],'additionalStockMeters':i['metrics']['stockShortfallMeters'],'generationSeconds':compute['fullMs']/1000 if compute else None,'fitRatio':settings[k]['ratio'],'maxChordRepeat':max(pairs.values()),'maxIncident':max(degree.values()),'starts':len(i['segments']),'knots':2*len(i['segments']),'routingConnections':i['metrics'].get('densityFit',{}).get('routingConnections',0),'qualityAcceptance':'open','physicallyValidated':False}
    diagnostics[k]={}
    for feature_row,(feature,source_box) in enumerate(regions.items()):
        l,t=forward(*source_box[0],settings[k]['edits']);r,b=forward(*source_box[1],settings[k]['edits'])
        assert min(l,t)>=0 and max(r,b)<=1
        crops={kind:im.transform((64,64),Image.Transform.EXTENT,(.5+l*(n-1),.5+t*(n-1),.5+r*(n-1),.5+b*(n-1)),Image.Resampling.BILINEAR) for kind,im in images[k].items()}
        for kind_col,kind in enumerate(['source','target','sequence']):
            col=row*3+kind_col;feature_sheet.paste(crops[kind].resize((144,144),Image.Resampling.NEAREST),(col*150,feature_row*184+32));fd.text((col*150,feature_row*184+3),k+' '+feature,fill='black');fd.text((col*150,feature_row*184+16),kind,fill='black')
        pred=np.asarray(crops['sequence'])/255;truth=np.asarray(crops['target'])/255
        diagnostics[k][feature]={'sourceCorners':source_box,'targetBox':[l,t,r,b],'nativeWidthPixels':(r-l)*(n-1),'nativeHeightPixels':(b-t)*(n-1),'bilinear64RgbMse':float(np.mean((pred-truth)**2)),'comparisonLimit':'crop changes native feature size and preprocessing; not a likeness score or quality-equivalent simplification'}
full.save(f/'comparison.png');feature_sheet.save(f/'features.png')
(f/'measurements.json').write_text(json.dumps({'statistics':stats,'matchedSourceRegions':diagnostics,'qualityAcceptance':'inconclusive; default unchanged'},indent=2))
cards=''.join('<section><h2>'+k+'</h2><img width="160" height="160" src="'+k+'-sequence.png"><pre>'+html.escape(json.dumps(stats[k],indent=2))+'</pre></section>' for k in names)
(f/'report.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ip Rasm — head outline experiment</title><style>body{font:16px system-ui;margin:24px;background:#faf8ef;color:#18201d;max-width:1350px}img{max-width:100%;height:auto}section{display:inline-block;vertical-align:top;width:370px;margin:8px}pre{white-space:pre-wrap;font-size:13px;overflow-wrap:anywhere}a{color:#235544}</style><h1>Manual whole-head outline — separate experiment</h1><p>One local owner-authorized photo; manual source-normalized hair/ears/jaw polygon. Existing baseline, progress and templates preserved. Same160-pin unrotated heart400×400mm,0.1mm thread,opacity0.85,160pixels,20000requested-line ceiling,v6→v8/eight physical sweeps/weight2,32chord/160incident safeguards. Changed crop and source-remapped feature windows are explicit.</p><p><b>Quality acceptance remains OPEN; no default promotion.</b> Head containment can reduce face size on a concave heart. Fewer connections and lower thread use here are NOT quality-preserving simplification. Inspect native face size and equally sampled source-relative eyes/nose/lips. No optimal-search, physical-capacity or likeness guarantee. Independent rectangle has4mm nominal clearance; outline has4mm plus one conservative geometry-grid cell and actual heart-notch edge protection.</p>'''+cards+'''<h2>Source crop / processed target / full immutable sequence</h2><p>Ordinary native160 portraits above; all sequence images contain every actual connection including routing. No photographic overlay, invented feature or per-result sharpening.</p><img src="comparison.png"><h2>Exactly matched source-relative anatomy</h2><p>Same source coordinates, bilinear64×64 windows enlarged identically. Native feature sizes differ; numerical errors are diagnostics, not proof of human likeness or physical quality.</p><img src="features.png"><h2>Manual whole-head marking</h2><img width="480" src="marked-head.png"><p><a href="measurements.json">Measurements</a> · <a href="selection.json">Source/selection audit</a> · <a href="rectangle-guide.json">Rectangle immutable project</a> · <a href="outline-guide.json">Outline immutable project</a> · <a href="rectangle-guide.pdf">Rectangle matching PDF</a> · <a href="outline-guide.pdf">Outline matching PDF</a> · <a href="/">Website</a></p><p>Generation includes validation wrapper; baseline timing is historical and not rerun. Head-outline marks belong to the photo in the current session, while the resulting crop is stored with a newly saved project. No original photo is uploaded to a service. Physical assembly, human recognition and this build on a real phone remain unverified.</p></html>''',encoding='utf8')
print(json.dumps(stats,indent=2))
