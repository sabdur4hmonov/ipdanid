from pathlib import Path
import json,re,sys
import pdfplumber
from PIL import Image,ImageDraw
root=Path('output/grid');checks=[]
for name in (sys.argv[1:] or ['mosaic-desktop','diamond-desktop','mosaic-mobile-browser','diamond-mobile-browser']):
 p=json.loads((root/(name+'-guide.json')).read_text(encoding='utf8'))['project'];g=p['guide'];expected=[]
 for step in range(1,len(g['cells'])+1):
  row=(step-1)//g['columns'];offset=(step-1)%g['columns'];col=g['columns']-1-offset if row%2 else offset;index=row*g['columns']+col;v=g['cells'][index];color=g['profile']['palette'][v];expected.append((step,row+1,col+1,'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345'[v],color['code'],color['hex']))
 with pdfplumber.open(root/(name+'-guide.pdf')) as pdf:
  assert pdf.metadata['Subject']=='Grid SHA-256: '+g['sequenceHash'];text='\n'.join(page.extract_text()or'' for page in pdf.pages);parsed=[(int(a),int(b),int(c),d,e,f)for a,b,c,d,e,f in re.findall(r'(\d+)\. R(\d+) C(\d+) ([A-Z0-5]) ([A-Za-z0-9_-]+) (#[0-9a-fA-F]{6})',text)];assert parsed==expected,'Exact ordered steps differ';assert f"{p['progress']['confirmed']}/{len(g['cells'])}" in text
  # Every actual chart square and symbol is checked independently of the exporter.
  chart=pdf.pages[2];size=5*72/25.4
  for row in range(g['rows']):
   for col in range(g['columns']):
    x=50+col*size;y=720-row*size;id=g['cells'][row*g['columns']+col];hex=g['profile']['palette'][id]['hex'];color=tuple(int(hex[k:k+2],16)/255 for k in [1,3,5]);rect=[r for r in chart.rects if abs(r['x0']-x)<.01 and abs(r['y0']-y)<.01 and abs(r['width']-size)<.01];assert len(rect)==1 and all(abs(a-b)<.00001 for a,b in zip(rect[0]['non_stroking_color'],color));symbol='ABCDEFGHIJKLMNOPQRSTUVWXYZ012345'[id];chars=[c for c in chart.chars if abs(c['x0']-(x+size*.28))<.01 and abs(c['size']-7)<.01 and abs(c['y0']-(y+size*.23-7*.293))<.01];assert len(chars)==1 and chars[0]['text']==symbol
  for page in pdf.pages:
   assert all(c['x0']>=25 and c['x1']<=570 and c['y0']>=15 and c['y1']<=810 for c in page.chars),'Clipped or off-page glyph'
  files=sorted(root.glob(name+'-page-*.png'));assert len(files)==len(pdf.pages),'Render all pages';sheet=Image.new('RGB',(1000,248),'#ddd');d=ImageDraw.Draw(sheet)
  for j,file in enumerate(files):sheet.paste(Image.open(file).resize((158,224)),(j*166,0));d.text((j*166,226),str(j+1),fill='black')
  sheet.save(root/(name+'-contact.png'));checks.append(dict(name=name,pages=len(pdf.pages),steps=len(expected),exactGridCells=len(g['cells']),hash=g['sequenceHash'],confirmed=p['progress']['confirmed'],glyphsInBounds=True,physicallyValidated=False))
(root/'pdf-evidence.json').write_text(json.dumps(checks,indent=2),encoding='utf8');print(json.dumps(checks))
