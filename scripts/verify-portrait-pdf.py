"""Digital ordering/hash checks plus contact sheet for local visual inspection."""
from pathlib import Path
import json, re, sys
import pdfplumber
from PIL import Image, ImageDraw

prefix = sys.argv[1] if len(sys.argv) > 1 else 'continued'
folder = Path('output')/(sys.argv[2] if len(sys.argv)>2 else 'portrait')
project = json.loads((folder / f'{prefix}-guide.json').read_text(encoding='utf-8'))['project']
instruction = project['instruction']
steps = []
for segment in instruction['segments']:
    start = len(steps)
    steps.extend((start+j+1,a,b) for j,(a,b) in enumerate(zip(segment['path'],segment['path'][1:])))
with pdfplumber.open(folder / f'{prefix}-guide.pdf') as pdf:
    text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
    parsed = [tuple(map(int,m)) for m in re.findall(r'(\d+)\.\s+(\d+)\s+->\s+(\d+)\s+#',text)]
    assert parsed == steps, 'Ordered sequence differs from JSON'
    assert pdf.metadata['Subject'] == 'Sequence SHA-256: '+instruction['sequenceHash']
    assert f"{project['progress']['confirmed']}/{instruction['metrics']['lines']}" in text
    pages = len(pdf.pages)
files = sorted(folder.glob('stage2-page-*.png' if prefix == 'continued' else f'{prefix}-page-*.png' if len(sys.argv)>2 else 'pdf-page-*.png'))
assert len(files) == pages, 'Render every PDF page before visual inspection'
sheet = Image.new('RGB',(1000,((pages+5)//6)*248),'#ddd')
draw=ImageDraw.Draw(sheet)
for j,file in enumerate(files):
    sheet.paste(Image.open(file).resize((158,224)),((j%6)*166,(j//6)*248))
    draw.text(((j%6)*166,(j//6)*248+224),str(j+1),fill='black')
sheet.save(folder / f'{prefix}-pdf-contact-sheet.png')
evidence=dict(pages=pages,orderedSteps=len(parsed),confirmed=project['progress']['confirmed'],sequenceHash=instruction['sequenceHash'],physicallyPrinted=False)
(folder / f'{prefix}-pdf-evidence.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
print(json.dumps(evidence))
