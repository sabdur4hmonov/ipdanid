"""Equal-size actual physical results and viewing-distance SSIM, local only."""
from pathlib import Path
from PIL import Image, ImageDraw
from html import escape
import json

root=Path('output/phase13')
review=json.loads((root/'visual-review.json').read_text(encoding='utf-8')) if (root/'visual-review.json').exists() else None
html=['<!doctype html><meta charset="utf-8"><title>Phase13 sharper portraits3</title>',
 '<style>body{font:16px system-ui;margin:24px;max-width:1500px;color:#20392f}img{max-width:100%;height:auto}article{margin:40px 0}td,th{padding:8px;border:1px solid #ddd}table{border-collapse:collapse}pre{white-space:pre-wrap}</style>',
 '<h1>Phase13 — sharper portraits3</h1>',
 '<p>Identical real prepared target and exact240kitpins; v2 control3000 versus v3 default3000, fixed0.12mm/.9 physical1000px render. NewLS score/.08/faceGaussian1; no tone/preview normalization or overlays. Same immutable path drives all exports. Old guides/pins/templates unchanged. Sources/reports stay private/local. Owner input is existing processed320px crop, not original photograph.</p>',
 '<p>Viewing-distance metric: actual Float32 physical reconstruction, Gaussian blur(0.6*N/160), true area resize160,7x7sigma1.5 SSIM. Per-person actual reviewed face ovals clipped to real board shape; union and each person below. These masks/targets differ from supplied reference fixedoval; do not equate scores across crops. Supplied reference PNG parity reproduces0.539→0.622. No contrast adaptation: original Python only comments about it.</p>',
 '<p>3000 remains the requested time default:~6.7h at8s/connection.2500~5.6h,3500~7.8h. RawSSIM winner and3500gain are reported honestly; a gain≥.010 is labeled clearly better numerically, not silently promoted.</p>',
 '<pre>'+escape(json.dumps(review,indent=2))+'</pre>']
rows=[]
for path in sorted(root.glob('*/**/result.json')):
 if path.parent.parent.name not in ['desktop','mobile-browser']:continue
 r=json.loads(path.read_text(encoding='utf-8'))
 if len(r.get('results',[]))!=3:continue
 case=path.parent
 by={x['budget']:x for x in r['results']}
 def contact(name,panels):
  img=Image.new('RGB',(len(panels)*400,440),'white');draw=ImageDraw.Draw(img)
  for j,(filename,label) in enumerate(panels):
   img.paste(Image.open(case/filename).convert('RGB').resize((400,400)),(400*j,40));draw.text((400*j+6,10),label,fill='black')
  img.save(case/name)
 contact('comparison.png',[('target.png','Prepared target'),('app-v2-3000.png',f'v2 3000: face SSIM {r["baseline"]["score"]["face"]["ssim"]:.4f}'),('app-v3-3000.png',f'v3 3000: face SSIM {by[3000]["score"]["face"]["ssim"]:.4f}')])
 contact('budgets.png',[(f'app-v3-{b}.png',f'v3 {b}: SSIM {by[b]["score"]["face"]["ssim"]:.4f}, ~{b*8/3600:.1f}h') for b in [2500,3000,3500]])
 gain=by[3500]['score']['face']['ssim']-by[3000]['score']['face']['ssim']
 r['budgetDecision']={'default':3000,'reason':'owner-requested time cap, not a claimed SSIM maximum','ssimBestBudget':max(by,key=lambda b:by[b]['score']['face']['ssim']),'gain3500vs3000':gain,'3500ClearlyBetterNumerically':gain>=.010}
 rows.append(r)
 rel=case.relative_to(root).as_posix()
 html += [f'<article><h2>{escape(rel)}</h2><img src="{rel}/comparison.png" alt="Prepared target versus actual2 and3">',f'<p>{escape(json.dumps(r["budgetDecision"]))}</p>',f'<img src="{rel}/budgets.png" alt="Actual2500/3000/3500 at equal size">','<table><tr><th>Variant</th><th>All SSIM</th><th>Face union SSIM</th><th>Each face</th><th>UI ms</th><th>Centre-axis chords</th></tr>']
 def table(label,score,ms,axes):
  return f'<tr><td>{label}</td><td>{score["all"]["ssim"]:.5f}</td><td>{score["face"]["ssim"]:.5f}</td><td>'+', '.join(f'{x["ssim"]:.5f}' for x in score['faces'])+f'</td><td>{ms}</td><td>{len(axes)}</td></tr>'
 html.append(table('v2 3000',r['baseline']['score'],'Node control',r['baseline']['axisCentreChords']))
 for b in [2500,3000,3500]:html.append(table(f'v3 {b}',by[b]['score'],by[b]['uiMs'],by[b]['axisCentreChords']))
 html.append('</table>')
 if r['shape']=='rectangle':
  img=Image.new('RGB',(800,440),'white');draw=ImageDraw.Draw(img)
  for j,(file,label) in enumerate([('app-v2-3000.png','v2 centre: actual aligned chords'),('app-v3-3000.png','v3 centre: zero centre-axis chords')]):
   img.paste(Image.open(case/file).convert('RGB').crop((400,400,600,600)).resize((400,400)),(j*400,40));draw.text((j*400+5,10),label,fill='black')
  img.save(case/'centre.png');html += [f'<img src="{rel}/centre.png" alt="Same actual central crop, no contrast manipulation">','<p>Only exactly horizontal/vertical chords intersecting central4% square excluded in3; no physical pin phase/coordinate change. Other real chords remain.</p>']
 html.append('</article>')
root.mkdir(exist_ok=True)
(root/'results.json').write_text(json.dumps({'defaultLines':3000,'cases':rows,'visualReview':review},indent=2),encoding='utf-8')
(root/'report.html').write_text('\n'.join(html),encoding='utf-8')
print(json.dumps({'completeCases':len(rows),'default':3000,'3500ClearlyBetterCases':sum(r['budgetDecision']['3500ClearlyBetterNumerically'] for r in rows)}))
