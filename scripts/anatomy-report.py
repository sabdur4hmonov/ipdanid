from pathlib import Path
import json,html,shutil
from PIL import Image,ImageDraw
root=Path('output/anatomy');e=json.loads((root/'evaluation.json').read_text());rows=e['rows'];control=rows[1]
changes={key:{m:100*(1-rows[2]['regions'][key][m]/control['regions'][key][m]) for m in ['mse','edgeMse']} for key in ['face','eyes','nose','mouth']}
(root/'comparison.json').write_text(json.dumps(dict(commonResolution=384,positiveMeansErrorReduction=True,versusEqualBudgetControl=changes,qualityAcceptance='inconclusive; no default promotion',physicalAcceptance=False),indent=2))
sheet=Image.new('RGB',(1200,660),'#faf8ef');d=ImageDraw.Draw(sheet)
for j,row in enumerate(rows):
 d.text((j*400+8,8),row['name']+' / native160',fill='#18201d');sheet.paste(Image.open(root/(row['name']+'-native.png')),(j*400+8,30))
 d.text((j*400+8,210),'All actual strands / common384',fill='#18201d');sheet.paste(Image.open(root/(row['name']+'-common.png')),(j*400+8,235))
sheet.save(root/'comparison.png')
settings=json.loads(Path('output/circle-head-240/circle-settings.json').read_text());feature=Image.new('RGB',(900,540),'#faf8ef');d=ImageDraw.Draw(feature)
from math import ceil,floor
for y,key in enumerate(['eyes','nose','mouth']):
 box=settings['portrait']['regions'][key];l=ceil(box['left']*159);t=ceil(box['top']*159);r=floor((box['left']+box['width'])*159)+1;b=floor((box['top']+box['height'])*159)+1
 for x,name in enumerate(['target','reference','control','nose-lip']):
  p=Path('output/circle-head-240/circle-target.png') if name=='target' else root/(name+'-native.png')
  feature.paste(Image.open(p).crop((l,t,r,b)).resize((210,120),Image.Resampling.BILINEAR),(x*225+4,y*180+30));d.text((x*225+4,y*180+8),name+' / '+key,fill='#18201d')
feature.save(root/'features.png')
shutil.copy2('output/contour/weight-2-guide.pdf',root/'control-guide.pdf')
body='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ip Rasm nose and lip priority</title><style>body{font:16px system-ui;margin:24px;background:#faf8ef;color:#18201d;max-width:1250px}img{max-width:100%;height:auto}table{border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #dce2d4;text-align:left}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#235544}.scroll{overflow:auto}</style><h1>Separate nose and lip priority</h1><p>Same owner-local source, processed target, crop, 240 unrotated pins, 400x400mm board, 0.1mm thread and provisional winding guards. Both two-sweep fits start from the identical preserved circle240 reference. The equal-budget control is preserved and independently replayed, not regenerated. The new v10 objective uses a smooth raised-cosine importance increase only inside source-aligned manual nose/lip boxes; eye weights, face/background weights and every source pixel stay unchanged. Maximum center importance is 48 instead of 16; full optical tone and contrast loss includes the weighting. The actual resulting route may still affect other facial regions.</p><p><b>Quality remains inconclusive; defaults are unchanged.</b> Common384 nose tone and contour errors decrease, but eye errors increase and lip contours worsen. Fewer connections are not accepted quality-preserving savings. There is no physical acceptance or recommendation to assemble this diagnostic. Pixel metrics do not establish human likeness.</p><h2>Ordinary native portraits and physical common384 replay</h2><p>Complete immutable strand sequences, including every routing connection. No photographic overlays, invented anatomy or result-specific sharpening.</p><img src="comparison.png" alt="Actual reference, control and nose-lip strand reconstructions"><h2>Same source-derived feature windows and enlargement</h2><img src="features.png" alt="Unchanged target and actual strand facial details"><h2>Exact material and compute evidence</h2><div class="scroll"><table><tr><th>Variant</th><th>Connections</th><th>Estimated thread</th><th>Fit-stage time</th></tr>'''
for row in rows:
 evidence={} if row['name']=='reference' else json.loads((root/(row['name']+'.json')).read_text())['evidence']
 timing='Historical reference; not rerun' if not evidence else f"{evidence['fullStageMs']/1000:.2f}s (existing seed)"+(' / retained prior run' if evidence.get('reusedEqualBudgetControl') else '')
 body+=f"<tr><td>{row['name']}</td><td>{row['connections']}</td><td>{row['meters']:.3f}m; +{max(0,row['meters']-600):.3f}m beyond 600m</td><td>{timing}</td></tr>"
body+='</table></div><h2>Common384 differences against equal-budget control</h2><p>Positive: error reduction. Negative: worsening. Same canonical source target, source-remapped manual windows and real board/thread geometry.</p><pre>'+html.escape(json.dumps(changes,indent=2))+'</pre><p><a href="evaluation.json">Exact replay and offline evidence</a> · <a href="comparison.json">Measurements</a> · <a href="common-target.png">Canonical target384</a> · <a href="control-guide.pdf">Preserved control guide</a> · <a href="nose-lip-guide.pdf">Complete diagnostic guide</a> · <a href="http://127.0.0.1:4183/">Website</a></p></html>'
(root/'report.html').write_text(body,encoding='utf8')
r=json.loads(Path('output/completion/anatomy-unit-final.json').read_text());print({k:r[k] for k in ['numTotalTests','numPassedTests','numFailedTests']});print(json.dumps(changes))
