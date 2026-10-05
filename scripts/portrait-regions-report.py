"""Manual-region audit and sequence-only comparison. Personal assets remain local/ignored."""
from pathlib import Path
import json, html
from collections import Counter
import numpy as np
from PIL import Image, ImageDraw
folder=Path('output/regions')
audit=json.loads((folder/'audit.json').read_text(encoding='utf-8'))
new=json.loads((folder/'corrected-stage2.json').read_text(encoding='utf-8'))
prior=json.loads(Path('output/fidelity/distributed-contours.json').read_text(encoding='utf-8'))
old=json.loads(Path('output/portrait/continued.json').read_text(encoding='utf-8'))
assert all(d['instruction']['imageHash']==audit['targetHash'] for d in [old,prior,new])
assert old['instruction']['profile']==new['instruction']['profile']==prior['instruction']['profile']
names=['crop','target','baseline','prior','corrected']
labels=['Source crop','Exact target','Old v4 (2 stages)','Prior v5 experiment','Corrected regions v4 (2 stages)']
images={k:Image.open(folder/f'{k}.png').convert('RGB') for k in names}
def overlay(boxes,name):
 im=images['target'].resize((640,640),Image.Resampling.NEAREST)
 draw=ImageDraw.Draw(im)
 for key,color in [('eyes','#00aaee'),('nose','#ffb000'),('mouth','#ff3366')]:
  b=boxes[key]; l=(.5+b['left']*159)*4;t=(.5+b['top']*159)*4
  draw.rectangle((l,t,l+b['width']*159*4,t+b['height']*159*4),outline=color,width=3)
  draw.text((l,t-13),key,fill=color)
 im.save(folder/f'{name}.png')
overlay(audit['oldRegions'],'old-overlay')
overlay(audit['correctedRegions'],'corrected-overlay')
regions={k:(b['left'],b['top'],b['right']+1,b['bottom']+1) for k,b in audit['crops'].items() if k in ['eyes','nose','mouth']}
regions={'left eye':(51,52,84,74),'right eye':(87,52,120,74),**regions,'jaw':(53,116,127,144),'light cheek':(100,78,117,104)}
col=238; height=sum((b[3]-b[1])*3+44 for b in regions.values())
sheet=Image.new('RGB',(col*len(names),height),'#faf8ef'); draw=ImageDraw.Draw(sheet); at=0
for region,b in regions.items():
 for j,key in enumerate(names):
  draw.text((j*col+8,at+4),region+' / '+labels[j],fill='#222')
  crop=images[key].crop(b);sheet.paste(crop.resize((crop.width*3,crop.height*3),Image.Resampling.NEAREST),(j*col+8,at+28))
 at+=(b[3]-b[1])*3+44
sheet.save(folder/'regions-comparison.png')
full=Image.new('RGB',(len(names)*190,204),'#faf8ef'); draw=ImageDraw.Draw(full)
for j,key in enumerate(names):
 draw.text((j*190,3),labels[j],fill='#222');full.paste(images[key],(j*190,32))
full.save(folder/'ordinary-comparison.png')
core={'baseline':audit['baseline']['recalculated'],'prior':audit['priorGlobal']['recalculated'],'corrected':new['instruction']['metrics']['regions']['final']}
def change(a,b):return 100*(b/a-1)
change_table={r:{'toneChangePercent':change(core['baseline'][r]['mse'],core['corrected'][r]['mse']),
 'edgeChangePercent':change(core['baseline'][r]['edgeMse'],core['corrected'][r]['edgeMse'])} for r in ['eyes','nose','mouth']}
prior_table={r:{'toneChangePercent':change(core['baseline'][r]['mse'],core['prior'][r]['mse']),
 'edgeChangePercent':change(core['baseline'][r]['edgeMse'],core['prior'][r]['edgeMse'])} for r in ['eyes','nose','mouth']}
# Diagnostic contrast from quantized sequence PNGs, explicitly separate from exact RGB measurements above.
gray={k:np.asarray(im,dtype=float)@np.array([.2126,.7152,.0722])/255 for k,im in images.items()}
diagnostics={}
for key in ['baseline','prior','corrected']:
 diagnostics[key]={}
 for r,(l,t,rr,bb) in regions.items():
  a=gray['target'][t:bb,l:rr];b=gray[key][t:bb,l:rr]
  ag=np.concatenate([np.diff(a,axis=0).ravel(),np.diff(a,axis=1).ravel()]);bg=np.concatenate([np.diff(b,axis=0).ravel(),np.diff(b,axis=1).ravel()])
  diagnostics[key][r]={'contrastRatio':float(np.std(b)/np.std(a)),'gradientCorrelation':float(np.corrcoef(ag,bg)[0,1]),'darkExcessFraction':float(np.mean(b<a-.08))}
routes={}
for k,data in [('baseline',old),('prior',prior),('corrected',new)]:
 i=data['instruction'];degree=Counter();pairs=Counter();lengths=[]
 for seg in i['segments']:
  for a,b in zip(seg['path'],seg['path'][1:]):
   degree[a]+=1;degree[b]+=1;pairs[tuple(sorted([a,b]))]+=1
   u=i['profile']['pins'][a];v=i['profile']['pins'][b]
   lengths.append(float(np.hypot((u['x']-v['x'])*400,(u['y']-v['y'])*400)))
 routes[k]={'maximumIncidentDegree':max(degree.values()),'maximumChordRepeats':max(pairs.values()),'over300mm':sum(l>300 for l in lengths),'meanChordMm':float(np.mean(lengths))}
reject={'reason':'The unchanged v5 adapter refused the corrected v4 basis because it exceeds provisional winding distribution guards. No v5 result was produced, no capacity claim, and no guards were relaxed.',**routes['corrected']}
(folder/'global-adapter-rejection.json').write_text(json.dumps(reject,indent=2),encoding='utf-8')
evidence={'historicalBandClaims':'superseded','audit':audit,'exactRgbRegionMetrics':core,'newV4VsOldV4Percent':change_table,'recalculatedPriorV5VsOldV4Percent':prior_table,'quantizedPngDiagnostics':diagnostics,'routes':routes,'qualityAccepted':False,'physicallyValidated':False,'originalUploaded':False}
(folder/'measurements.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
rows=''.join(f'<tr><td>{r}</td>'+''.join(f'<td>{core[k][r]["mse"]:.6f} / {core[k][r]["edgeMse"]:.6f}</td>' for k in ['baseline','prior','corrected'])+'</tr>' for r in ['eyes','nose','mouth'])
build=''
for label,data in [('Old v4',old),('Prior v5 (different engine)',prior),('Corrected v4',new)]:
 i=data['instruction'];m=i['metrics'];seconds=data.get('durationMs',m['durationMs'])/1000
 build+=f'<tr><td>{label}</td><td>{m["lines"]:,}</td><td>{m["estimatedMeters"]:.3f} m</td><td>{max(0,m["estimatedMeters"]-600):.3f} m</td><td>{seconds:.1f} s (final stage)</td><td>{m["stoppedReason"]}; refinement {m.get("refinement",{}).get("reason","n/a")}</td></tr>'
cards=''.join(f'<figure><img src="{k}.png" width="160" height="160"><figcaption>{label}</figcaption></figure>' for k,label in zip(names,labels))
website=json.loads((folder/'website-variants.json').read_text(encoding='utf-8'))
website_rows=''.join(f"<tr><td>{v['name']}</td><td>{v['requested']}</td><td>{v['instruction']['metrics']['lines']}</td><td>{v['instruction']['metrics']['estimatedMeters']:.3f} m</td><td>{v['instruction']['algorithm']}</td><td>{v['instruction']['metrics']['stoppedReason']}</td></tr>" for v in website['variants'])
page=f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Ip Rasm — corrected regions and variant audit</title>
<style>body{{max-width:1240px;margin:24px auto;padding:0 18px;font:16px/1.6 system-ui;background:#faf8ef;color:#233d32}}.grid{{display:flex;gap:24px;flex-wrap:wrap}}figure{{margin:0;width:180px}}figure img{{width:160px;height:160px}}figcaption{{font-size:13px}}.wide{{width:100%;height:auto}}.overlays img{{width:320px;height:320px}}table{{border-collapse:collapse;width:100%;font-size:14px}}td,th{{border-bottom:1px solid #ccd2cc;padding:8px;text-align:left}}code{{overflow-wrap:anywhere}}.notice{{padding:18px;background:#f4e4ca}}</style>
<h1>Portrait regions corrected; quality remains open</h1><p class="notice">Historical proportional-band facial percentages are superseded. The old guides and their hashes are preserved. The new variant is a coordinate/weight correction experiment, not an accepted likeness improvement. Nose and lips remain indistinct.</p>
<p>Same original local photograph, zoom 1.3, zero pan/rotation, 160 px target, 400 mm circle, 240 pins, real configured 0.1 mm thickness, opacity .85, stock estimate 600 m. Target SHA-256 remains <code>{audit['targetHash']}</code>. Nothing was uploaded.</p>
<h2>Overlay audit on the exact target</h2><div class="grid overlays"><figure><img src="old-overlay.png"><figcaption>Old proportional bands: nose reaches lips, mouth includes lower face.</figcaption></figure><figure><img src="corrected-overlay.png"><figcaption>Independent manual boxes: actual eyes, nose and lips. Not detected anatomy.</figcaption></figure></div>
<p>Normalized coordinates refer to the first and last target pixel centers. Overlay position uses (.5 + u × 159) / 160; optimization and metrics use x / 159. Comparison crops use the identical inclusive sample bounds. The former display-edge/sample-center mismatch was at most half a pixel; it does not explain the large proportional-placement error.</p>
<h2>Ordinary display size — all reconstructions are sequence-only</h2><div class="grid">{cards}</div>
<h2>Enlarged real features</h2><img class="wide" src="regions-comparison.png" alt="Source, target, preserved sequences and corrected sequence: both eyes, nose, lips, jaw and light cheek">
<p>The crop and processed target retain real nostril, eye and lip contours. No coordinate transform or preprocessing step moves their anatomy. Cropping/resampling reduces available fine detail, while grayscale/background/contrast alter tone. No source overlay is used in any reconstruction.</p>
<h2>Corrected facial measurements</h2><p>Exact RGB MSE / central-gradient MSE (two-pixel difference). Same manually annotated pixels in every column. These are simulation agreement measurements, not identity/likeness scores.</p><table><tr><th>Region</th><th>Old v4</th><th>Prior v5</th><th>Corrected v4</th></tr>{rows}</table>
<p>New v4 versus old v4: eye edge change {change_table['eyes']['edgeChangePercent']:+.1f}%, nose {change_table['nose']['edgeChangePercent']:+.1f}%, lips {change_table['mouth']['edgeChangePercent']:+.1f}% (negative means less error). The old claimed 36.8% / 39.5% / 31.7% reductions used broader proportional bands. Recomputed prior v5 reductions on corrected pixels are {-prior_table['eyes']['edgeChangePercent']:.1f}% / {-prior_table['nose']['edgeChangePercent']:.1f}% / {-prior_table['mouth']['edgeChangePercent']:.1f}% and still do not establish recognizable nose/lips.</p>
<h2>Exact build requirements</h2><p>New diagnostic sequence: <code>{new["instruction"]["sequenceHash"]}</code>. Preserved baseline: <code>{old["instruction"]["sequenceHash"]}</code>. Prior v5: <code>{prior["instruction"]["sequenceHash"]}</code>.</p><table><tr><th>Variant</th><th>Connections</th><th>Thread incl. wraps/waste</th><th>Additional beyond stock</th><th>Time</th><th>Stop</th></tr>{build}</table>
<p>Corrected v4 stages: {json.loads((folder/'corrected-stage1.json').read_text())['durationMs']/1000:.1f} + {new['durationMs']/1000:.1f} seconds. Fresh path, zero confirmed steps, explicit start/finish knots, legal connections and complete accounting. Continuous addition plateaued; each refinement reached its 200,000-evaluation bound. That is not a proven optimum. V5 adaptation was refused: maximum incident degree {routes['corrected']['maximumIncidentDegree']} and chord repeat {routes['corrected']['maximumChordRepeats']} exceed its provisional guards. No winding capacity is physically validated.</p>
<p><a href="corrected-guide.json">Import new corrected-region guide (progress zero)</a> · <a href="corrected-guide.pdf">All-step PDF</a> · <a href="corrected-guide.txt">Exact text instructions</a> · <a href="measurements.json">Complete measured evidence</a> · <a href="website-variants.json">Normal website variant audit</a> · <a href="canvas-transforms.json">Actual canvas transform checks</a> · <a href="/">Test the local website</a></p>
<h2>Website preset and selection audit</h2><table><tr><th>Preset</th><th>Requested</th><th>Actual</th><th>Thread</th><th>Engine</th><th>Stop</th></tr>{website_rows}</table><p>Actual normal UI generated both, saved each, and exported its matching selected hash. The profiles, processed targets, physical paths and canvas pixels are identical. Metadata hashes differ because requested budgets differ. Both stop before 1,400. Larger budget alone cannot change a plateaued path. This reproduces the reported behavior, not the screenshots’ exact 1,074 / ~303 m configuration; those old transient settings cannot be recovered from image observations alone.</p><p>Default website: continuous v4, 120 pins, 0.3 mm, zoom 1, proportional regions. Prior selected experiment: 240 pins, 0.1 mm, zoom 1.3, two v4 stages plus v5. Selecting Detailed does not dispatch v5 or a different detail objective. A separate index/validation race was fixed with immutable job IDs and atomic ID-based variant selection; no stale-canvas fault was observed in the reproducible preset case.</p><h2>Remaining limitation and concrete next experiment</h2><p>Do not select the new variant merely because some regional errors improve. It has weak nose/lips and many long strands. Preserve the prior experiment too. Next: build a fresh v4 basis that enforces the existing pair/incident-degree distribution guards, then compare a separately versioned multiscale 2/4 px contrast objective on these unchanged corrected regions. Do not relax guards to force v5 compatibility. Evaluate skin darkening and both eyes/nose/lips at ordinary size, then a varied consented portrait set. Physical assembly and real Android/iOS runtime evidence remain separate and unverified.</p></html>'''
(folder/'report.html').write_text(page,encoding='utf-8')
print(json.dumps({'newV4VsOldV4':change_table,'priorV5Recalculated':prior_table,'routes':routes}))
