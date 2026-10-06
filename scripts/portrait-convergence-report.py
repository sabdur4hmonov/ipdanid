"""New local report only; all displayed portraits replay the complete executable guide."""
from pathlib import Path
from collections import Counter
import json,html
import numpy as np
from PIL import Image,ImageDraw
folder=Path('output/convergence');folder.mkdir(exist_ok=True)
audit=json.loads(Path('output/resolution/target-audit.json').read_text());n=192
target=np.frombuffer(Path('output/resolution/target.bin').read_bytes(),dtype=np.uint8).reshape(n,n,3)/255
regions={'left eye':(51,52,84,74),'right eye':(87,52,120,74),'nose':(70,76,104,103),'lips':(65,105,111,120),'left nostril':(74,88,84,99),'right nostril':(87,88,97,99),'jaw':(53,116,127,144),'light cheek':(100,78,117,104)}
regions={k:(int(np.ceil(l/159*191)),int(np.ceil(t/159*191)),int(np.floor((r-1)/159*191))+1,int(np.floor((b-1)/159*191))+1) for k,(l,t,r,b) in regions.items()}
for k,key in [('nose','nose'),('lips','mouth')]:
 b=audit['crops'][key];regions[k]=(b['left'],b['top'],b['right']+1,b['bottom']+1)
def lum(a):return a@np.array([.2126,.7152,.0722])
def sample(a,x,y):
 ix=np.floor(x).astype(int);iy=np.floor(y).astype(int);fx=(x-ix)[...,None];fy=(y-iy)[...,None]
 return (a[iy,ix]*(1-fx)+a[iy,ix+1]*fx)*(1-fy)+(a[iy+1,ix]*(1-fx)+a[iy+1,ix+1]*fx)*fy
def image(a):return Image.fromarray(np.clip(np.floor(a.astype(float)*255+.5),0,255).astype(np.uint8))
files={'reference-8':Path('output/contrast/physical-2.json')}
files.update({p.stem:p for p in sorted((p for p in folder.glob('total-*.json') if p.stem.split('-')[-1].isdigit()),key=lambda p:int(p.stem.split('-')[-1]))})
files.update({p.stem:p for p in sorted(folder.glob('exchange-*.json')) if p.stem in ['exchange-single','exchange-paired','exchange-targeted-single','exchange-targeted-paired']})
metrics={};records={};arrays={};objective_checks={}
for name,path in files.items():
 data=json.loads(path.read_text());i=data['instruction'];p=i['profile'];m=i['metrics']
 raw=Path('output/contrast/physical-2.f32') if name=='reference-8' else folder/(name+'.f32')
 a=np.frombuffer(raw.read_bytes(),dtype='<f4').reshape(n,n,3).astype(float);arrays[name]=a;image(a).save(folder/(name+'.png'));image(a).resize((768,768),Image.Resampling.NEAREST).save(folder/(name+'-large.png'))
 assert i['imageHash']==audit['targetHash'] and json.dumps(p)==json.dumps(json.loads(Path('output/contrast/physical-2.json').read_text())['instruction']['profile'])
 metrics[name]={}
 for region,(l,t,r,b) in regions.items():
  al=lum(a[t:b,l:r]);tl=lum(target[t:b,l:r]);ys,xs=np.mgrid[t:b,l:r]
  d={'rgbMse':float(np.mean((a[t:b,l:r]-target[t:b,l:r])**2)),'luminanceCorrelation':float(np.corrcoef(al.ravel(),tl.ravel())[0,1]),'contrastRatio':float(np.std(al)/np.std(tl)),
   'darkExcessFraction':float(np.mean(al-tl<-.08)),'meanDarkExcess':float(np.mean(np.maximum(tl-al,0)))}
  for scale in [1,2,4]:
   offset=scale*191/159;e=np.concatenate([(sample(a,xs+offset,ys)-sample(a,xs-offset,ys)).ravel(),(sample(a,xs,ys+offset)-sample(a,xs,ys-offset)).ravel()]);q=np.concatenate([(sample(target,xs+offset,ys)-sample(target,xs-offset,ys)).ravel(),(sample(target,xs,ys+offset)-sample(target,xs,ys-offset)).ravel()]);d[f'gradient{scale}Mse']=float(np.mean((e-q)**2))
  # Relative thirds of the manually corrected lip window, NOT detected lip anatomy.
  if region=='lips':d['relativeThirdMeanTone']=[float(np.mean(v)) for v in np.array_split(al,3)];d['targetRelativeThirdMeanTone']=[float(np.mean(v)) for v in np.array_split(tl,3)]
  metrics[name][region]=d
 degrees=Counter();pairs=Counter();lengths=[]
 for segment in i['segments']:
  for u,v in zip(segment['path'],segment['path'][1:]):
   degrees[u]+=1;degrees[v]+=1;pairs[tuple(sorted((u,v)))]+=1;aa=p['pins'][u];bb=p['pins'][v];lengths.append(float(np.hypot((aa['x']-bb['x'])*p['widthMm'],(aa['y']-bb['y'])*p['heightMm'])))
 meters=sum((d+p['wrapAllowanceMm'])/1000*(1+p['wasteFraction']) for d in lengths)+.5*len(i['segments'])
 assert abs(meters-m['estimatedMeters'])<1e-5 and max(degrees.values())<=160 and max(pairs.values())<=32 and len(lengths)==m['lines']
 records[name]={'sequenceHash':i['sequenceHash'],'algorithm':i['algorithm'],'params':i['params'],'metrics':m,'maxChord':max(pairs.values()),'maxIncident':max(degrees.values()),'over300mm':sum(d>300 for d in lengths),
  'generation':{k:v for k,v in data.items() if k not in ['instruction','edits']}}
 starts=len(i['segments']);knots=2*starts;changes=max(0,starts-1)
 records[name]['assemblyEstimate']={'connections':len(lengths),'starts':starts,'knots':knots,'colorChanges':changes,'actions':len(lengths)+knots+changes,'minutes':(len(lengths)*5+knots*20+changes*30)/60,'connectionsFewerThanReference8':3239-len(lengths),'approvedQualityPreservingSavings':False,'assumptions':'5 s/connection including destination wrap/reposition; 20 s/knot including cuts/securing; 30 s/color change; starts covered by starting knots; not measured customer time'}
 # Independently compute identical weighted mean-RGB tone + axis-linear forward objective.
 yy,xx=np.mgrid[:n,:n];mask=((xx/191-.5)**2+(yy/191-.5)**2)<=.25+1e-8;w=np.ones((n,n))
 pr=i['params']['portrait'];manual=pr.get('regions',{})
 # portraitRegions face is stored as face box; feature regions use manual boxes.
 face=pr.get('face');face=face if isinstance(face,dict) else {k:pr['face'+k.capitalize()] for k in ['left','top','width','height']}
 for box,weight in [(face,8)]+[(manual[k],16) for k in ['eyes','nose','mouth']]:
  w[(xx/191>=box['left'])&(xx/191<=box['left']+box['width'])&(yy/191>=box['top'])&(yy/191<=box['top']+box['height'])]=weight
 residual=a.mean(axis=2)-target.mean(axis=2);tg=target.mean(axis=2)
 tone=float(np.sum((w*residual**2*np.where(residual<0,1+1.5*np.clip((tg-.35)/.45,0,1)**2,1))[mask]));contrast=0.
 settings=i['params']['optimization']['contrastPhysical']
 for distance in settings['distancesMm']:
  for axis,axis_mm in [(1,p['widthMm']),(0,p['heightMm'])]:
   off=distance/axis_mm*191;lower=int(np.floor(off));beta=off-lower
   for y,x in zip(*np.where(mask)):
    bx=x+lower if axis else x;by=y if axis else y+lower;cx=bx+1 if axis else bx;cy=by if axis else by+1
    if cx>=n or cy>=n or not mask[by,bx] or not mask[cy,cx]:continue
    e=residual[y,x]-((1-beta)*residual[by,bx]+beta*residual[cy,cx]);importance=(w[y,x]+(1-beta)*w[by,bx]+beta*w[cy,cx])*.5
    contrast+=importance*2*(settings['derivativeReferenceMm']/distance)**2*e*e
 actual=(tone+contrast)/w[mask].sum();stored=m['weightedError']['final'];assert abs(actual-stored)<1e-6,(name,actual,stored)
 objective_checks[name]={'fullRoutedActual':float(actual),'recorded':stored,'difference':float(actual-stored),'tolerance':1e-6}
source=Image.open('output/resolution/crop.png').convert('RGB');src=source.resize((160,160),Image.Resampling.BILINEAR);tgt=image(target).resize((160,160),Image.Resampling.BILINEAR)
ordinary=Image.new('RGB',(760,212*len(files)),'#faf8ef');draw=ImageDraw.Draw(ordinary)
for row,(name,a) in enumerate(arrays.items()):
 for col,(label,im) in enumerate([('Same original crop',src),('Exact processed target',tgt),('Complete v8 reference',image(arrays['reference-8']).resize((160,160),Image.Resampling.BILINEAR)),(name,image(a).resize((160,160),Image.Resampling.BILINEAR))]):
  draw.text((col*190+3,row*212+5),label,fill='#222');ordinary.paste(im,(col*190+3,row*212+30))
ordinary.save(folder/'ordinary-comparison.png')
names=['source','target']+list(arrays);images={k:image(a) for k,a in arrays.items()};images.update(source=source,target=image(target));col=max((r-l)*4 for l,t,r,b in regions.values())+20
sheet=Image.new('RGB',(col*len(names),sum((b-t)*4+50 for l,t,r,b in regions.values())),'#faf8ef');draw=ImageDraw.Draw(sheet);at=0
for region,box in regions.items():
 feature=Image.new('RGB',(col*len(names),(box[3]-box[1])*4+50),'#faf8ef');feature_draw=ImageDraw.Draw(feature)
 for j,name in enumerate(names):draw.text((j*col+3,at+3),region+' / '+name,fill='#222');im=images[name].crop(box);sheet.paste(im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST),(j*col+3,at+28))
 for j,name in enumerate(names):feature_draw.text((j*col+3,3),region+' / '+name,fill='#222');im=images[name].crop(box);feature.paste(im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST),(j*col+3,28))
 feature.save(folder/(region.replace(' ','-')+'-comparison.png'))
 at+=(box[3]-box[1])*4+50
sheet.save(folder/'regions-comparison.png')
result={'commonReference':{'grid':192,'targetHash':audit['targetHash'],'regions':regions,'physicalDistancesMm':[400/159*s for s in [1,2,4]],'reference':'normalized sample centers, same original crop and manual windows; no overlay'},'records':records,'regionalMeasurements':metrics,'objectiveIntegrity':objective_checks,'qualityAccepted':False,'physicallyValidated':False}
(folder/'measurements.json').write_text(json.dumps(result,indent=2))
cards=''.join(f'<figure><img src="/output/resolution/crop.png" width="160" height="160"><img src="{name}.png" width="160" height="160"><figcaption>Original crop | {name}: {r["metrics"]["lines"]} connections, {r["metrics"]["estimatedMeters"]:.2f} m. <a href="{name}-large.png">Enlarge</a></figcaption></figure>' for name,r in records.items())
rows=''
for name,r in records.items():
 m=r['metrics'];g=r['generation'];ex=r['params']['optimization'].get('exchange');s=m['densityFit']['sweeps']
 stage=f'8 prior + {s-8} additional = {s}' if name!='reference-8' and not ex else '8 prior' if not ex else f'19 prior; 0 new coordinate sweeps; {ex["mode"]} / {ex["selection"]}; {m["exchange"]["evaluations"]} gain evaluations'
 time=g.get('additionalWallMs',g.get('durationMs',m.get('durationMs',0)))/1000
 rss=g.get('memory',{}).get('peak',{}).get('rss',0)/2**20
 fit=g.get('routing',{}).get('fitObjective',.027096224439366073 if name=='reference-8' else 'unavailable')
 rows+=f'<tr><td>{name}</td><td>{stage}</td><td>{fit}</td><td>{m["weightedError"]["final"]:.8f}</td><td>{m["lines"]} / {m["densityFit"]["routingConnections"]}</td><td>{m["estimatedMeters"]:.2f} / +{m["stockShortfallMeters"]:.2f}</td><td>{r["maxChord"]}/{r["maxIncident"]}; {r["over300mm"]} long</td><td>{time:.2f}s / {rss:.1f} MiB sampled RSS; {m["stoppedReason"]}</td></tr>'
assessment=(folder/'assessment.md').read_text() if (folder/'assessment.md').exists() else 'Visual review pending. No latest/lowest-objective winner is selected. Nose/lip definition and crossings remain open.'
(folder/'report.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><title>Ip Rasm bounded convergence</title><style>body{{max-width:1400px;margin:20px auto;padding:16px;background:#faf8ef;color:#243d33;font:16px/1.6 system-ui}}figure{{display:inline-block;vertical-align:top;margin:14px;max-width:330px}}img{{object-fit:contain}}.wide{{max-width:100%;height:auto}}.scroll{{overflow:auto}}table{{font-size:13px;border-collapse:collapse}}td,th{{padding:8px;border-bottom:1px solid #ccc}}pre{{white-space:pre-wrap;font:inherit}}</style><h1>Bounded quality convergence — acceptance open</h1><p>Unchanged original crop, exact 192 target, manual regions, board-mm-forward/1 weight 2 objective, unrotated 240 pins, 400 mm board, 0.1 mm thread, opacity .85, 32 chord / 160 incident safeguards. Every candidate includes its actual routing. No source overlay, invented features or progress transfer. Prior 8 sweeps; allowance 24 total, at most 16 additional. Numerical improvement is not proof of likeness.</p><h2>Each candidate beside the same source crop at 160 pixels</h2>{cards}<h2>Identical display scale</h2><img class="wide" src="ordinary-comparison.png"><h2>Actual enlarged eyes, nose, lips, nostrils, jaw and light skin</h2><p><a href="regions-comparison.png">Open full 4× feature comparison</a></p><img class="wide" src="regions-comparison.png"><h2>Complete executable checkpoints</h2><div class="scroll"><table><tr><th>Candidate</th><th>Total sweeps</th><th>Fit objective</th><th>Final routed objective</th><th>Connections / routing</th><th>Thread m / shortage</th><th>Chord/incident max; &gt;300mm chords</th></tr>{rows}</table></div><p><a href="measurements.json">Exact hashes, settings, regional measurements, timing, sampled memory and independent objective audit</a>. Graph checkpoints are NOT assembly guides. Saved executable guides have explicit starts/finishes and zero progress.</p><h2>Visual decision / next hypothesis</h2><pre>{html.escape(assessment)}</pre><p><a href="/output/contrast/report.html">Preserved v8/v9 report</a> | <a href="/">Test local website</a></p></html>',encoding='utf-8')
report=folder/'report.html'
page=report.read_text(encoding='utf-8').replace('<th>Total sweeps</th>','<th>Prior / additional / total and search</th>').replace('<th>Chord/incident max; &gt;300mm chords</th>','<th>Chord/incident max; &gt;300mm chords</th><th>Stage time / memory / stop</th>')
page=page.replace('Graph checkpoints are NOT assembly guides.','Exchange seeds include every prior routing traversal; the routing column counts only new routing at that stage. All prior and new traversals count in reconstruction, thread and distribution. Graph checkpoints are NOT assembly guides.')
page=page.replace('<h2>Visual decision / next hypothesis</h2>','<p><a href="total-19-guide.pdf">19-sweep experimental guide</a> | <a href="exchange-targeted-paired-guide.pdf">Targeted paired experimental guide</a> | <a href="record-label-errata.json">Historical descriptive-label correction</a> | <a href="routing-undo-audit.json">Exact routing undo audit</a></p><h2>Visual decision / next hypothesis</h2>')
page=page.replace('<h2>Actual enlarged eyes, nose, lips, nostrils, jaw and light skin</h2>','<h2>Actual enlarged eyes, nose, lips, nostrils, jaw and light skin</h2><p>'+ ' | '.join(f'<a href="{region.replace(" ","-")}-comparison.png">{html.escape(region)} at 4×</a>' for region in regions)+'</p>')
report.write_text(page,encoding='utf-8')
print(json.dumps({k:{r:metrics[k][r] for r in ['nose','lips']} for k in files},indent=2))
