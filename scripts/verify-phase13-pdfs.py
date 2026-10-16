"""Read-only verification of actual UI exports; never modifies the PDFs."""
import hashlib
import json
import argparse
import re
import subprocess
from pathlib import Path
from pypdf import PdfReader
from pdfminer.high_level import extract_text
from PIL import Image

root = Path(__file__).resolve().parent.parent / 'output/phase13'
parser=argparse.ArgumentParser()
parser.add_argument('--pdftotext')
args=parser.parse_args()
results = []
for path in sorted(root.rglob('guide.pdf')):
    case = path.parent
    reader = PdfReader(path)
    images = list(reader.pages[0].images)
    assert len(images) == 1, f'Unexpected cover images: {case}'
    actual = images[0].image.convert('RGB')
    expected = Image.open(case / ('app-v3-3000.png' if (case / 'guide-v3-3000.json').exists() else 'app.png')).convert('RGB')
    assert actual.size == expected.size == (1000, 1000)
    assert actual.tobytes() == expected.tobytes(), f'Cover differs from real app path: {case}'
    text = (subprocess.run([args.pdftotext,'-layout',str(path),'-'],check=True,capture_output=True,text=True,encoding='utf-8').stdout
            if args.pdftotext else extract_text(str(path)))
    assert 'B-17' in text, f'Missing real sector step: {case}'
    guide = json.loads((case / ('guide-v3-3000.json' if (case / 'guide-v3-3000.json').exists() else 'guide.json')).read_text(encoding='utf-8'))
    assert guide['algorithm'] == 'classic-greedy/3'
    assert guide['metrics']['lines'] in [2500,3000,3500]
    steps=re.findall(r'(\d+)\.\s+([A-Z]-\d+)\s+\[(\d+)\]\s+->\s+([A-Z]-\d+)\s+\[(\d+)\]',text)
    expected_steps=[]
    for segment in guide['segments']:
        for a,b in zip(segment['path'],segment['path'][1:]):
            expected_steps.append((str(len(expected_steps)+1),guide['profile']['pins'][a]['sectorLabel'],str(a),guide['profile']['pins'][b]['sectorLabel'],str(b)))
    assert steps==expected_steps, f'PDF ordered steps differ: {case} ({len(steps)}/{len(expected_steps)})'
    results.append(dict(case=str(case.relative_to(root)), pages=len(reader.pages),
                        coverPixelsExactlyApp=True, coverSize=[1000, 1000],
                        sectorB17Present=True, sequenceHash=guide['sequenceHash'],
                        allOrderedStepsExactlyJson=True, connections=guide['metrics']['lines'],
                        coverRgbSha256=hashlib.sha256(actual.tobytes()).hexdigest()))
    print(str(case.relative_to(root)), 'cover/sector OK', flush=True)
assert len(results) == 11, f'Expected11 real UI PDF exports, got {len(results)}'
(root / 'pdf-verification.json').write_text(json.dumps(results, indent=2))
print(json.dumps({'pdfs': len(results), 'allCoversExactlyApp': True, 'allSectorLabelsPresent': True}))
