"""Actual PDF circles/complete glyph coverage; unchanged physical coordinates, no print trial."""
from pathlib import Path
import json,math
import pdfplumber
folder=Path('output/contrast');mm=72/25.4;pw=210*mm;ph=297*mm;margin=18*mm;top=ph-margin-35
tilew=(pw-2*margin)/mm;tileh=(ph-2*margin-40)/mm
for name in ['physical-2','simplified']:
 i=json.loads((folder/f'{name}.json').read_text())['instruction'];pins=i['profile']['pins'];p=i['profile'];covered=set();geometry=0
 with pdfplumber.open(folder/f'{name}-guide.pdf') as pdf:
  assert pdf.metadata['Subject']=='Sequence SHA-256: '+i['sequenceHash']
  for row in range(2):
   for col in range(3):
    page=pdf.pages[1+row*3+col];assert 'radial-leaders/1' in page.extract_text();ox=col*(tilew-10);oy=row*(tileh-10)
    for pin in pins:
     x=margin+(pin['x']*p['widthMm']-ox)*mm;y=top-(pin['y']*p['heightMm']-oy)*mm
     curves=[c for c in page.curves if abs((c['x0']+c['x1'])/2-x)<.002 and abs((c['y0']+c['y1'])/2-y)<.002 and abs((c['x1']-c['x0'])/2-p['shaftMm']/2*mm)<.002]
     assert curves,f'Wrong actual nail coordinate {pin["id"]}';geometry+=1
     dx=(pin['x']-.5)*p['widthMm'];dy=(pin['y']-.5)*p['heightMm'];r=math.hypot(dx,dy);ratio=(r-(16 if pin['id']%2 else 8))/r
     lx=margin+(p['widthMm']/2+dx*ratio-ox)*mm;ly=top-(p['heightMm']/2+dy*ratio-oy)*mm
     chars=[c for c in page.chars if abs(c['size']-6)<.01 and abs(c['y0']-(ly-2+6*(-.293)))<3 and abs((c['x0']+c['x1'])/2-lx)<7];chars.sort(key=lambda c:c['x0'])
     if ''.join(c['text'] for c in chars)==str(pin['id']) and all(margin<=c['x0'] and c['x1']<=margin+tilew*mm and top-tileh*mm<=c['y0'] and c['y1']<=top for c in chars):covered.add(pin['id'])
 assert covered==set(range(240)),f'Missing intact labels {set(range(240))-covered}'
 evidence={'sequenceHash':i['sequenceHash'],'unchangedProfile':p,'coordinateChecks':geometry,'completePinLabels':len(covered),'labelRenderingVersion':'radial-leaders/1','immutableLayoutMetadataChanged':False,'physicallyPrinted':False};(folder/f'{name}-template-evidence.json').write_text(json.dumps(evidence,indent=2));print(json.dumps({k:v for k,v in evidence.items() if k!='unchangedProfile'}))
