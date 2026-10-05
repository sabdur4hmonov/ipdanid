"""Exact floating sequence comparisons, local only. No photo overlay."""
from pathlib import Path
from collections import Counter
import json
import numpy as np
from PIL import Image, ImageDraw
folder=Path('output/guarded')
audit=json.loads((folder/'experiment.json').read_text(encoding='utf-8'))
keys=['baseline','prior','basis','basis-refined','multiscale-1','multiscale-2']
labels=['Preserved v4','Guarded prior v5','Fresh guarded v6','Refined guarded v6','Multiscale v7 w1','Multiscale v7 w2']
names=['crop','target']+keys
for k in keys:
 if not (folder/f'{k}.png').exists():
  raster=np.frombuffer((folder/f'{k}.f32').read_bytes(),dtype='<f4').reshape(160,160,3)
  Image.fromarray(np.clip(np.floor(raster.astype(float)*255+.5),0,255).astype(np.uint8)).save(folder/f'{k}.png')
images={k:Image.open(folder/f'{k}.png').convert('RGB') for k in names}
# Preserved manual diagnostic windows, not inferred product anatomy.
regions={'left eye':(51,52,84,74),'right eye':(87,52,120,74),'nose':(70,76,104,103),'lips':(65,105,111,121),'jaw':(53,116,127,144),'light cheek':(100,78,117,104)}
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
 source=Path('output/portrait/continued.json') if k=='baseline' else Path('output/fidelity/distributed-contours.json') if k=='prior' else folder/f'{k}.json'
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
 assert i['imageHash']==audit['targetHash'] and i['profile']==audit['profile']
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
metrics={'reference':'Exact Float32 RGB optical sequence raster; identical manual diagnostic pixels. Gradients use ±1/2/4 pixel differences. Measurement errors are not likeness scores.','diagnostics':diagnostics,'routes':routes,'qualityAccepted':False,'physicallyValidated':False,'imageUploaded':False}
(folder/'measurements.json').write_text(json.dumps(metrics,indent=2),encoding='utf-8')
cards=''.join(f'<figure><a href="{k}-large.png"><img src="{k}.png" width="160" height="160"></a><figcaption>{label}</figcaption></figure>' if k in keys else f'<figure><img src="{k}.png" width="160" height="160"><figcaption>{label}</figcaption></figure>' for k,label in zip(names,labels_all))
hashes=''.join(f"<p>{label}: <code>{audit['measurements'][k]['sequenceHash']}</code></p>" for k,label in zip(keys,labels))
page=f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Ip Rasm — guarded strand distribution</title><style>body{{max-width:1440px;margin:24px auto;padding:18px;font:16px/1.6 system-ui;background:#faf8ef;color:#233d32}}.grid{{display:flex;gap:18px;flex-wrap:wrap}}figure{{margin:0;width:160px}}figcaption{{font-size:13px}}table{{border-collapse:collapse;font-size:13px;width:100%}}td,th{{padding:8px;border-bottom:1px solid #ccd2cc;text-align:left}}code{{overflow-wrap:anywhere}}.notice{{background:#f4e4ca;padding:18px}}.scroll{{overflow-x:auto}}.wide{{width:100%;height:auto}}</style>
<h1>Guarded strand distribution — quality acceptance open</h1><p class="notice">These are optical simulations of complete immutable sequences. Lower error does not establish likeness. Physical nail capacity, wrapping, tension and real thread opacity remain unverified. The personal photograph stays on this machine.</p>
<p>Same source, zoom 1.3, zero pan/rotation, exact 160 px target, corrected manual regions, 400 mm circle, 240 pins, 0.1 mm thread, opacity .85. Stock is a 600 m supply estimate, never an optimization cap. No background/material substitution. Target SHA256 <code>{audit['targetHash']}</code>.</p>
<h2>Ordinary size — click a reconstruction to enlarge</h2><p><a href="ordinary-comparison.png">All eight columns at their original 160 px display size</a></p><div class="grid">{cards}</div><h2>Corrected region overlay</h2><img src="corrected-overlay.png" width="320" height="320" alt="Manual eyes nose and actual lips on unchanged target">
<h2>Enlarged actual features</h2><p>Both eyes, nose, lips, jaw and light cheek use identical pixel windows. Source/target are separate columns. Reconstruction contains only sequence strands. <a href="regions-comparison.png">Full resolution comparison</a>.</p><img class="wide" src="regions-comparison.png">
<h2>Exact RGB /2 px central-gradient MSE</h2><div class="scroll"><table><tr><th>Variant</th>'''+''.join(f'<th>{r}</th>' for r in regions)+f'''</tr>{rows}</table></div><p><a href="measurements.json">Multi-scale gradients, correlations, local contrast, excessive darkening, per-nail degrees and every chord count</a>. No percentage is a likeness score.</p>
<h2>Requirements, distributions and stopping conditions</h2><div class="scroll"><table><tr><th>Variant</th><th>Connections</th><th>Thread incl. wraps/waste/knots</th><th>Additional beyond 600 m</th><th>Solver stage time</th><th>Stop / routing</th><th>Max chord / incident</th></tr>{requirements}</table></div><p>32 traversals per undirected chord; 160 incident connections per nail. Reversal counts again; an interior visit counts twice. All colors/segments share counters. Greedy, temporary two-strand lookahead, net two-edge replacement and global routing obey the limits. These provisional safeguards are not measured physical capacities.</p>
<p>V6 starts from scratch, then receives a separate bounded refinement stage. Both v7 trials start from that identical feasible refined basis. V7 uses real target differences at 1/2/4 px with derivative-unit weights 1/d², reversible optical strand removal and light-target overshoot protection. Every component/parity routing strand enters final reconstruction, objective, distribution and length. Eight sweeps and 200,000 refinement evaluations are computation bounds, not proof of optimality. The weight 2 candidate required 656.7 seconds of solver time including its fresh basis and refinement; its fit alone took 193.2 seconds. The production browser Worker replay of that fit took 97.2 seconds. These Windows timings are not Android performance measurements.</p><div id="assessment"><h2>Visual assessment and next experiment</h2><p>The weight 2 diagnostic has clearer eye/lip/jaw contours and less light-cheek darkening than the feasible continuous basis. Nose and lip separation are still weak, and crossing texture persists. Weight 1 has better left-eye tone; weight 2 has better nose/lip gradients. Global RGB MSE worsens to .022810 from prior v5 .021349. The diagnostic is chosen for local contours and visual inspection, not global error or thread length. This is a measured tradeoff, not solved likeness. Next: separately version and compare a 240-pin perimeter rotated by half a spacing (0.75 degrees), with the same materials/target and 32/160 guards, to test angular sampling sensitivity before considering additional pins or real material changes. This changes the nail layout and must be labeled separately. It is a hypothesis, not a promised improvement. Actual wrapping capacity/tension and diverse portraits remain open.</p></div>
{hashes}<p><a href="multiscale-2-guide.json">Import diagnostic v7 guide (progress zero)</a> · <a href="multiscale-2-guide.pdf">Complete v7 PDF</a> · <a href="multiscale-2-guide.txt">Complete ordered v7 steps</a> · <a href="basis-refined-guide.pdf">Feasible-basis PDF</a> · <a href="experiment.json">Settings, hashes, core regional measurements and durations</a> · <a href="basis-refined.json">Immutable feasible basis</a> · <a href="multiscale-1.json">Immutable v7 trial1</a> · <a href="multiscale-2.json">Immutable v7 trial2</a> · <a href="/">Try the local website</a></p></html>'''
(folder/'report.html').write_text(page,encoding='utf-8')
print(json.dumps({k:{r:{'mse':v['rgbMse'],'edge':v['gradient2pxMse'],'dark':v['darkExcessFraction'],'contrast':v['contrastRatio']} for r,v in d.items()} for k,d in diagnostics.items()},indent=2))
