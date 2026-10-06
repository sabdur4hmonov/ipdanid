from pathlib import Path
import json,numpy as np
f=Path('output/resolution');a=json.loads((f/'target-audit.json').read_text());p=a['portrait'];out={}
for n,path in [(160,Path('output/regions/target.bin')),(192,f/'target.bin')]:
 t=np.frombuffer(path.read_bytes(),dtype=np.uint8).reshape(n,n,3)/255;lum=t.mean(axis=2);y,x=np.mgrid[:n,:n];x=x/(n-1);y=y/(n-1);mask=(x-.5)**2+(y-.5)**2<=.25+1e-8
 def box(b):return (x>=b['left'])&(x<=b['left']+b['width'])&(y>=b['top'])&(y<=b['top']+b['height'])
 face=box(p['face']);features=np.zeros_like(mask)
 for k in ['eyes','nose','mouth']:features|=box(p['regions'][k])
 edge=np.abs(lum[:,np.minimum(np.arange(n)+1,n-1)]-lum[:,np.maximum(np.arange(n)-1,0)])+np.abs(lum[np.minimum(np.arange(n)+1,n-1)]-lum[np.maximum(np.arange(n)-1,0)])
 w6=(1+np.minimum(2,edge*5))*np.where(face,5,1)*np.where(features,2,1);w7=np.where(features,16,np.where(face,8,1));tone=float(np.sum(w7[mask]*(lum[mask]-np.mean([250,248,239])/255)**2));contrast=0
 for d in [1,2,4]:
  for axis in [0,1]:
   u=[slice(None),slice(None)];v=[slice(None),slice(None)];u[axis]=slice(None,-d);v[axis]=slice(d,None);u=tuple(u);v=tuple(v);valid=mask[u]&mask[v];term=(w7[u]+w7[v])*.5*2/d**2*(lum[u]-lum[v])**2;contrast+=float(np.sum(term[valid]))
 out[n]={'pixelPitchMm':400/(n-1),'threadPixelWidth':.1*(n-1)/400,'localBlurRadiusPixels':round(n*.04),'backgroundBlurRadiusPixels':round(n*.08),'localBlurDiameterMm':(2*round(n*.04)+1)*400/(n-1),'backgroundBlurDiameterMm':(2*round(n*.08)+1)*400/(n-1),'v6CoarseCellMm':4*400/(n-1),'v7ContrastDistancesMm':[d*400/(n-1) for d in [1,2,4]],'meanV6Weight':float(w6[mask].mean()),'v6WeightSum':float(w6[mask].sum()),'v7WeightSum':float(w7[mask].sum()),'meanV7Weight':float(w7[mask].mean()),'v7InitialTone':tone,'v7InitialContrast':contrast,'v7InitialObjectivePerWeight':(tone+contrast)/float(w7[mask].sum()),'maskSamples':int(mask.sum()),'featureSamples':{k:int((box(p['regions'][k])&mask).sum()) for k in ['eyes','nose','mouth']}}
# Endpoint aligned interpolation of old target onto common sample-center grid, not generation input.
old=np.frombuffer(Path('output/regions/target.bin').read_bytes(),dtype=np.uint8).reshape(160,160,3)/255
v=np.linspace(0,159,192);oldcommon=np.stack([np.stack([np.interp(v,np.arange(160),old[y,:,c]) for y in range(160)]) for c in range(3)],axis=2)
oldcommon=np.stack([np.stack([np.interp(v,np.arange(160),oldcommon[:,x,c]) for x in range(192)],axis=1) for c in range(3)],axis=2)
new=np.frombuffer((f/'target.bin').read_bytes(),dtype=np.uint8).reshape(192,192,3)/255
out['targetInterpolationDifference']={'mse':float(np.mean((oldcommon-new)**2)),'maximumChannelDifference':float(np.max(np.abs(oldcommon-new))),'reference':'normalized sample centers; direct original 192 target versus endpoint-bilinear old160 target; interpolated image is evaluation only'}
out['disclosure']='Existing v6/v7 semantics retained. Physical thread area conserved; bilinear-cell support and nonlinear opacity differ. Fixed 1/2/4 pixel contrasts and 4px coarse cells shrink physically; v6 edge weights use unnormalized 1px derivatives. Preprocessing normalized radii round differently. Weight-normalized mean losses remove pixel-count growth but do not restore equivalent spatial objective. This is NOT a pure target-resolution-only comparison.'
(f/'resolution-audit.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
