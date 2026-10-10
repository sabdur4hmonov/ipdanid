"""Audit exact physical contours, print labels and independent region references."""
from pathlib import Path
import json,math,re
import pdfplumber
from PIL import Image,ImageDraw
root=Path('output/paint');results=[];mm=72/25.4
for viewport in ['desktop','mobile-browser','tiled']:
    project=json.loads((root/f'{viewport}-guide.json').read_text(encoding='utf8'))['project'];g=project['guide']
    cells=g['cells'];cols=g['columns'];rows=g['rows'];pitch=g['pitchMm'];width=cols*pitch;height=rows*pitch
    # Reconstruct edges independently from the exporter.
    edges=[]
    for y in range(rows):
        for x in range(cols):
            c=cells[y*cols+x]
            if y==0 or cells[(y-1)*cols+x]!=c:edges.append((x,y,x+1,y))
            if x==0 or cells[y*cols+x-1]!=c:edges.append((x,y,x,y+1))
            if y==rows-1:edges.append((x,y+1,x+1,y+1))
            if x==cols-1:edges.append((x+1,y,x+1,y+1))
    tiles=[(left,top,min(170,width-left),min(220,height-top)) for top in range(0,math.ceil(height),215) for left in range(0,math.ceil(width),165)]
    for locale in ['en','ru','uz']:
        file=root/f'{viewport}-{locale}-guide.pdf'
        with pdfplumber.open(file) as pdf:
            assert pdf.metadata['Subject']=='Paint SHA-256: '+g['sequenceHash']
            text='\n'.join(p.extract_text() or '' for p in pdf.pages)
            assert f"{len(project['progress']['completed'])}/{len(g['regions'])}" in text
            references=re.findall(r'(\d+)\. #(\d+) ([A-Za-z0-9_-]+) \| X([0-9.]+) Y([0-9.]+) mm \| ([0-9.]+) cm',text)
            expected=[(str(r['id']+1),str(r['color']+1),g['palette'][r['color']]['code'],f"{(r['anchor']%cols+.5)*pitch:.1f}",f"{(r['anchor']//cols+.5)*pitch:.1f}",f"{len(r['cells'])*pitch*pitch/100:.2f}") for r in g['regions']]
            assert references==expected, 'Region reference drift'
            for index,(left,top,tw,th) in enumerate(tiles):
                page=pdf.pages[index+1];actual_edges=[]
                for e in edges:
                    x1,y1,x2,y2=[v*pitch for v in e]
                    if y1==y2:
                        if not top<=y1<=top+th:continue
                        x1=max(x1,left);x2=min(x2,left+tw)
                        if x2<=x1:continue
                    else:
                        if not left<=x1<=left+tw:continue
                        y1=max(y1,top);y2=min(y2,top+th)
                        if y2<=y1:continue
                    expected_line=(45+(x1-left)*mm,738-(y1-top)*mm,45+(x2-left)*mm,738-(y2-top)*mm)
                    found=[line for line in page.lines if abs(line['linewidth']-.18*mm)<.0001 and sorted((round(x,3),round(y,3)) for x,y in line['pts'])==sorted((round(x,3),round(page.height-y,3)) for x,y in [(expected_line[0],expected_line[1]),(expected_line[2],expected_line[3])])]
                    assert len(found)==1, ('Contour missing',e,index)
                    actual_edges.append(e)
                assert len([line for line in page.lines if abs(line['linewidth']-.18*mm)<.0001])==len(actual_edges)
                rulers=[l for l in page.lines if abs(l['linewidth']-1)<.0001 and abs(l['width']-50*mm)<.001 and abs(l['y0']-77)<.001]
                assert len(rulers)==1
                expected_numbers=[]
                for r in g['regions']:
                    if not r['labelFits']:continue
                    x=(r['anchor']%cols+.5)*pitch;y=(r['anchor']//cols+.5)*pitch
                    # Full label expected whenever at least 3mm inside this tile.
                    if left+3<=x<=left+tw-3 and top+3<=y<=top+th-3:expected_numbers.append(str(r['color']+1))
                numbers=[c['text'] for c in page.chars if abs(c['size']-2.5*mm)<.001]
                assert numbers==expected_numbers, 'Printed labels differ'
            for p in pdf.pages:
                assert all(c['x0']>=35 and c['x1']<=565 and c['y0']>=15 and c['y1']<=815 for c in p.chars),'Clipped glyph'
            results.append(dict(viewport=viewport,locale=locale,pages=len(pdf.pages),regions=len(g['regions']),exactReferenceRows=True,exactContours=True,rulerMm=50,hash=g['sequenceHash'],physicallyValidated=False))
(root/'pdf-evidence.json').write_text(json.dumps(results,indent=2),encoding='utf8')
print(json.dumps(results))
