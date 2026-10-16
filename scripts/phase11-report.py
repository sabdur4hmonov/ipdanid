"""Read-only equal-size comparison of real UI captures; photos stay ignored/local."""
import json
import hashlib
from pathlib import Path
from html import escape
from PIL import Image, ImageDraw

root = Path('output/phase11')
names = ['synthetic-1-circle', 'synthetic-2-circle', 'synthetic-3-circle',
         'owner-phase9-circle', 'synthetic-1-square', 'synthetic-pair-heart']
rows, controls = [], []
for project in ['desktop', 'mobile-browser']:
    for name in names:
        case = root / project / name
        if not (case / 'result.json').exists():
            continue
        result = json.loads((case / 'result.json').read_text())
        if not (case / 'app.png').exists():
            continue
        old = Path('output/phase10') / project / name
        panels = [(old / 'target.png', 'Phase10 target'), (case / 'target.png', 'Phase11 target'),
                  (old / 'app.png', 'Phase10 actual thread'), (case / 'app.png', 'Phase11 actual thread')]
        contact = Image.new('RGB', (1600, 440), 'white')
        draw = ImageDraw.Draw(contact)
        for j, (p, label) in enumerate(panels):
            contact.paste(Image.open(p).convert('RGB').resize((400, 400)), (400*j, 40))
            draw.text((400*j+8, 10), label, fill='black')
        contact.save(case / 'old-new.png')
        for path in old.glob('*'):
            if path.is_file():
                controls.append(dict(path=str(path), sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        rows.append(dict(**result, directory=f'{project}/{name}'))
sources = []
for p in [Path(f'output/phase10/inputs/synthetic-{j}.png') for j in [1, 2, 3]] + [Path('output/portrait-dispatch/target-320.png')]:
    sources.append(dict(path=str(p), sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
review = json.loads((root / 'visual-review.json').read_text()) if (root / 'visual-review.json').exists() else None
(root / 'results.json').write_text(json.dumps(dict(rows=rows, sources=sources, frozenPhase10Controls=controls,
    visualReview=review), indent=2))
html = ['<!doctype html><meta charset="utf-8"><title>Phase11 — portrait framing</title>',
        '<style>body{font:16px system-ui;margin:24px;color:#18334e}img{width:100%;max-width:1600px}article{margin:32px 0}code{overflow-wrap:anywhere}</style>',
        '<h1>Phase11 — real UI old/new framing</h1>',
        '<p>Equal-size physical1000px renders, 240 exact kit nails,0.12mm/.9opacity, classic-greedy/2,2500actual connections. '
        'Only target preparation/framing changes. Each strip: old target | new target | old actual thread | new actual thread. '
        'No source overlays or darkened cosmetic preview. All images and the processed owner crop remain local/ignored.</p>',
        '<p>Default: hair-to-chin87%,18px below-chin fade; Heart pair upper lobes, independent real-source crops. '
        'Head geometry is inferred from reviewed face boxes; missing/clipped original hair cannot be reconstructed. '
        'Owner crop is the same existing processed320px source as Phase10, not the original photograph. '
        'Assembly estimates use8seconds/connection (2000=4.4h,2500=5.6h,3000=6.7h). Phone/physical acceptance separate.</p>',
        '<pre>' + escape(json.dumps(review, indent=2)) + '</pre>']
for r in rows:
    html += ['<article><h2>' + escape(r['project'] + ' / ' + r['name']) + '</h2>',
             f'<p>UI generation: {r.get("uiGenerationMs")}ms; exact physical raster: {r.get("physicalRasterExact")}; '
             f'passed: {r.get("passed", False)}. Face heights old/new: '
             f'{escape(str(r.get("oldFaceHeights")))} / {escape(str(r.get("newFaceHeights")))}</p>',
             f'<img src="{r["directory"]}/old-new.png" alt="Old target, new target, old thread, new thread at equal size">',
             f'<p><a href="{r["directory"]}/guide.json">JSON</a> · <a href="{r["directory"]}/guide.pdf">PDF</a> · '
             f'<a href="{r["directory"]}/screen.png">Actual UI</a></p></article>']
(root / 'report.html').write_text('\n'.join(html), encoding='utf-8')
print(json.dumps(dict(cases=len(rows), passed=sum(r.get('passed', False) for r in rows),
                     maxUiMs=max((r.get('uiGenerationMs', 0) for r in rows), default=0))))
