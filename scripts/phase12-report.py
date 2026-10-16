import json,hashlib,re
from pathlib import Path
from html import escape
from PIL import Image,ImageDraw
root=Path("output/phase12");root.mkdir(exist_ok=True)
default=int(re.search(r"DEFAULT_CUSTOMER_LINES\s*=\s*(\d+)",Path("src/customer-defaults.ts").read_text()).group(1))
review=json.loads((root/"visual-review.json").read_text()) if (root/"visual-review.json").exists() else None
rows=[];controls=[]
html=['<!doctype html><meta charset="utf-8"><title>Phase12 customer flow</title><style>body{font:16px system-ui;margin:24px;color:#20392f}img{max-width:100%;height:auto}article{margin:36px 0}.screens{display:flex;gap:12px}.screens img{width:30%;object-fit:contain;align-self:start}</style>',f'<h1>Phase12 — three customer screens; default{default}</h1>','<p>Real gallery/UI generation, unchanged classic-greedy/2 and0.12mm/.9physical1000px render. Version4 target crops neck/high shirt corners; original faces and kit pins unchanged. Same prepared target for both budgets. Source photos and this report stay local/ignored; owner source is existing processed320px crop, not original. No cosmetic overlays or competitor assets.</p>','<pre>'+escape(json.dumps(review,indent=2))+'</pre>']
for case in sorted((root/'ab').glob('*')):
 if not (case/'result.json').exists():continue
 r=json.loads((case/'result.json').read_text());rows.append(r);old=Path('output/phase11/desktop')/case.name/'app.png'
 contact=Image.new('RGB',(1600,440),'white');draw=ImageDraw.Draw(contact)
 for j,(p,label) in enumerate([(old,'Old Phase11 actual2500'),(case/'target.png','New prepared target'),(case/'app-2500.png','New actual2500'),(case/'app-3000.png','New actual3000')]):
  contact.paste(Image.open(p).convert('RGB').resize((400,400)),(j*400,40));draw.text((j*400+6,10),label,fill='black')
 contact.save(case/'comparison.png');controls.append({'path':str(old),'sha256':hashlib.sha256(old.read_bytes()).hexdigest()})
 html += [f'<article><h2>{escape(case.name)}</h2><p>{escape(json.dumps(r["results"]))}</p><img src="ab/{case.name}/comparison.png" alt="Old result, target,2500,3000 at equal size"></article>']
for device in ['desktop','mobile-browser']:
 d=root/'screens'/device
 if (d/'3-result.png').exists():html+= [f'<h2>{device} — actual three screens</h2><div class="screens">'+''.join(f'<img src="screens/{device}/{name}.png" alt="{name}">' for name in ['1-start','2-adjust','3-result'])+'</div>']
(root/'results.json').write_text(json.dumps({'defaultLines':default,'cases':rows,'frozenOldResultHashes':controls,'visualReview':review},indent=2));(root/'report.html').write_text('\n'.join(html),encoding='utf-8');print(json.dumps({'cases':len(rows),'default':default}))
