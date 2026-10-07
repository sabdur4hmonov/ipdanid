"""Local derived evidence. Never use a source overlay in a reconstruction."""
from pathlib import Path
from collections import Counter
import json, math, html
import numpy as np
from PIL import Image, ImageDraw
f=Path('output/shape-fit');a=json.loads((f/'audit.json').read_text());n=a['resolution'];names=['before','after']+(['physical'] if (f/'physical.json').exists() else [])
records={k:json.loads((f/(k+'.json')).read_text()) for k in names}
arrays={k:np.frombuffer((f/(k+'.f32')).read_bytes(),dtype='<f4').reshape(n,n,3).astype(float) for k in names}
def img(v):return Image.fromarray(np.clip(np.floor(v*255+.5),0,255).astype('uint8'))
def box(b):return (b['left'],b['top'],b['left']+b['width'],b['top']+b['height'])
eyes=a['stages']['before']['portrait']['regions']['eyes'];l,t,r,b=box(eyes);mid=(l+r)/2
regions={'left eye':(l,t,mid,b),'right eye':(mid,t,r,b),'nose':box(a['stages']['before']['portrait']['regions']['nose']),'lips':box(a['stages']['before']['portrait']['regions']['mouth']),
 'jaw':(53/159,116/159,127/159,143/159),'light cheek':(100/159,78/159,117/159,103/159)}
regions['left nostril']=(74/159,88/159,83/159,98/159);regions['right nostril']=(87/159,88/159,96/159,98/159)
face0=a['stages']['before']['portrait']['face'];face1=a['stages']['after']['portrait']['face'];ratio=a['fit']['ratio']
def mapped(rect,name):
 if name=='before':return rect
 l,t,r,b=rect
 return tuple((face1['left']+(x-face0['left'])*ratio if j%2==0 else face1['top']+(x-face0['top'])*ratio) for j,x in enumerate([l,t,r,b]))
def crop(im,rect):
 # Same source-relative window, equivalent 64 sample centers. No per-result enhancement.
 l,t,r,b=rect;return im.transform((64,64),Image.Transform.EXTENT,(.5+l*(n-1),.5+t*(n-1),.5+r*(n-1),.5+b*(n-1)),Image.Resampling.BILINEAR)
fit_objective=None
for line in (f/'physical.log').read_text(encoding='utf8').splitlines():
 if line.startswith('{'+chr(34)+'stage'+chr(34)+':'+chr(34)+'fit'+chr(34)):
  fit_objective=json.loads(line)['objective']
measure={};stats={};full=Image.new('RGB',(4*224,len(names)*270),'#fff');draw=ImageDraw.Draw(full)
for row,k in enumerate(names):
 i=records[k]['instruction'];p=i['profile'];m=i['metrics'];out=img(arrays[k]);out.save(f/(k+'.png'));out.resize((768,768),Image.Resampling.NEAREST).save(f/(k+'-large.png'))
 source=Image.open(f/(('after' if k=='physical' else k)+'-crop.png')).convert('RGB');target=Image.open(f/(('after' if k=='physical' else k)+'-target.png')).convert('RGB');overlay=target.copy();d=ImageDraw.Draw(overlay)
 for name in ['eyes','nose','mouth']:
  l,t,r,b=box(a['stages']['after' if k=='physical' else k]['portrait']['regions'][name]);d.rectangle((.5+l*(n-1),.5+t*(n-1),.5+r*(n-1),.5+b*(n-1)),outline={'eyes':'blue','nose':'orange','mouth':'red'}[name],width=1)
 overlay.resize((768,768)).save(f/(k+'-overlay.png'))
 for j,(label,im) in enumerate([('source crop',source),('processed target',target),('exact sequence',out),('corrected regions',overlay)]):
  full.paste(im.resize((192,192)),(j*224+16,row*270+40));draw.text((j*224+10,row*270+12),k+' / '+label,fill='black')
 measure[k]={}
 for region,rect in regions.items():
  rect=mapped(rect,k);pred=np.asarray(crop(out,rect))/255;truth=np.asarray(crop(target,rect))/255;lum=pred@np.array([.2126,.7152,.0722]);tlum=truth@np.array([.2126,.7152,.0722]);delta=lum-tlum
  measure[k][region]={'reference':'source-relative manually defined window, bilinear 64x64; cross-crop preprocessing is a confound','box':rect,'rgbMse':float(np.mean((pred-truth)**2)),'luminanceCorrelation':float(np.corrcoef(lum.ravel(),tlum.ravel())[0,1]),'contrastRatio':float(np.std(lum)/np.std(tlum)),'darkExcessFraction':float(np.mean(delta<-.08))}
 deg=Counter();pairs=Counter();crossings=0;chord=0
 for segment in i['segments']:
  for u,v in zip(segment['path'],segment['path'][1:]):
   deg.update([u,v]);pairs[tuple(sorted([u,v]))]+=1;pin=p['pins'][u];q=p['pins'][v];length=math.hypot((pin['x']-q['x'])*p['widthMm'],(pin['y']-q['y'])*p['heightMm']);chord+=length/1000;crossings+=length>300
 knots=2*len(i['segments'])
 assert max(deg.values())<=160 and max(pairs.values())<=32
 stats[k]={'hash':i['sequenceHash'],'targetHash':i['imageHash'],'algorithm':i['algorithm'],'connections':m['lines'],'allConnectionsCounted':sum(pairs.values()),'extraRoutingStage':m.get('densityFit',{}).get('routingConnections',0),'meters':m['estimatedMeters'],'rawChordMeters':chord,'shortfallMeters':m['stockShortfallMeters'],'maxIncident':max(deg.values()),'maxChordRepeat':max(pairs.values()),'chordsOver300mm':crossings,'stop':m['stoppedReason'],'generationSeconds':records[k]['wrapperMs']/1000,'completeAttributedSeconds':records[k].get('completeAttributedMs',records[k]['wrapperMs'])/1000,'fitObjective':fit_objective if k=='physical' else None,'routedObjective':m.get('weightedError',{}).get('final'),'engineSeconds':m['durationMs']/1000,'sampledPeakMiB':records[k]['sampledPeakRss']/2**20,'starts':len(i['segments']),'knots':knots,'colorChanges':len(i['segments'])-1,'physicalActions':m['lines']+knots,'estimatedMinutes':(m['lines']*5+knots*20)/60,'estimatedTimeAssumption':'5s per connection including wrap/reposition;20s per knot including cut; NOT measured customer time','progress':0}
full.save(f/'comparison.png')
enlarged=Image.new('RGB',(len(names)*3*168,len(regions)*190),'white');d=ImageDraw.Draw(enlarged)
for row,(region,rect) in enumerate(regions.items()):
 for col,(k,kind) in enumerate([(k,kind) for k in names for kind in ['crop','target','sequence']]):
  im=img(arrays[k]) if kind=='sequence' else Image.open(f/(('after' if k=='physical' else k)+'-'+kind+'.png')).convert('RGB');im=crop(im,mapped(rect,k)).resize((160,160),Image.Resampling.NEAREST);enlarged.paste(im,(col*168,row*190+26));d.text((col*168,row*190+5),k+' '+region+' '+kind,fill='black')
enlarged.save(f/'features.png')
(f/'measurements.json').write_text(json.dumps({'statistics':stats,'regions':measure,'fit':a['fit'],'preparationMs':a.get('preparationMs'),'acceptance':'framing functionality verified; portrait quality OPEN; fit is not a likeness breakthrough'},indent=2))
cards=''.join('<section><h2>'+k+'</h2><img width="192" height="192" src="'+('after' if k=='physical' else k)+'-crop.png"><img width="192" height="192" src="'+k+'.png"><pre>'+html.escape(json.dumps(stats[k],indent=2))+'</pre></section>' for k in names)
(f/'report.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ip Rasm — shape framing experiment</title><style>body{font:16px system-ui;margin:24px;background:#faf8ef;color:#18201d;max-width:1150px}img{max-width:100%;height:auto}section{display:inline-block;vertical-align:top;max-width:520px;margin:10px}pre{white-space:pre-wrap;font-size:13px}a{color:#235544}</style><h1>Shape framing — separate 160-pin heart</h1><p>Original local photo. Neither reconstruction contains a source overlay. Before/after v6 differ in crop and remapped manual regions, not solver/material settings. Physical v8 is a SEPARATE optimizer change at the identical fitted target;8 sweeps,weight2,physical millimeter contrast. This does NOT recreate the attached screenshot whose settings are unknown.</p><p>Framing improvement: the marked face now fits the concave heart. Portrait quality is OPEN: eyes, nose volume and lip separation remain weak, with crossing texture. Fitting a smaller face also reduces its computational and physical area. Physical v8 improves some nose/eye tone relative to fitted v6, but nostrils and lip separation remain weak. INCONCLUSIVE likeness gain, reject default promotion. No Qbrix-identical output claim.</p><p>240-pin heart rejected: minimum spacing1.09546mm &lt; required1.6mm;192 pins also insufficient1.53458mm. Separate160-pin heart minimum2.02156mm. Same400mm board/.1mm thread/.85opacity/32repeat/160incident guards;192 computational pixels. These are provisional safeguards, not measured capacity.</p><p>Source crop, processed target, exact full guide and region overlay (overlay on target only). Ordinary portraits below are192px, full native images linked.</p>'''+cards+'''<h2>Full comparison</h2><img src="comparison.png"><h2>Matched source-relative windows</h2><p>Both eyes, nose, lips, jaw, skin and nostrils. Equal bilinear64×64 sampling, enlarged identically without enhancement. Changed crop/preprocessing limits metric comparison; measurements are diagnostics, not likeness scores.</p><img src="features.png"><p><a href="before-large.png">Before full</a> · <a href="after-large.png">After full</a> · <a href="measurements.json">Measurements</a> · <a href="audit.json">Original/crop/material audit</a> · <a href="physical-guide.json">New zero-progress project</a> · <a href="physical-guide.pdf">New matching heart template + all steps PDF</a> · <a href="/">Test website</a></p><p>No physical trial, device execution or production activation. Thread estimates include wraps/waste and all connections; stock is not a quality cap. Generation time includes validation/reconstruction wrapper, preprocessing and manual-fit timing were not sampled and are excluded from attributed solver timing. No append-only/lightening claim. These different crops are not quality-preserving simplification.</p></html>''',encoding='utf8')
print(json.dumps(stats,indent=2))
