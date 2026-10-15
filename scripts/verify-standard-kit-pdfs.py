"""Read the actual printable PDFs independently; no owner data or raster edits."""
import hashlib
import json
import re
from pathlib import Path

import pdfplumber

root = Path(__file__).resolve().parent.parent / 'output/phase9/templates'
mm = 72 / 25.4
coordinates = json.loads((root / 'coordinates.json').read_text())
results = []
for kind, count in [('sheet', 1), ('tiles', 6), ('stickers', 18)]:
    path = root / f'standard-kit-{kind}.pdf'
    with pdfplumber.open(path) as doc:
        assert len(doc.pages) == count
        for page in doc.pages:
            assert abs(page.width / mm - (500 if kind == 'sheet' else 210)) < 1e-6
            assert abs(page.height / mm - (500 if kind == 'sheet' else 297)) < 1e-6
            assert any(abs(line['x1'] - line['x0'] - 50 * mm) < 1e-6 and
                       abs(line['top'] - line['bottom']) < 1e-6 and
                       abs(line['linewidth'] - .6) < 1e-6 for line in page.lines)
        if kind == 'stickers':
            for pattern in range(3):
                # Each stream contains all board-space labels; clipping makes
                # only the appropriate section visible on each physical tile.
                words = [w for w in doc.pages[pattern * 6].extract_words(x_tolerance=.5)
                         if re.fullmatch('[A-Z]-[0-9]+', w['text'])]
                assert len(words) == 240
                by_label = {w['text']: w for w in words}
                for j, mark in enumerate(coordinates['stickers'][pattern]['marks']):
                    w = by_label[mark['label']]
                    distance = 8.5 if j % 2 else 5
                    assert abs((w['x0'] + w['x1']) / 2 -
                               (10 + mark['xMm'] + mark['nx'] * distance) * mm) < .01
                    visible = False
                    for tile in range(6):
                        ox = (tile % 3) * 180 * mm
                        oy = (tile // 3) * 247 * mm
                        if (10 * mm <= w['x0'] - ox and w['x1'] - ox <= 200 * mm and
                            25 * mm <= w['top'] - oy and w['bottom'] - oy <= 282 * mm):
                            visible = True
                    assert visible, f'Clipped label {pattern}/{mark["label"]}'
                for i, a in enumerate(words):
                    for b in words[:i]:
                        assert (min(a['x1'], b['x1']) <= max(a['x0'], b['x0']) or
                                min(a['bottom'], b['bottom']) <= max(a['top'], b['top'])), (a, b)
                results.append({'pattern': pattern, 'labels': len(words), 'overlap': 0,
                                'fullyVisibleOnAtLeastOneTile': True})
    results.append({'kind': kind, 'pages': count, 'calibrationMm': 50,
                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
(root / 'pdf-verification.json').write_text(json.dumps(results, indent=2))
print(json.dumps(results))
