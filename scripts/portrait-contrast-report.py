"""Local sequence-only common physical evaluation; never modifies preserved evidence."""
from pathlib import Path
from collections import Counter
import json,html
import numpy as np
from PIL import Image,ImageDraw
f=Path('output/contrast');audit=json.loads(Path('output/resolution/target-audit.json').read_text());n=192
files={'pixel-160':Path('output/guarded/multiscale-2.json'),'pixel-192':Path('output/resolution/multiscale-2.json'),'physical-2':f/'physical-2.json'}
if (f/'simplified.json').exists():files['simplified']=f/'simplified.json'
labels={'pixel-160':'Preserved 160 v7','pixel-192':'Preserved 192 v7','physical-2':'192 board mm v8','simplified':'Separate pruned v9'}
target=np.frombuffer(Path('output/resolution/target.bin').read_bytes(),dtype=np.uint8).reshape(n,n,3)/255
regions={'left eye':(51,52,84,74),'right eye':(87,52,120,74),'nose':(70,76,104,103),'lips':(65,105,111,120),'left nostril':(74,88,84,99),'right nostril':(87,88,97,99),'jaw':(53,116,127,144),'light cheek':(100,78,117,104)}
regions={k:(int(np.ceil(l/159*191)),int(np.ceil(t/159*191)),int(np.floor((r-1)/159*191))+1,int(np.floor((b-1)/159*191))+1) for k,(l,t,r,b) in regions.items()}
for k,key in [('nose','nose'),('lips','mouth')]:
 b=audit['crops'][key];regions[k]=(b['left'],b['top'],b['right']+1,b['bottom']+1)
def lum(a):return a@np.array([.2126,.7152,.0722])
def sample(a,x,y):
 ix=np.floor(x).astype(int);iy=np.floor(y).astype(int);fx=(x-ix)[...,None];fy=(y-iy)[...,None]
 return (a[iy,ix]*(1-fx)+a[iy,ix+1]*fx)*(1-fy)+(a[iy+1,ix]*(1-fx)+a[iy+1,ix+1]*fx)*fy
def png(a,p):Image.fromarray(np.clip(np.floor(a.astype(float)*255+.5),0,255).astype(np.uint8)).save(p)
metrics={};records={};arrays={};rows=''
for k,path in files.items():
 data=json.loads(path.read_text());i=data['instruction'];p=i['profile'];m=i['metrics'];arrays[k]=a=np.frombuffer((f/f'{k}-common.f32').read_bytes(),dtype='<f4').reshape(n,n,3).astype(float);png(a,f/f'{k}-common.png')
 native=np.frombuffer((f/f'{k}.f32').read_bytes(),dtype='<f4').reshape(i['params']['resolution'],i['params']['resolution'],3);png(native,f/f'{k}.png');Image.open(f/f'{k}-common.png').resize((768,768),Image.Resampling.NEAREST).save(f/f'{k}-large.png')
 metrics[k]={}
 for name,(l,t,r,b) in regions.items():
  al=lum(a[t:b,l:r]);tl=lum(target[t:b,l:r]);ys,xs=np.mgrid[t:b,l:r]
  d={'rgbMse':float(np.mean((a[t:b,l:r]-target[t:b,l:r])**2)),'luminanceCorrelation':float(np.corrcoef(al.ravel(),tl.ravel())[0,1]),'contrastRatio':float(np.std(al)/np.std(tl)),'darkExcessFraction':float(np.mean(al-tl<-.08)),'meanDarkExcess':float(np.mean(np.maximum(tl-al,0)))}
  for scale in [1,2,4]:
   offset=scale*191/159;e=np.concatenate([(sample(a,xs+offset,ys)-sample(a,xs-offset,ys)).ravel(),(sample(a,xs,ys+offset)-sample(a,xs,ys-offset)).ravel()]);q=np.concatenate([(sample(target,xs+offset,ys)-sample(target,xs-offset,ys)).ravel(),(sample(target,xs,ys+offset)-sample(target,xs,ys-offset)).ravel()]);d[f'gradient{scale}Mse']=float(np.mean((e-q)**2));d[f'gradient{scale}Correlation']=float(np.corrcoef(e,q)[0,1])
  metrics[k][name]=d
 degrees=Counter();pairs=Counter();lengths=[]
 for segment in i['segments']:
  for u,v in zip(segment['path'],segment['path'][1:]):
   degrees[u]+=1;degrees[v]+=1;pairs[tuple(sorted([u,v]))]+=1;aa=p['pins'][u];bb=p['pins'][v];lengths.append(float(np.hypot((aa['x']-bb['x'])*p['widthMm'],(aa['y']-bb['y'])*p['heightMm'])))
 meters=sum((d+p['wrapAllowanceMm'])/1000*(1+p['wasteFraction']) for d in lengths)+.5*len(i['segments'])
 assert abs(meters-m['estimatedMeters'])<1e-5 and max(degrees.values())<=160 and max(pairs.values())<=32 and len(lengths)==m['lines']
 records[k]={'hash':i['sequenceHash'],'targetHash':i['imageHash'],'algorithm':i['algorithm'],'params':i['params'],'profile':p,'metrics':m,'wrapperMs':data['durationMs'],'memory':data.get('memory'),'distribution':{'maxChord':max(pairs.values()),'maxIncident':max(degrees.values()),'over300mm':sum(d>300 for d in lengths),'degrees':dict(degrees),'pairs':{f'{a}:{b}':c for (a,b),c in pairs.items()}},'effort':{'connections':m['lines'],'starts':len(i['segments']),'knots':2*len(i['segments']),'colorChanges':sum(i['segments'][j]['color']!=i['segments'][j-1]['color'] for j in range(1,len(i['segments']))),'estimatedMinutes':(m['lines']*5+2*len(i['segments'])*20)/60,'measuredCustomerTime':False,'assumptions':'5s per connection including wrap/reposition;20s per attachment/finish knot;30s per color change (none here)'}}
 fit=m.get('densityFit',{});routing=fit.get('routingConnections',i['params'].get('simplification',{}).get('remainingRoutingConnections','unclassified; all included'))
 rows+=f"<tr><td>{labels[k]}</td><td>{m['lines']} incl. {routing} routing</td><td>{meters:.3f}m / +{max(0,meters-p['stockMeters']):.3f}m</td><td>{m.get('durationMs',0)/1000:.2f}s; {m['stoppedReason']}; {fit.get('sweeps','—')} sweeps</td><td>{max(pairs.values())}/{max(degrees.values())}</td><td>{records[k]['effort']['estimatedMinutes']:.1f}min (estimate)</td></tr>"
images={k:Image.open(f/f'{k}-common.png').convert('RGB') for k in files};images['source']=Image.open('output/resolution/crop.png').convert('RGB');images['target']=Image.open('output/resolution/target.png').convert('RGB');names=['source','target']+list(files)
col=260;sheet=Image.new('RGB',(col*len(names),sum((b-t)*4+50 for l,t,r,b in regions.values())),'#faf8ef');draw=ImageDraw.Draw(sheet);at=0
for name,box in regions.items():
 for j,k in enumerate(names):
  draw.text((j*col+3,at+3),name+' / '+labels.get(k,k),fill='#222');im=images[k].crop(box);sheet.paste(im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST),(j*col+3,at+28))
 at+=(box[3]-box[1])*4+50
sheet.save(f/'regions-comparison.png')
ordinary=Image.new('RGB',(len(names)*185,205),'#faf8ef');draw=ImageDraw.Draw(ordinary)
for j,k in enumerate(names):draw.text((j*185+2,3),labels.get(k,k),fill='#222');ordinary.paste(images[k].resize((160,160),Image.Resampling.BILINEAR),(j*185+2,32))
ordinary.save(f/'ordinary-comparison.png')
result={'reference':{'grid':192,'targetHash':audit['targetHash'],'regions':regions,'coordinateReference':'sample-center x/(n-1), inclusive normalized boxes','gradientPhysicalHalfDistancesMm':[400/159*s for s in [1,2,4]],'gradientSampling':'bilinear at fractional192 positions; reported central gradients differ from forward fit objective','render':'all executable paths rerasterized at192 for common evaluation, source separate, no overlay; native previews separate'},'metrics':metrics,'records':records,'qualityAccepted':False,'physicallyValidated':False,'productionActive':False}
(f/'measurements.json').write_text(json.dumps(result,indent=2))
assessment=(f/'assessment.md').read_text() if (f/'assessment.md').exists() else 'Visual assessment pending. No promotion or simplification acceptance.'
cards=''.join(f'<figure><a href="{k}-large.png"><img src="{k}.png" width="160" height="160"></a><figcaption>{labels[k]} native</figcaption></figure>' for k in files)
metricrows=''.join('<tr><td>'+name+'</td>'+''.join(f"<td>{metrics[k][name]['rgbMse']:.5f} / {metrics[k][name]['gradient2Mse']:.5f} / {metrics[k][name]['darkExcessFraction']*100:.1f}%</td>" for k in files)+'</tr>' for name in regions)
physical=records['physical-2'];data=json.loads((f/'physical-2.json').read_text());total=(data['basisCreationMs']+data['basisRefinementMs']+physical['metrics']['durationMs'])/1000
page=f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Ip Rasm physical contrast and assembly effort</title><style>body{{max-width:1500px;margin:20px auto;padding:18px;font:16px/1.6 system-ui;color:#243d33;background:#faf8ef}}.grid{{display:flex;gap:24px;flex-wrap:wrap}}figure{{width:160px;margin:0}}figcaption{{font-size:13px}}.wide{{width:100%;height:auto}}.scroll{{overflow:auto}}table{{font-size:13px;border-collapse:collapse}}td,th{{padding:8px;border-bottom:1px solid #bbb;text-align:left}}pre{{white-space:pre-wrap;font:inherit}}.notice{{padding:16px;background:#f3e4cb}}code{{overflow-wrap:anywhere}}</style><h1>Physical-distance contrast and assembly effort — quality acceptance open</h1>
<p class="notice">Unchanged exact photograph, crop, preprocessing and manual regions. Unrotated240 pins,400mm board,0.1mm thread,opacity0.85,32 chord/160 incident safeguards. These remain provisional safeguards, not verified nail capacities. No source overlay. All sequences/templates/progress preserved; new guides start at0. Portrait, physical assembly and real-device acceptance remain open.</p>
<h2>Ordinary native portraits</h2><div class="grid">{cards}</div><h2>Common physical reference at ordinary size</h2><p>Same192 grid and160px display for all full executable paths. Native160 versus rerasterized160 differences are disclosed in the preserved resolution report.</p><img class="wide" src="ordinary-comparison.png"><h2>Enlarged actual features</h2><p>Both eyes, nostrils, nose, lips, jaw and light cheek; identical normalized windows and4×nearest enlargement. Source and target are separate columns.</p><a href="regions-comparison.png"><img class="wide" src="regions-comparison.png"></a>
<h2>Controlled objective change</h2><p>192v7 fixed1/2/4 pixel neighborhoods versus v8 distances{[400/159*s for s in [1,2,4]]}mm. Same refined192v6 basis02b8f612…5eb1123,weight2,eight dispersed sweeps,unchanged target67ce54d2…10779. Sample centers x/(n−1); x/y offsets independently scaled by board width/height. At192 offsets{[191/159*s for s in [1,2,4]]}pixels. Axis-linear interpolation, both nonzero endpoint samples inside the board; derivative units anchored at400/159mm. Exactly reproduces integer160v7 operator/route in regression. Neighborhood normalization changes intentionally; preprocessing/coarse basis/resolution confounds remain unchanged.</p>
<p>New fit {physical['metrics']['durationMs']/1000:.3f}s. Complete attributed pipeline including preserved fresh basis and its refinement {total:.3f}s. Original basis stages were not recomputed. Host load differs; no speed claim. Fit stopped at eight-sweep compute budget, not a proven optimum. Every sweep persisted a checksum-bound recoverable graph checkpoint; unfinished graphs are not assembly instructions. Reported progress is evaluated work, not an ETA.</p><p>Peak sampled Node RSS{data['memory']['peak']['rss']/1048576:.1f}MiB; footprint cache{physical['metrics']['peakCacheBytes']/1048576:.2f}MiB; physical stencil/reverse incidence{physical['metrics']['physicalContrastBytes']/1048576:.2f}MiB.250ms samples only when the event loop yields; not guaranteed instantaneous peaks or device memory.</p>
<h2>Regional measurements on common physical reference</h2><p>RGB MSE / gradient MSE at±5.031mm / fraction darker than target by&gt;.08. No metric is a likeness score.</p><div class="scroll"><table><tr><th>Region</th>{''.join('<th>'+labels[k]+'</th>' for k in files)}</tr>{metricrows}</table></div><h2>Actual connections, supplies and assembly estimate</h2><div class="scroll"><table><tr><th>Variant</th><th>Connections</th><th>Thread / stock shortfall</th><th>Fit / stop</th><th>Max chord/incident</th><th>Assembly</th></tr>{rows}</table></div><p>Each monochrome guide has one start,two knots,no color change. Assembly estimate:5s per destination wrap/connection including repositioning,20s per attachment/finish knot. These are disclosed planning assumptions,not measured customer times. Thread includes every route,8mm wrap,12%waste,0.5m knot allowance per segment. Starts/knots are physical actions,not chord-capacity incidents.</p>
<h2>Simplification evidence</h2><p><a href="simplified-guide.json">Separate immutable pruned guide / progress0</a> | <a href="simplified-guide.pdf">Pruned physical guide</a> | <a href="simplified-guide.txt">Every remaining step and explicit knots</a> | <a href="simplified.png">Exact sequence preview</a></p><h2>Decision and next hypothesis</h2><pre>{html.escape(assessment)}</pre><p><a href="measurements.json">Complete settings,hashes,regional metrics,distribution and estimates</a> | <a href="physical-2-guide.json">Immutable v8 guide/progress0</a> | <a href="physical-2-guide.txt">All physical steps/knots</a> | <a href="physical-2-guide.pdf">Full guide and unchanged matching template</a> | <a href="/output/resolution/report.html">Preserved resolution report</a> | <a href="/">Test local website</a></p></html>'''
page=page.replace('Unrotated240 pins,400mm board,0.1mm thread,opacity0.85,32 chord/160 incident safeguards','Unrotated 240 pins, 400 mm board, 0.1 mm thread, opacity 0.85, 32 chord / 160 incident safeguards').replace('Same192 grid and160px display','Same 192 grid and 160 px display').replace('one start,two knots,no color change','one start, two knots, no color change').replace('Each monochrome guide','Each monochrome guide')
(f/'report.html').write_text(page,encoding='utf-8');print(json.dumps({k:{r:metrics[k][r] for r in ['nose','lips','left eye','right eye']} for k in files},indent=2))
