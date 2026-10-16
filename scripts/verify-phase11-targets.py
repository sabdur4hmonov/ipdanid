"""Check captured target pixels and unchanged physical/source contracts, locally."""
import json
import hashlib
from pathlib import Path
from PIL import Image

root = Path('output/phase11')
rows = []
for path in sorted(root.glob('*/*/guide.json')):
    guide = json.loads(path.read_text())
    proof = guide['params']['kitPreparation']
    assert proof['version'] == 'standard-preparation/3'
    framing = proof['transform']['framing']
    assert framing['keepShoulders'] is False and framing['fadePx'] == 18
    target = Image.open(path.parent / 'target.png').convert('RGB')
    assert target.size == (500, 500)
    chin = max(h['chin'] for h in framing['heads'])
    import math
    y = min(500, math.ceil(chin*500 + 18))
    assert set(target.crop((0,y,500,500)).tobytes()) <= {255}, 'Nonwhite pixels below chin fade'
    old = Path('output/phase10') / path.relative_to(root)
    if old.exists():
        baseline = json.loads(old.read_text())
        assert guide['profile'] == baseline['profile'], 'Physical kit/profile changed'
        assert proof['sourceHash'] == baseline['params']['kitPreparation']['sourceHash'], 'Source pixels changed'
        assert proof['sourceAspect'] == baseline['params']['kitPreparation']['sourceAspect']
    rows.append(dict(case=str(path.parent.relative_to(root)), targetWhiteBelowChinFade=True,
                     exactPhase10SourceAndProfile=old.exists(),
                     targetPngSha256=hashlib.sha256((path.parent/'target.png').read_bytes()).hexdigest()))
assert len(rows) in [12,14]
(root/'target-verification.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(dict(targets=len(rows), allWhiteBelowChin=True, phase10SourcesProfilesUnchanged=True)))
