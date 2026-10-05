"""Independent physical-coordinate audit of the new PDF/SVG template. No print claims."""
from pathlib import Path
import json, math, xml.etree.ElementTree as ET
import pdfplumber

folder=Path('output/pin-phase')
instruction=json.loads((folder/'multiscale-2.json').read_text(encoding='utf-8'))['instruction']
profile=instruction['profile'];layout=profile['pinLayout'];pins=profile['pins']
assert layout==dict(version='circle-phase/1',phaseDegreesClockwise=.75,reference='board-top/y-down/clockwise',radiusNormalized=.48,templateVersion='radial-leaders/1')
for p in pins:
 a=math.radians(p['id']*1.5+.75)
 assert abs(p['x']-(.5+.48*math.sin(a)))<1e-12
 assert abs(p['y']-(.5-.48*math.cos(a)))<1e-12
svg=ET.parse(folder/'physical-template.svg').getroot()
circles=svg.findall('.//{http://www.w3.org/2000/svg}circle')
assert len(circles)==240
for circle,pin in zip(circles,pins):
 assert abs(float(circle.attrib['cx'])-pin['x']*400)<1e-8
 assert abs(float(circle.attrib['cy'])-pin['y']*400)<1e-8
labels=svg.findall('.//{http://www.w3.org/2000/svg}text')[:240]
assert [t.text for t in labels]==[str(j) for j in range(240)]
assert svg.attrib['width']==svg.attrib['height']=='400mm'
mm=72/25.4;pw=210*mm;ph=297*mm;margin=18*mm;top=ph-margin-35
tilew=(pw-2*margin)/mm;tileh=(ph-2*margin-40)/mm
covered=set();geometry=0
with pdfplumber.open(folder/'multiscale-2-guide.pdf') as pdf:
 orientation=pdf.pages[1].extract_text()
 assert 'circle-phase/1 / radial-leaders/1' in orientation and 'FRONT' in orientation
 assert f"Starting knot: pin {instruction['segments'][0]['path'][0]}" in orientation
 for row in range(2):
  for col in range(3):
   page=pdf.pages[2+row*3+col];ox=col*(tilew-10);oy=row*(tileh-10)
   # PDF curves preserve all 240 physical circles, including marks clipped by the tile.
   curves=page.curves
   for pin in pins:
    x=margin+(pin['x']*400-ox)*mm;y=top-(pin['y']*400-oy)*mm
    candidates=[c for c in curves if abs((c['x0']+c['x1'])/2-x)<.002 and abs((c['y0']+c['y1'])/2-y)<.002 and abs((c['x1']-c['x0'])/2-.75*mm)<.002]
    assert candidates, f"Wrong physical nail coordinate: {pin['id']}, tile {col},{row}"
    geometry+=1
    ratio=(192-(16 if pin['id']%2 else 8))/192;lx=margin+(200+(pin['x']*400-200)*ratio-ox)*mm;ly=top-(200+(pin['y']*400-200)*ratio-oy)*mm
    # Text must fit fully within at least one clipping rectangle. Match actual glyphs,
    # not a recomputed label list, before marking this physical ID covered.
    chars=[c for c in page.chars if abs(c['size']-6)<.01 and abs(c['y0']-(ly-2+6*(-.293)))<3 and abs((c['x0']+c['x1'])/2-lx)<7]
    chars.sort(key=lambda c:c['x0'])
    if ''.join(c['text'] for c in chars)==str(pin['id']) and all(margin<=c['x0'] and c['x1']<=margin+tilew*mm and top-tileh*mm<=c['y0'] and c['y1']<=top for c in chars):
     covered.add(pin['id'])
assert covered==set(range(240)), f"Missing intact pin labels: {set(range(240))-covered}"
evidence=dict(layout=layout,nails=240,pdfCoordinateChecks=geometry,completeNumberLabels=len(covered),svgActualSizeMm=400,svgCoordinatesMatch=True,sequenceHash=instruction['sequenceHash'],physicallyPrinted=False,physicallyAssembled=False)
(folder/'template-evidence.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
print(json.dumps(evidence))
