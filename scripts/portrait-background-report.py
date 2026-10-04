"""Local-only paired preprocessing diagnostics. No photo synthesis or likeness scores."""
from pathlib import Path
import json, html
import numpy as np
from PIL import Image, ImageDraw

folder = Path('output/background')
lightName='light-protected'
data = {v:json.loads((folder/f'{lightName if v=="light" else v}.json').read_text(encoding='utf-8')) for v in ['control','light']}
setup = {v:json.loads((folder/f'{lightName if v=="light" else v}-setup.json').read_text(encoding='utf-8')) for v in data}
assert data['control']['sourceHash'] == data['light']['sourceHash']
assert data['control']['edits'] == data['light']['edits']
assert setup['control']['profile'] == setup['light']['profile']
assert setup['control']['evaluationFace'] == setup['light']['evaluationFace']
assert setup['control']['optimizer'] == setup['light']['optimizer']
assert data['control']['instruction']['params']['optimization'] == data['light']['instruction']['params']['optimization']
assert (folder/'control-crop.png').read_bytes() == (folder/f'{lightName}-crop.png').read_bytes()
boxes={'left eye':(51,55,83,76),'right eye':(87,55,119,76),'nose':(70,76,103,103),'mouth':(65,105,110,121),'jaw':(53,116,126,143),'light cheek':(100,78,116,103)}
names=['control-crop','control-target','light-target','control','light']
labels=['Source crop','Existing target','Light-background target','Control strands','Light-background strands']
paths={k:k.replace('light',lightName) for k in names}
images={k:Image.open(folder/f'{paths[k]}.png').convert('RGB') for k in names}
arrays={k:np.asarray(im,dtype=np.float64)/255 for k,im in images.items()}
gray={k:a@np.array([.2126,.7152,.0722]) for k,a in arrays.items()}
def measure(t,r,box):
 x0,y0,x1,y1=box; t=t[y0:y1,x0:x1]; r=r[y0:y1,x0:x1]
 tg=np.concatenate([np.diff(t,axis=0).ravel(),np.diff(t,axis=1).ravel()]); rg=np.concatenate([np.diff(r,axis=0).ravel(),np.diff(r,axis=1).ravel()])
 return dict(mse=float(np.mean((r-t)**2)),meanBias=float(np.mean(r-t)),darkExcessFraction=float(np.mean(r<t-.08)),edgeMse=float(np.mean((rg-tg)**2)),gradientCorrelation=float(np.corrcoef(tg,rg)[0,1]),targetContrast=float(np.std(t)),resultContrast=float(np.std(r)),contrastRatio=float(np.std(r)/np.std(t)))
metrics={v:{region:measure(gray['control-target'],gray[v],box) for region,box in boxes.items()} for v in data}
changed={}
for region,(x0,y0,x1,y1) in boxes.items():
 changed[region]=int(np.any(arrays['control-target'][y0:y1,x0:x1]!=arrays['light-target'][y0:y1,x0:x1],axis=2).sum())
 assert changed[region]==0, f'Foreground evaluation target changed: {region}'
scales={v:{} for v in data}
for v in data:
 for region, box in boxes.items():
  scales[v][region]={}
  for scale in [1,2,4,8]:
   def reduced(name):
    c=images[name].crop(box); return np.asarray(c.resize((max(1,c.width//scale),max(1,c.height//scale)),Image.Resampling.BOX),dtype=float)@np.array([.2126,.7152,.0722])/255
   scales[v][region][scale]=float(np.mean((reduced(v)-reduced('control-target'))**2))
def sheet(regions,scale,name):
 col=max(int((b[2]-b[0])*scale)+22 for _,b in regions); h=sum(int((b[3]-b[1])*scale)+46 for _,b in regions)
 out=Image.new('RGB',(len(names)*col,h),'#faf8ef'); d=ImageDraw.Draw(out);y=0
 for region,b in regions:
  for j,k in enumerate(names):
   crop=images[k].crop(b);crop=crop.resize((int(crop.width*scale),int(crop.height*scale)),Image.Resampling.NEAREST)
   out.paste(crop,(j*col,y+24));d.text((j*col,y),f'{region} / {k}',fill='black')
  y+=int((b[3]-b[1])*scale)+46
 out.save(folder/name)
sheet([('full portrait',(0,0,160,160))],1,'ordinary-comparison.png')
sheet(list(boxes.items()),4,'regions-comparison.png')
values={v:dict(sequenceHash=d['instruction']['sequenceHash'],targetHash=d['instruction']['imageHash'],lineCount=d['instruction']['metrics']['lines'],threadMeters=d['instruction']['metrics']['estimatedMeters'],additionalThreadMeters=d['instruction']['metrics']['stockShortfallMeters'],totalGenerationSeconds=d['durationMs']/1000,globalFitSeconds=d['fitDurationMs']/1000) for v,d in data.items()}
evidence=dict(comparison='Preprocessing only; same source/crop/240 pins/0.1mm/400mm/160px/v4+v4+v5/regions',manualPixelBoxes=boxes,foregroundTargetChangedPixels=changed,backgroundTargetChangedPixels=int(np.any(arrays['control-target']!=arrays['light-target'],axis=2).sum()),regionsAgainstIdenticalForeground=metrics,multiscaleRegionMse=scales,variants=values,qualityAcceptance='OPEN',physicallyValidated=False,nativeDeviceTested=False)
(folder/'measurements.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
rows=''.join(f'<tr><td>{html.escape(r)}</td><td>{metrics["control"][r]["mse"]:.6f} → {metrics["light"][r]["mse"]:.6f}</td><td>{metrics["control"][r]["edgeMse"]:.6f} → {metrics["light"][r]["edgeMse"]:.6f}</td><td>{metrics["control"][r]["gradientCorrelation"]:.3f} → {metrics["light"][r]["gradientCorrelation"]:.3f}</td><td>{metrics["control"][r]["contrastRatio"]:.3f} → {metrics["light"][r]["contrastRatio"]:.3f}</td></tr>' for r in boxes)
cards=''.join(f'<figure><figcaption>{label}</figcaption><img src="{paths[k]}.png" width="160" height="160" alt="{label}" /></figure>' for k,label in zip(names,labels))
details=''.join(f'<tr><td>{v}</td><td>{x["lineCount"]:,}</td><td>{x["threadMeters"]:.3f} m</td><td>{x["additionalThreadMeters"]:.3f} m</td><td>{x["totalGenerationSeconds"]:.1f} s / {x["globalFitSeconds"]:.1f} s</td></tr>' for v,x in values.items())
hashes=''.join(f'<p>{v}: <code>{x["sequenceHash"]}</code></p>' for v,x in values.items())
page=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ip Rasm — controlled background experiment</title><style>body{{font:16px/1.6 system-ui;background:#faf8ef;color:#26382c;margin:24px auto;max-width:1200px;padding:0 16px}}.portraits{{display:flex;flex-wrap:wrap;gap:12px}}figure{{margin:0}}figcaption{{font-size:13px}}.portraits img{{width:160px;height:160px}}img.sheet{{max-width:100%;height:auto;image-rendering:pixelated}}table{{border-collapse:collapse;display:block;overflow:auto}}td,th{{padding:8px;border:1px solid #bcc9bd;text-align:left;white-space:nowrap}}code{{overflow-wrap:anywhere}}a{{color:#245b35}}</style><h1>Controlled background experiment</h1><p><a href="/">Open Ip Rasm to test locally</a> · <a href="/output/fidelity/report.html">Preserved optimizer report</a></p><p><strong>Quality acceptance remains OPEN.</strong> These are optical simulations, with no physical assembly or native device trial. A light background cannot guarantee likeness. The earlier 5 px feather-margin trial is preserved separately (light.json) and was rejected after foreground-window pixel changes and worse eye/nose residuals. <strong>The light-background variant is not selected as a likeness improvement: nose/mouth residuals and right-eye agreement worsen.</strong> This experiment changes preprocessing only; it does not introduce a new optimizer.</p><p>Same original photo, crop zoom 1.3, 400 mm circle, 240 pins, configured 0.1 mm thread, 160 px computation, same portrait weighting and regional windows. Both targets start a fresh continuous v4 sequence, continue once, then run the unchanged guarded v5 eight-sweep solver. Control must reproduce all three preserved sequence hashes.</p><h2>Ordinary-size comparison (160 px)</h2><div class="portraits">{cards}</div><h2>Enlarged facial details</h2><img class="sheet" src="regions-comparison.png" alt="Both eyes, nose, mouth, jaw and light cheek before and after background preprocessing"><p>The new mask is a manually traced outer silhouette with an 8 px protective margin, explicitly protected evaluation windows and a feathered 64×64 selection. Hair, ears, jaw, neck and shirt are retained. No automatic foreground detection is claimed. Unpainted pixels remain exactly the existing processed target; all six evaluation windows have zero changed target pixels. The app provides paint, restore, undo, clear, strength and before/after controls, without a source-photo overlay in strand previews.</p><h2>Same-foreground measurements</h2><p>These measure tone and gradient agreement, not identity recognition or physical quality. Both reconstructions are measured against the identical existing foreground pixels. Whole-image MSE against differing backgrounds cannot establish improved facial likeness.</p><table><tr><th>Manual region</th><th>Luminance MSE</th><th>Adjacent edge MSE</th><th>Gradient correlation</th><th>Contrast / target</th></tr>{rows}</table><h2>Build requirements</h2><table><tr><th>Variant</th><th>Connections</th><th>Estimated thread incl. wraps/waste</th><th>Additional beyond 600 m stock</th><th>Total stages / final fit time</th></tr>{details}</table><p>Materials and stock estimates are unchanged. Guards are provisional distribution limits, not tested winding capacity. Every routing strand contributes to preview, assembly and length. New variants start at zero confirmed steps.</p>{hashes}<p><a href="light-protected-guide.json">Import light-background project JSON</a> · <a href="light-protected-guide.pdf">Exact-sequence PDF</a> · <a href="light-protected-guide.txt">Complete ordered text guide</a> · <a href="measurements.json">Measurements and hashes</a></p><h2>Remaining limitations and next experiment</h2><p>The light variant reduces background clutter and whole-image error, but worsens right-eye, nose and mouth tone/gradient agreement. Preserve the control as the current experimental guide. Nose and lips remain indistinct at ordinary size; background simplification has not solved that limitation. The next independent optimizer experiment is a separately versioned 2/4 px local-contrast objective, with the processed target fixed. Compare both eyes, nostril/lip gradients, jaw and light-skin darkening against this control; reject improvements based solely on global MSE. A varied consented portrait set and a real physical build are still required.</p></html>'''
(folder/'report.html').write_text(page,encoding='utf-8')
print(json.dumps(evidence))
