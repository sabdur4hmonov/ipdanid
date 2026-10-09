"""Private common-grid comparison of all actual strands; no photo overlay."""
from pathlib import Path
import json,html
from PIL import Image,ImageDraw
root=Path('output/contour');e=json.loads((root/'evaluation.json').read_text())
rows=e['rows'];control=next(r for r in rows if r['name']=='weight-2');reference=rows[0]
changes={}
for row in rows[1:]:
 changes[row['name']]={base['name']:{key:{metric:100*(1-row['regions'][key][metric]/base['regions'][key][metric]) for metric in ['mse','edgeMse']} for key in ['eyes','nose','mouth']} for base in [reference,control]}
(root/'comparison.json').write_text(json.dumps(dict(commonResolution=384,positiveMeansErrorReduction=True,changes=changes,qualityAcceptance='inconclusive; no default promotion',physicalAcceptance=False),indent=2))
sheet=Image.new('RGB',(1200,628),'#faf8ef');draw=ImageDraw.Draw(sheet)
for j,row in enumerate(rows):
 draw.text((j*400+8,8),row['name']+' / native160',fill='#18201d');sheet.paste(Image.open(root/(row['name']+'-native.png')),(j*400+8,30))
 draw.text((j*400+8,205),'Actual complete strands / common384',fill='#18201d');sheet.paste(Image.open(root/(row['name']+'-common.png')),(j*400+8,230))
sheet.save(root/'comparison.png')
settings=json.loads(Path('output/circle-head-240/circle-settings.json').read_text())
feature=Image.new('RGB',(900,540),'#faf8ef');d=ImageDraw.Draw(feature)
from math import ceil,floor
for y,key in enumerate(['eyes','nose','mouth']):
 box=settings['portrait']['regions'][key];left=ceil(box['left']*159);top=ceil(box['top']*159);right=floor((box['left']+box['width'])*159)+1;bottom=floor((box['top']+box['height'])*159)+1
 for x,name in enumerate(['target','reference','weight-2','weight-4']):
  p=Path('output/circle-head-240/circle-target.png') if name=='target' else root/(name+'-native.png')
  # Same source/grid windows and identical enlargement for every item.
  crop=Image.open(p).crop((left,top,right,bottom)).resize((210,120),Image.Resampling.BILINEAR)
  feature.paste(crop,(x*225+4,y*180+30));d.text((x*225+4,y*180+8),name+' / '+key,fill='#18201d')
feature.save(root/'features.png')
body='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ip Rasm contour comparison</title><style>body{font:16px system-ui;margin:24px;background:#faf8ef;color:#18201d;max-width:1250px}img{max-width:100%;height:auto}table{border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #dce2d4;text-align:left}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#235544}</style><h1>Paired contour emphasis</h1><p>Same original local photo, centered circle crop, 240 unrotated pins, 400×400mm board, 0.1mm thread, source-aligned manual anatomy and unchanged target. Two separate two-sweep fits start from the SAME preserved circle240 sequence; only contrast weight changes from2 to4. Complete routing and every actual connection enter preview, length and measurements. Old guides and progress stay preserved.</p><p><b>Quality remains inconclusive. Defaults stay unchanged.</b> Higher native contour gains do not consistently survive the independent common384 comparison: nose edge improves slightly while lip edge worsens. There is no quality-preserving simplification or physical acceptance. These are separate diagnostics, not a recommendation to assemble.</p><h2>Ordinary native portraits and common384 reconstruction</h2><p>No photo overlays, generated anatomy or result-specific sharpening.</p><img src="comparison.png"><h2>Equal source-derived native feature windows</h2><img src="features.png"><h2>Exact guides and estimates</h2><table><tr><th>Variant</th><th>Connections</th><th>Thread estimate</th><th>Fit-stage time</th></tr>'''
for row in rows:
 evidence={} if row['name']=='reference' else json.loads((root/(row['name']+'.json')).read_text())['evidence']
 timing='Historical; not rerun' if not evidence else f"{evidence['fullStageMs']/1000:.2f}s (seed already exists)"
 body+=f"<tr><td>{row['name']}</td><td>{row['connections']}</td><td>{row['meters']:.3f}m</td><td>{timing}</td></tr>"
body+='</table><h2>Common384 differences</h2><p>Positive values mean error reduction; negative values mean worsening. Diagnostic pixel metrics do not establish human likeness. One canonical source target and remapped anatomy are shared.</p><pre>'+html.escape(json.dumps(changes,indent=2))+'</pre><p><a href="evaluation.json">Exact replay/offline evidence</a> · <a href="comparison.json">Measurements</a> · <a href="common-target.png">Canonical target384</a> · <a href="weight-2-guide.pdf">Control guide</a> · <a href="weight-4-guide.pdf">Stronger-contour guide</a> · <a href="http://127.0.0.1:4183/">Website</a></p></html>'
(root/'report.html').write_text(body,encoding='utf8')
print(json.dumps(dict(changes=changes,qualityAcceptance='inconclusive')))
