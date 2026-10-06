"""Local resolution evidence: unchanged immutable paths, common sample-center grid."""
from pathlib import Path
from collections import Counter
import json,html
import numpy as np
from PIL import Image,ImageDraw
f=Path('output/resolution');audit=json.loads((f/'target-audit.json').read_text());n=192
keys=['unrotated','basis','basis-refined','multiscale-2'];labels=['160 optimized v7','192 fresh v6','192 refined v6','192 optimized v7']
def interp(a,size):
 old=a.shape[0];v=np.linspace(0,old-1,size)
 b=np.stack([np.stack([np.interp(v,np.arange(old),a[y,:,c]) for y in range(old)]) for c in range(3)],axis=2)
 return np.stack([np.stack([np.interp(v,np.arange(old),b[:,x,c]) for x in range(size)],axis=1) for c in range(3)],axis=2)
def png(a,path):Image.fromarray(np.clip(np.floor(a.astype(float)*255+.5),0,255).astype(np.uint8)).save(path)
arrays={k:np.frombuffer((f/f'{k}-common.f32').read_bytes(),dtype='<f4').reshape(n,n,3).astype(float) for k in keys}
target=np.frombuffer((f/'target.bin').read_bytes(),dtype=np.uint8).reshape(n,n,3)/255
oldTarget=interp(np.frombuffer(Path('output/regions/target.bin').read_bytes(),dtype=np.uint8).reshape(160,160,3)/255,n)
oldNative=interp(np.frombuffer(Path('output/guarded/multiscale-2.f32').read_bytes(),dtype='<f4').reshape(160,160,3),n)
regions={'left eye':(51,52,84,74),'right eye':(87,52,120,74),'nose':(70,76,104,103),'lips':(65,105,111,120),'left nostril':(74,88,84,99),'right nostril':(87,88,97,99),'jaw':(53,116,127,144),'light cheek':(100,78,117,104)}
# Old diagnostic inclusive sample centers mapped exactly to same normalized physical interval.
regions={k:(int(np.ceil(l/159*191)),int(np.ceil(t/159*191)),int(np.floor((r-1)/159*191))+1,int(np.floor((b-1)/159*191))+1) for k,(l,t,r,b) in regions.items()}
# Facial boxes preserve their exact inclusive membership including historical floating endpoints.
for k,key in [('nose','nose'),('lips','mouth')]:
 b=audit['crops'][key];regions[k]=(b['left'],b['top'],b['right']+1,b['bottom']+1)
lum=lambda a:a@np.array([.2126,.7152,.0722])
def sample(a,x,y):
 ix=np.floor(x).astype(int);iy=np.floor(y).astype(int);fx=(x-ix)[...,None];fy=(y-iy)[...,None]
 return (a[iy,ix]*(1-fx)+a[iy,ix+1]*fx)*(1-fy)+(a[iy+1,ix]*(1-fx)+a[iy+1,ix+1]*fx)*fy
metrics={};routes={};stages={};initialDetail={};sensitivity={};artifact=''
for k,label in zip(keys,labels):
 a=arrays[k];png(a,f/f'{k}-common.png')
 a_native=np.frombuffer((f/f'{k}.f32').read_bytes(),dtype='<f4').reshape(160 if k=='unrotated' else n,160 if k=='unrotated' else n,3);png(a_native,f/f'{k}.png')
 Image.open(f/f'{k}-common.png').resize((768,768),Image.Resampling.NEAREST).save(f/f'{k}-large.png')
 metrics[k]={};sensitivity[k]={}
 for name,(l,t,r,b) in regions.items():
  al=lum(a[t:b,l:r]);tl=lum(target[t:b,l:r]);diff=al-tl
  m={'rgbMse':float(np.mean((a[t:b,l:r]-target[t:b,l:r])**2)),'contrastRatio':float(np.std(al)/np.std(tl)),'darkExcessFraction':float(np.mean(diff<-.08)),'meanDarkExcess':float(np.mean(np.maximum(-diff,0))),'luminanceCorrelation':float(np.corrcoef(al.ravel(),tl.ravel())[0,1])}
  ys,xs=np.mgrid[t:b,l:r]
  for step in [1,2,4]:
   d=step*191/159
   e=np.concatenate([(sample(a,xs+d,ys)-sample(a,xs-d,ys)).ravel(),(sample(a,xs,ys+d)-sample(a,xs,ys-d)).ravel()]);q=np.concatenate([(sample(target,xs+d,ys)-sample(target,xs-d,ys)).ravel(),(sample(target,xs,ys+d)-sample(target,xs,ys-d)).ravel()])
   m[f'gradient{step*2}LegacyPxMse']=float(np.mean((e-q)**2));m[f'gradient{step*2}LegacyPxCorrelation']=float(np.corrcoef(e,q)[0,1])
  metrics[k][name]=m;sensitivity[k][name]=float(np.mean((a[t:b,l:r]-oldTarget[t:b,l:r])**2))
  initialDetail[name]={'targetLuminanceStd':float(np.std(tl)),'targetP10P90':list(map(float,np.quantile(tl,[.1,.9]))),'darkBaseGradientEnergy':float(np.mean(q*q))}
 source=Path('output/guarded/multiscale-2.json') if k=='unrotated' else f/f'{k}.json';data=json.loads(source.read_text());i=data['instruction'];m=i['metrics'];p=i['profile'];degree=Counter();pairs=Counter();lengths=[]
 for seg in i['segments']:
  for u,v in zip(seg['path'],seg['path'][1:]):
   degree[u]+=1;degree[v]+=1;pairs[tuple(sorted([u,v]))]+=1;u=p['pins'][u];v=p['pins'][v];lengths.append(float(np.hypot((u['x']-v['x'])*p['widthMm'],(u['y']-v['y'])*p['heightMm'])))
 assert max(degree.values())<=160 and max(pairs.values())<=32 and len(lengths)==m['lines']
 base=json.loads(Path('output/guarded/multiscale-2.json').read_text())['instruction'];assert p==base['profile'];assert i['params']['portrait']==audit['portrait']
 assert i['imageHash']==(base['imageHash'] if k=='unrotated' else audit['targetHash'])
 meters=sum((l+p['wrapAllowanceMm'])/1000*(1+p['wasteFraction']) for l in lengths)+.5*len(i['segments']);assert abs(meters-m['estimatedMeters'])<1e-5
 routes[k]={'maximumChordRepeats':max(pairs.values()),'maximumIncidentDegree':max(degree.values()),'nailsAt160':sum(v==160 for v in degree.values()),'chordsAt32':sum(v==32 for v in pairs.values()),'over300mm':sum(v>300 for v in lengths),'incidentByNail':dict(degree),'traversalsByUndirectedChord':{f'{a}:{b}':c for (a,b),c in pairs.items()},'recalculatedMeters':meters}
 stages[k]={'sequenceHash':i['sequenceHash'],'algorithm':i['algorithm'],'resolution':i['params']['resolution'],'metrics':m,'wrapperWallMs':data['durationMs'],'memory':data.get('memory','Historical process memory was not sampled; unavailable'), 'targetHash':i['imageHash'],'profile':p,'requestedSettings':i['params']}
 fit=m.get('densityFit',{});ref=m.get('refinement',{})
 artifact+=f"<tr><td>{label}</td><td>{m['lines']} ({fit.get('fittedConnections',m['lines'])} fit + {fit.get('routingConnections',0)} routing)</td><td>{meters:.3f} m / +{max(0,meters-p['stockMeters']):.3f} m</td><td>{m['durationMs']/1000:.1f}s / {data['durationMs']/1000:.1f}s</td><td>{m['stoppedReason']}; {fit.get('sweeps',0)} sweeps; refinement {ref.get('reason','n/a')}, {ref.get('evaluations',0)} evaluations</td><td>{max(pairs.values())}/{max(degree.values())}</td></tr>"
images={k:Image.open(f/f'{k}-common.png') for k in keys};images['crop']=Image.open(f/'crop.png').convert('RGB');images['target']=Image.open(f/'target.png').convert('RGB');names=['crop','target']+keys;allLabels=['Source crop 192','Direct target 192']+labels
col=260;height=sum((b-t)*4+50 for l,t,r,b in regions.values());sheet=Image.new('RGB',(col*len(names),height),'#faf8ef');d=ImageDraw.Draw(sheet);at=0
for name,box in regions.items():
 for j,k in enumerate(names):
  d.text((j*col+5,at+4),name+' / '+allLabels[j],fill='#222');im=images[k].crop(box);sheet.paste(im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST),(j*col+5,at+28))
 at+=(box[3]-box[1])*4+50
sheet.save(f/'regions-comparison.png')
ordinary=Image.new('RGB',(len(names)*180,202),'#faf8ef');d=ImageDraw.Draw(ordinary)
for j,k in enumerate(names):d.text((j*180+2,3),allLabels[j],fill='#222');ordinary.paste(images[k].resize((160,160),Image.Resampling.BILINEAR),(j*180+2,32))
ordinary.save(f/'ordinary-comparison.png')
native=Image.new('RGB',(4*200,202),'#faf8ef');nd=ImageDraw.Draw(native)
for j,(k,label) in enumerate([('crop','Source crop'),('target','Target192'),('unrotated','Native160 path'),('multiscale-2','Native192 path')]):
 im=Image.open(f/f'{k}.png').convert('RGB');nd.text((j*200+2,3),label,fill='#222');native.paste(im.resize((160,160),Image.Resampling.BILINEAR),(j*200+2,32))
native.save(f/'native-ordinary-comparison.png')
operatorDifference={name:float(np.mean((oldNative[t:b,l:r]-arrays['unrotated'][t:b,l:r])**2)) for name,(l,t,r,b) in regions.items()}
totalSolver=sum(stages[k]['metrics']['durationMs'] for k in keys[1:])/1000;totalWall=sum(stages[k]['wrapperWallMs'] for k in keys[1:])/1000
result={'reference':{'grid':192,'targetHash':audit['targetHash'],'interval':'sample-center x/(n-1), inclusive normalized diagnostic boxes','gradientOffsetsPixels':[191/159*s for s in [1,2,4]],'gradientPhysicalDistancesMm':[400/159*s for s in [1,2,4]],'evaluatedStrands':'All actual immutable traversals independently rerasterized on same192grid, including routing; no optimization seeds reused','display':'all common192 portraits reduced to160 with identical bilinear display; enlarged crops nearest x4','nativeMetrics':'Preserved for provenance; cross-resolution native edge metrics are not comparable'},'windows':regions,'diagnostics':metrics,'old160TargetSensitivityRgbMse':sensitivity,'targetDetail':initialDetail,'sameOldSequenceOperatorVsInterpolatedNativeMse':operatorDifference,'routes':routes,'stages':stages,'solverTotalSeconds':totalSolver,'wrapperTotalSeconds':totalWall,'qualityAccepted':False,'physicallyValidated':False}
(f/'measurements.json').write_text(json.dumps(result,indent=2))
assessment=(f/'assessment.md').read_text() if (f/'assessment.md').exists() else 'Assessment pending; default160/unrotated retained. Portrait and physical acceptance open.'
ra=json.loads((f/'resolution-audit.json').read_text())
cards=''.join(f'<figure><a href="{k+"-large" if k in keys else k}.png"><img src="{k+"-common" if k in keys else k}.png" width="160" height="160"></a><figcaption>{label}</figcaption></figure>' for k,label in zip(names,allLabels))
rows=''.join('<tr><td>'+name+'</td>'+''.join(f"<td>{metrics[k][name]['rgbMse']:.6f} / {metrics[k][name]['gradient4LegacyPxMse']:.6f} / {metrics[k][name]['darkExcessFraction']*100:.2f}%</td>" for k in ['unrotated','multiscale-2'])+'</tr>' for name in regions)
peak={field:max(stages[k]['memory']['peak'][field] for k in keys[1:]) for field in ['rss','heapUsed','external','arrayBuffers']}
page=f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Ip Rasm - 192 computation experiment</title><style>body{{max-width:1550px;margin:24px auto;padding:18px;font:16px/1.6 system-ui;background:#faf8ef;color:#233d32}}.grid{{display:flex;gap:20px;flex-wrap:wrap}}figure{{width:160px;margin:0}}figcaption{{font-size:13px}}.notice{{padding:18px;background:#f4e4ca}}table{{border-collapse:collapse;font-size:13px}}td,th{{padding:8px;border-bottom:1px solid #ccd2cc;text-align:left}}.wide{{width:100%;height:auto}}.scroll{{overflow-x:auto}}pre{{white-space:pre-wrap;font:inherit}}code{{overflow-wrap:anywhere}}</style>
<h1>160 → 192 computation — quality acceptance open</h1><p class="notice">Unchanged unrotated 240-pin board, 400 mm, 0.1 mm thread, opacity 0.85, original crop/preprocessing/normalized manual regions and 32-chord/160-incident safeguards. New immutable variant; progress 0. Sequence-only optical simulations. Physical wrapping capacity/tension and actual device performance remain unverified. Decision: inconclusive. Keep the 160-pixel, unrotated default.</p>
<p>Direct original reprocessing; old160target reproduced byte for byte first. New target SHA256 <code>{audit['targetHash']}</code>. No enlarged160 optimization target or transferred seed. Freshv6 → separate matching v6 refinement → v7weight2/eight sweeps. Solver total <strong>{totalSolver:.1f}s</strong>, wrapper wall <strong>{totalWall:.1f}s</strong>; preserved160 pipeline656.7s. Host load differs; no speed claim.</p>
<h2>Resolution audit and confounds</h2><p>{ra['disclosure']}</p><p>Pixel pitch2.516→2.094mm; coarse cells10.063→8.377mm. Local blur13→17samples (32.704→35.602mm); background27→31samples (67.925→64.921mm). Fixed contrast offsets shrink16.8%; per-pixel derivatives are not physical derivatives. Material area scales correctly, while cell alpha/spatial support change. <a href="resolution-audit.json">Weights, objective normalization, target difference</a> | <a href="coverage-audit.json">Measured physical strand area and cell coverage</a>.</p>
<h2>Native previews — ordinary size</h2><p>Each guide reconstructed at its own recorded optimization grid, displayed at the same160pxsize. This complements the common-grid comparison below; changing the raster operator can alter even an unchanged old path. <a href="native-ordinary-comparison.png">Native ordinary before/after alongside source/target</a>.</p><div class="grid"><figure><img src="unrotated.png" width="160" height="160"><figcaption>Preserved native160v7</figcaption></figure><figure><img src="multiscale-2.png" width="160" height="160"><figcaption>Fresh native192v7</figcaption></figure></div>
<h2>Common-grid ordinary size — identical display scale</h2><p>Actual paths rerasterized on common192sample centers; every portrait displayed at160px. Source and target are separate columns. Click reconstructions for768px inspection. <a href="ordinary-comparison.png">Ordinary comparison image</a>.</p><div class="grid">{cards}</div>
<h2>Corrected normalized regions on direct192target</h2><img src="corrected-overlay.png" width="384" height="384" alt="Eyes nose mouth manual overlays on192target"><p>Eyes62..142/63..87; nose85..123/92..122; lips79..132/127..144 inclusive. Manual annotations, not detected anatomy; inspected before generation. Crop, settings and coordinate reference preserved.</p>
<h2>Equal enlarged actual-feature crops</h2><a href="regions-comparison.png"><img class="wide" src="regions-comparison.png" alt="Both eyes nostrils nose actual lips jaw and skin at same spatial scale"></a>
<h2>Common-reference measurements</h2><p>RGB error / gradient error at ±5.031mm / dark excess &gt;.08 luminance. Identical192target and physical gradients via fractional sample interpolation. Metrics are not likeness scores. Measurements also retain sensitivity to old160target resampled for evaluation only, native-stage metrics and same-old-path operator discrepancy.</p><div class="scroll"><table><tr><th>Region</th><th>160 optimized actual path</th><th>192 optimized actual path</th></tr>{rows}</table></div>
<h2>All connections, thread, stages and memory</h2><div class="scroll"><table><tr><th>Variant</th><th>Connections incl.routing</th><th>Thread / additional600mstock</th><th>Solver / wrapper</th><th>Stops</th><th>Max chord/incident</th></tr>{artifact}</table></div><p>Peak sampled Node process memory: RSS{peak['rss']/1048576:.1f}MiB,heap{peak['heapUsed']/1048576:.1f}MiB,external{peak['external']/1048576:.1f}MiB,array buffers{peak['arrayBuffers']/1048576:.1f}MiB.250ms timer sampled only when event loop yields; these are observed maxima, not guaranteed instantaneous peaks. Includes earlier stages in the process; historical160 process memory unavailable. Footprint cache bounded32MiB; total process memory is distinct.</p>
<h2>Visual decision, limitations and next experiment</h2><pre>{html.escape(assessment)}</pre>
<p><a href="measurements.json">Full metrics/distributions/settings/hashes/memory</a> | <a href="multiscale-2-guide.json">New immutable192guide progress0</a> | <a href="multiscale-2-guide.pdf">Complete physical instructions/PDF</a> | <a href="multiscale-2-guide.txt">Every ordered step and knot</a> | <a href="multiscale-2-guide.png">Exact guide preview</a> | <a href="/output/guarded/report.html">Preserved160 report</a> | <a href="/">Try local website</a></p></html>'''
for old,new in [('unrotated240-pin board,400mm,0.1mm thread,opacity.85','unrotated 240-pin board, 400 mm, 0.1 mm thread, opacity 0.85'),('eight sweeps.','eight sweeps.'),('old160target','old 160 target'),('Direct192target','Direct 192 target'),('v7weight2','v7 weight 2'),('Freshv6','Fresh v6'),('matching v6','matching v6'),('separate matching v6','separate matching v6'),('source192','source 192'),('same160pxsize','same 160 px size'),('common192sample centers','common 192 sample centers'),('direct192target','direct 192 target'),('physical gradients via','physical gradients via'),('Node process memory','Node process memory')]:
 page=page.replace(old,new)
(f/'report.html').write_text(page,encoding='utf-8');print(json.dumps({'totalSolverSeconds':totalSolver,'totalWrapperSeconds':totalWall,'peakMemory':peak,'comparison':{k:metrics[k] for k in ['unrotated','multiscale-2']}},indent=2))
