"""Exact floating sequence comparisons, local only. No photo overlay."""
from pathlib import Path
from collections import Counter
import json
import numpy as np
from PIL import Image, ImageDraw
folder=Path('output/pin-phase')
audit=json.loads((folder/'experiment.json').read_text(encoding='utf-8'))
keys=['unrotated','basis','basis-refined','multiscale-2']
labels=['Unrotated v7 w2','Rotated fresh v6','Rotated refined v6','Rotated v7 w2']
names=['crop','target']+keys
for k in keys:
 if not (folder/f'{k}.png').exists():
  raster=np.frombuffer((folder/f'{k}.f32').read_bytes(),dtype='<f4').reshape(160,160,3)
  Image.fromarray(np.clip(np.floor(raster.astype(float)*255+.5),0,255).astype(np.uint8)).save(folder/f'{k}.png')
images={k:Image.open(folder/f'{k}.png').convert('RGB') for k in names}
# Preserved manual diagnostic windows, not inferred product anatomy.
regions={'left eye':(51,52,84,74),'right eye':(87,52,120,74),'nose':(70,76,104,103),'lips':(65,105,111,121),'left nostril':(74,88,84,99),'right nostril':(87,88,97,99),'jaw':(53,116,127,144),'light cheek':(100,78,117,104)}
boxes=json.loads(Path('output/regions/audit.json').read_text(encoding='utf-8'))['crops']
for diagnostic,key in [('nose','nose'),('lips','mouth')]:
 b=boxes[key];regions[diagnostic]=(b['left'],b['top'],b['right']+1,b['bottom']+1)
target=np.frombuffer((folder/'target.bin').read_bytes(),dtype=np.uint8).reshape(160,160,3)/255
lum=lambda a:a@np.array([.2126,.7152,.0722])
tl=lum(target);diagnostics={};routes={};rows='';requirements=''
for k,label in zip(keys,labels):
 a=np.frombuffer((folder/f'{k}.f32').read_bytes(),dtype='<f4').reshape(160,160,3).astype(float);al=lum(a)
 diagnostics[k]={}
 for region,(l,t,r,b) in regions.items():
  metrics={'rgbMse':float(np.mean((a[t:b,l:r]-target[t:b,l:r])**2)), 'contrastRatio':float(np.std(al[t:b,l:r])/np.std(tl[t:b,l:r])), 'darkExcessFraction':float(np.mean(al[t:b,l:r]<tl[t:b,l:r]-.08)), 'meanDarkExcess':float(np.mean(np.maximum(0,tl[t:b,l:r]-al[t:b,l:r])))}
  for step in [1,2,4]:
   ys,xs=np.mgrid[t:b,l:r]
   e=np.concatenate([(a[ys,xs+step]-a[ys,xs-step]).ravel(),(a[ys+step,xs]-a[ys-step,xs]).ravel()]);f=np.concatenate([(target[ys,xs+step]-target[ys,xs-step]).ravel(),(target[ys+step,xs]-target[ys-step,xs]).ravel()])
   metrics[f'gradient{2*step}pxMse']=float(np.mean((e-f)**2));metrics[f'gradient{2*step}pxCorrelation']=float(np.corrcoef(e,f)[0,1])
  diagnostics[k][region]=metrics
 source=Path('output/guarded/multiscale-2.json') if k=='unrotated' else folder/f'{k}.json'
 data=json.loads(source.read_text(encoding='utf-8'));i=data['instruction'];m=i['metrics'];degree=Counter();pairs=Counter();lengths=[]
 for seg in i['segments']:
  for a,b in zip(seg['path'],seg['path'][1:]):
   degree[a]+=1;degree[b]+=1;pairs[tuple(sorted([a,b]))]+=1
   u=i['profile']['pins'][a];v=i['profile']['pins'][b]
   lengths.append(float(np.hypot((u['x']-v['x'])*i['profile']['widthMm'],(u['y']-v['y'])*i['profile']['heightMm'])))
 route={'maximumIncidentDegree':max(degree.values()),'maximumChordRepeats':max(pairs.values()),'nailsAt160':sum(d==160 for d in degree.values()),'chordsAt32':sum(c==32 for c in pairs.values()),'over300mm':sum(l>300 for l in lengths),'meanChordMm':float(np.mean(lengths)),'incidentByNail':dict(degree),'traversalsByUndirectedChord':{f'{a}:{b}':c for (a,b),c in pairs.items()}}
 assert m['lines']==len(lengths);assert max(degree.values())<=160 and max(pairs.values())<=32
 meters=sum((v+i['profile']['wrapAllowanceMm'])/1000*(1+i['profile']['wasteFraction']) for v in lengths)+.5*len(i['segments'])
 assert abs(meters-m['estimatedMeters'])<1e-5
 assert i['imageHash']==audit['targetHash']
 if k!='unrotated': assert i['profile']==audit['profile']
 else:
  expected=dict(audit['profile']);expected.pop('pinLayout');actual=dict(i['profile']);
  for field in ['id','version','pins']: expected[field]=actual[field]
  assert expected==actual, 'Unexpected material substitution'
 routes[k]=route;fit=m.get('densityFit',{});ref=m.get('refinement',{})
 requirements+=f"<tr><td>{label}</td><td>{m['lines']}</td><td>{meters:.3f} m</td><td>{max(0,meters-i['profile']['stockMeters']):.3f} m</td><td>{m.get('durationMs',data.get('durationMs',0))/1000:.1f} s</td><td>{m['stoppedReason']}; refine {ref.get('reason','n/a')}, {ref.get('evaluations',0)} evaluations; fit {fit.get('sweeps',0)} sweeps, {fit.get('routingConnections',0)} routed</td><td>{route['maximumChordRepeats']} / {route['maximumIncidentDegree']}</td></tr>"
 rows+=f"<tr><td>{label}</td>"+''.join(f"<td>{diagnostics[k][r]['rgbMse']:.6f} / {diagnostics[k][r]['gradient2pxMse']:.6f}</td>" for r in regions)+"</tr>"
 images[k].resize((640,640),Image.Resampling.NEAREST).save(folder/f'{k}-large.png')
labels_all=['Source crop','Exact processed target']+labels
col=240;height=sum((b[3]-b[1])*3+48 for b in regions.values())
sheet=Image.new('RGB',(col*len(names),height),'#faf8ef');draw=ImageDraw.Draw(sheet);at=0
for region,b in regions.items():
 for j,k in enumerate(names):
  draw.text((j*col+8,at+4),region+' / '+labels_all[j],fill='#222');crop=images[k].crop(b);sheet.paste(crop.resize((crop.width*3,crop.height*3),Image.Resampling.NEAREST),(j*col+8,at+28))
 at+=(b[3]-b[1])*3+48
sheet.save(folder/'regions-comparison.png')
full=Image.new('RGB',(len(names)*180,204),'#faf8ef');draw=ImageDraw.Draw(full)
for j,k in enumerate(names):draw.text((j*180,3),labels_all[j],fill='#222');full.paste(images[k],(j*180,32))
full.save(folder/'ordinary-comparison.png')
metrics={'diagnosticWindows':regions,'windowReference':'sample-index/exclusive-right-bottom','gradientOffsets':[1,2,4],'targetHash':audit['targetHash'],'reference':'Exact Float32 RGB optical sequence raster; identical manual diagnostic pixels. Gradients use ±1/2/4 pixel differences. Measurement errors are not likeness scores.','diagnostics':diagnostics,'routes':routes,'qualityAccepted':False,'physicallyValidated':False,'imageUploaded':False}
(folder/'measurements.json').write_text(json.dumps(metrics,indent=2),encoding='utf-8')
cards=''.join(f'<figure><a href="{k}-large.png"><img src="{k}.png" width="160" height="160"></a><figcaption>{label}</figcaption></figure>' if k in keys else f'<figure><img src="{k}.png" width="160" height="160"><figcaption>{label}</figcaption></figure>' for k,label in zip(names,labels_all))
hashes=''.join(f"<p>{label}: <code>{audit['measurements'][k]['sequenceHash']}</code></p>" for k,label in zip(keys,labels))
total=sum(audit['measurements'][k]['metrics']['durationMs'] for k in ['basis','basis-refined','multiscale-2'])/1000
phase=audit['profile']['pinLayout'];pins=audit['profile']['pins']
coords='id,x_normalized,y_normalized,x_mm,y_mm,angle_clockwise_from_top_degrees\n'+''.join(f"{p['id']},{p['x']:.17g},{p['y']:.17g},{p['x']*400:.9f},{p['y']*400:.9f},{p['id']*1.5+.75:.9f}\n" for p in pins)
(folder/'pin-coordinates.csv').write_text(coords,encoding='utf-8')
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="400mm" height="400mm" viewBox="0 0 400 400"><rect width="400" height="400" fill="white"/><g font-family="sans-serif" font-size="2.1" fill="black">']
for pin in pins:
 x=pin['x']*400;y=pin['y']*400;ratio=(192-(16 if pin['id']%2 else 8))/192;lx=200+(x-200)*ratio;ly=200+(y-200)*ratio
 svg.append(f'<line x1="{x}" y1="{y}" x2="{lx}" y2="{ly}" stroke="#555" stroke-width="0.12"/><circle cx="{x}" cy="{y}" r="0.75" fill="{ "black" if pin["id"]==0 else "white" }" stroke="black" stroke-width="0.2"/><text x="{lx}" y="{ly+.7}" text-anchor="middle">{pin["id"]}</text>')
svg.append('<text x="200" y="3" text-anchor="middle">TOP | pin 0: +0.75 degrees clockwise | FRONT</text><text x="200" y="180" text-anchor="middle">circle-phase/1 | radial-leaders/1 | NEW 400 mm board</text><text x="200" y="187" text-anchor="middle">192 mm nail radius | IDs 0..239 clockwise | print 100%, no fit</text><line x1="175" y1="200" x2="225" y2="200" stroke="black" stroke-width=".3"/><text x="200" y="205" text-anchor="middle">50 mm - check print scale</text></g></svg>')
(folder/'physical-template.svg').write_text(''.join(svg),encoding='utf-8')
assessment=(folder/'assessment.md').read_text(encoding='utf-8') if (folder/'assessment.md').exists() else 'Visual assessment pending. Neither likeness nor physical acceptance is demonstrated. The default perimeter remains unchanged.'
page=f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Ip Rasm - controlled pin phase</title><style>body{{max-width:1440px;margin:24px auto;padding:18px;font:16px/1.6 system-ui;background:#faf8ef;color:#233d32}}.grid{{display:flex;gap:18px;flex-wrap:wrap}}figure{{margin:0;width:160px}}figcaption{{font-size:13px}}table{{border-collapse:collapse;font-size:13px;width:100%}}td,th{{padding:8px;border-bottom:1px solid #ccd2cc;text-align:left}}code{{overflow-wrap:anywhere}}.notice{{background:#f4e4ca;padding:18px}}.scroll{{overflow-x:auto}}.wide{{width:100%;height:auto}}pre{{white-space:pre-wrap;font:inherit}}</style>
<h1>Controlled +0.75 degree pin layout - quality acceptance open</h1><p class="notice">A separate experimental physical board. Source/crop stays upright. This is a sequence-only optical simulation; nail capacity, tension, assembly and likeness acceptance remain open. Default board unchanged; no assembly progress transferred.</p>
<p>Only the circular perimeter phase changes: +0.75 degrees clockwise from board top, pin 0 at x={pins[0]['x']*400:.6f}, y={pins[0]['y']*400:.6f} mm. IDs increase clockwise, viewed from front. Radius remains 192 mm (8 mm inset). 240 pins, 400 mm board, 0.1 mm thread, opacity .85, same wrap/waste/600 m supply estimate and 32/160 guards.</p><p>Identical source, processed 160 px target, crop and manual regions; preprocessing and optimizer settings unchanged. Target SHA256 <code>{audit['targetHash']}</code>. Fresh v6, separately bounded v6 refinement, v7 weight 2 / eight sweeps, matching the unrotated pipeline. Total rotated solver time INCLUDING basis and refinement: <strong>{total:.1f} seconds</strong> versus preserved unrotated 656.7 seconds. Machine timings are not device benchmarks.</p>
<h2>Ordinary size</h2><p><a href="ordinary-comparison.png">Original 160 px comparison</a>; click a result for full enlarged reconstruction.</p><div class="grid">{cards}</div>
<h2>Corrected regions on unchanged processed target</h2><img src="corrected-overlay.png" width="320" height="320" alt="Corrected manual facial regions">
<h2>Actual feature crops</h2><p>Identical left/right eyes, nose, actual lips, nostril diagnostic subwindows, jaw and light cheek. Windows are manually annotated, not detected anatomy. Source/target are separate columns; reconstructions contain only actual strands.</p><a href="regions-comparison.png"><img class="wide" src="regions-comparison.png" alt="Same-scale enlarged comparisons"></a>
<h2>Measurements - error is not likeness</h2><div class="scroll"><table><tr><th>Variant</th>'''+''.join(f'<th>{r}</th>' for r in regions)+f'''</tr>{rows}</table></div><p>RGB MSE / 2 px gradient MSE. <a href="measurements.json">1/2/4 offsets, correlation, contrast and excessive skin darkening; complete per-nail and chord distribution</a>.</p>
<h2>Thread, routing, distribution and stopping reasons</h2><div class="scroll"><table><tr><th>Variant</th><th>Connections</th><th>Thread incl.wrap/waste/knots</th><th>Additional beyond stock</th><th>Stage time</th><th>Stop/refinement/routing</th><th>Max chord/incident</th></tr>{requirements}</table></div><p>Every undirected traversal counts again, including reversal and routing; each endpoint adds one incident edge. Knots add length, not incidents. Limits 32/160 are provisional safeguards, not proven capacity. Eight sweeps / 200000 refinement evaluations are computation bounds, not proof of optimality.</p>
<h2>Decision and next isolated experiment</h2><pre>{assessment}</pre>{hashes}
<p><a href="multiscale-2-guide.json">Import separate rotated guide - progress zero</a> | <a href="multiscale-2-guide.pdf">Full sequence and NEW matching tiled physical template</a> | <a href="multiscale-2-guide.txt">All ordered steps and knots</a> | <a href="physical-template.svg">Standalone 400 mm physical template (print actual size)</a> | <a href="pin-coordinates.csv">All actual pin coordinates</a> | <a href="experiment.json">Settings/hashes/timing/immutable profile</a> | <a href="/output/guarded/report.html">Preserved unrotated report</a> | <a href="/">Try the local website</a></p></html>'''
(folder/'report.html').write_text(page,encoding='utf-8')
print(json.dumps({'totalSolverSeconds':total,'diagnostics':diagnostics,'distributionMaxima':{k:[v['maximumChordRepeats'],v['maximumIncidentDegree']] for k,v in routes.items()}},indent=2))
