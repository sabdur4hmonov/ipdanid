"""Copy a private local, verified increment without source photos, credentials or traces."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--dest', type=Path, required=True)
args = parser.parse_args()
dest = args.dest.resolve()
assert dest != root and root not in dest.parents, 'Use a separate handoff directory'
unit = json.loads((root/'output/completion/grid-product-unit-release.json').read_text(encoding='utf-8'))
browser = json.loads((root/'output/completion/grid-product-browser-final.json').read_text(encoding='utf-8'))
assert unit['success'] and unit['numPassedTests'] == 100 and unit['numFailedTests'] == 0
assert browser['stats']['expected'] == 24 and browser['stats']['unexpected'] == 0 and browser['stats']['flaky'] == 0
apk = json.loads((root/'output/mobile/ip-rasm-grid-product-build-evidence.json').read_text(encoding='utf-8'))
assert apk['webAssetsVerified'] == 18 and not apk['nativeDeviceTested']
commit = subprocess.check_output(['git','rev-parse','HEAD'], cwd=root, text=True).strip()
paths = list((root/'docs').glob('*.md'))
paths += [root/'output/completion'/name for name in ['grid-product-unit-release.json','grid-product-browser-final.json']]
paths += [p for p in (root/'output/mobile').glob('ip-rasm-grid-product*') if '-previous-' not in p.name]
for name in ['grid','pin-basis']:
    paths += [p for p in (root/'output'/name).iterdir()
              if p.is_file() and p.suffix in ['.json','.png','.html','.pdf','.txt']
              and '-page-' not in p.name]
# Private comparison images contain source-derived targets, but never copy the raw photo.
assert all(p.name != 'source.jpg' and p.suffix not in ['.zip','.db','.sqlite','.f32','.bin'] for p in paths)
private = root/'tmp/data/local-secrets.json'
secrets = []
def strings(value):
    if isinstance(value, dict):
        for v in value.values(): strings(v)
    elif isinstance(value, list):
        for v in value: strings(v)
    elif isinstance(value, str) and len(value) >= 20: secrets.append(value.encode())
if private.exists(): strings(json.loads(private.read_text(encoding='utf-8')))
receipt = []
for path in sorted(set(paths)):
    data = path.read_bytes()
    if path.suffix in ['.json','.md','.html','.txt']:
        assert not any(secret in data for secret in secrets), 'Private credential found; copy refused'
    relative = path.relative_to(root)
    target = dest/relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        assert target.read_bytes() == data, 'Existing handoff differs; choose a new destination'
    else: shutil.copy2(path, target)
    digest = hashlib.sha256(data).hexdigest()
    assert hashlib.sha256(target.read_bytes()).hexdigest() == digest
    receipt.append(dict(path=relative.as_posix(),bytes=len(data),sha256=digest))
summary = dict(commit=commit,unitTests=100,browserScenarios=24,apk=apk['apkSha256'],
               nativeDeviceTested=False,physicalAcceptance=False,portraitAcceptance='open',
               fullProductComplete=False,rawSourcePhotoCopied=False,credentialsCopied=False,
               tracesCopied=False,pushed=False,published=False,files=receipt)
(dest/'RECEIPT.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps(dict(commit=commit,files=len(receipt),destination=str(dest),verified=True)))
