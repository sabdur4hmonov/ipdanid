"""Verify final material label and every ordered step in actual offline exports."""
import json,re
from pathlib import Path
import pdfplumber
folder=Path('output/thread-fineness')
results=[]
for prefix in ['uz-material','offline-desktop','offline-mobile-browser']:
    project=json.loads((folder/f'{prefix}-guide.json').read_text(encoding='utf8'))['project']
    instruction=project['instruction'];steps=[]
    assert instruction['profile']['threadMm']==0.05
    for s in instruction['segments']:
        start=len(steps)
        steps.extend((start+j+1,a,b) for j,(a,b) in enumerate(zip(s['path'],s['path'][1:])))
    with pdfplumber.open(folder/f'{prefix}-guide.pdf') as pdf:
        text='\n'.join(p.extract_text() or '' for p in pdf.pages)
        assert [tuple(map(int,m)) for m in re.findall(r'(\d+)\.\s+(\d+)\s+->\s+(\d+)\s+#',text)]==steps
        assert pdf.metadata['Subject']=='Sequence SHA-256: '+instruction['sequenceHash']
        assert f"{project['progress']['confirmed']}/{len(steps)}" in text
        label='Ip qalinligi (mm): 0.05' if prefix=='uz-material' else 'Thread thickness (mm): 0.05'
        assert label in (pdf.pages[0].extract_text() or '')
        clipped_templates=0
        for page in pdf.pages:
            # Tile content deliberately uses a PDF clip rectangle. Raw extracted
            # duplicate labels can lie outside this tile while a complete copy
            # prints on an adjacent overlapping tile; raw-char bounds ignore clips.
            if re.search(r'(?:Mix shabloni|Pin template)\s+\d+/\d+\s+·\s+\d+/\d+',page.extract_text() or ''):
                clipped_templates+=1
                continue
            assert all(c['x0']>=-0.1 and c['x1']<=page.width+0.1 and c['top']>=-0.1 and c['bottom']<=page.height+0.1 for c in page.chars)
        assert clipped_templates==6
        results.append(dict(name=prefix,pages=len(pdf.pages),orderedSteps=len(steps),confirmed=project['progress']['confirmed'],threadMm=0.05,
            sequenceHash=instruction['sequenceHash'],materialLabelExact=True,coverOverviewStepFontBounds=True,clippedTemplatePages=clipped_templates,physicallyPrinted=False))
(folder/'final-export-evidence.json').write_text(json.dumps(results,indent=2),encoding='utf8')
print(json.dumps(results))
