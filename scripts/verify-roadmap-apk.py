"""Preserve old APKs and verify a new local debug build; never installs or reads keys."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'output/mobile'
SNAPSHOT = OUT / 'roadmap-20261014-old-apks.json'
APP = ROOT / 'android/app/build/outputs/apk/debug/app-debug.apk'
TEST = ROOT / 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk'
CERTIFICATE = '8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90'
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def preserve_copy(source, target):
    if target.exists():
        assert digest(source) == digest(target), 'Refusing to overwrite a different archived APK'
    else:
        shutil.copy2(source, target)
def verify_old():
    data = json.loads(SNAPSHOT.read_text(encoding='utf-8'))
    for row in data:
        path = ROOT / row['path']
        assert path.is_file() and digest(path) == row['sha256'], 'An old APK changed: ' + row['path']
    return len(data)
parser = argparse.ArgumentParser()
parser.add_argument('--prepare', action='store_true')
parser.add_argument('--java')
parser.add_argument('--apksigner')
parser.add_argument('--aapt')
parser.add_argument('--dist', default='dist')
parser.add_argument('--series', default='ip-rasm-full-roadmap-20261014')
parser.add_argument('--snapshot', default='roadmap-20261014-old-apks.json')
parser.add_argument('--standard-kit', action='store_true')
parser.add_argument('--classic-reference', action='store_true')
parser.add_argument('--portrait-framing', action='store_true')
parser.add_argument('--customer-flow', action='store_true')
parser.add_argument('--classic-least-squares', action='store_true')
args = parser.parse_args()
assert re.fullmatch(r'[a-zA-Z0-9._-]+',args.series) and re.fullmatch(r'[a-zA-Z0-9._-]+\.json',args.snapshot), 'Unsafe archive name'
SNAPSHOT = OUT / args.snapshot
OUT.mkdir(parents=True, exist_ok=True)
if args.prepare:
    if SNAPSHOT.exists():
        print(json.dumps({'previousApksStillExact': verify_old()}))
    else:
        for source, label in [(APP, 'app'), (TEST, 'androidTest')]:
            if source.exists():
                preserve_copy(source, OUT / ('build-output-before-roadmap-' + digest(source)[:12] + '-' + label + '.apk'))
        rows = [dict(path=str(p.relative_to(ROOT)), bytes=p.stat().st_size, sha256=digest(p)) for p in sorted(OUT.glob('*.apk'))]
        SNAPSHOT.write_text(json.dumps(rows, indent=2), encoding='utf-8')
        print(json.dumps({'oldApksPreserved': len(rows)}))
    raise SystemExit(0)
assert args.java and args.apksigner and args.aapt, 'Provide local Java/apksigner/aapt paths'
old_count = verify_old()
dist = (ROOT / args.dist).resolve()
assert dist == ROOT / 'dist' or dist.is_relative_to(ROOT / 'output') or dist.is_relative_to(ROOT / 'test-results'), 'Unsafe web directory'
assert (dist / 'index.html').is_file(), 'Missing verified web build'
assets = sorted(p for p in dist.rglob('*') if p.is_file())
with zipfile.ZipFile(APP) as apk:
    for source in assets:
        name = 'assets/public/' + source.relative_to(dist).as_posix()
        assert apk.read(name) == source.read_bytes(), 'Packaged asset mismatch: ' + name
    expected = {'assets/public/' + p.relative_to(dist).as_posix() for p in assets if p.parent.name == 'assets'}
    actual = {n for n in apk.namelist() if n.startswith('assets/public/assets/') and not n.endswith('/')}
    assert actual == expected, 'Stale or missing compiled assets'
    public_names = [n for n in apk.namelist() if n.startswith('assets/public/')]
    assert not any(re.search(r'/(output|tmp|comparison|test-results)/|local-secrets|source\.(jpg|png)|\.(sqlite|f32|bin|keystore|jks)$', n) for n in public_names), 'Private input/secret packaged'
    code = '\n'.join(apk.read(n).decode('utf-8') for n in expected if n.endswith('.js'))
    for marker in ['density-texture/17', 'density-subject/18', 'glyph-outline/19', 'normalized-subject/1', 'glyph-coordinates/1', 'thread-lettering/1', 'kit-build/1', 'iprasm.build-access/1', 'recorded-instructors/1', 'density-fit-checkpoint/1', 'pairLimit', 'pinDegreeLimit', 'processed-target/sample-centers-v1']:
        assert marker in code, 'Required feature absent: ' + marker
    if args.standard_kit:
        for marker in ['classic-greedy/1','standard-accent/20','standard-kit/1','standard-profile/1','legal-heart-accent/1','standard-preparation/1','minHoleGapMm','sector-','50 mm calibration']:
            assert marker in code, 'Required standard-kit feature absent: '+marker
    if args.classic_reference:
        for marker in ['classic-greedy/2', 'classic-reference/2', 'classic-coverage/2', 'standard-preparation/2', 'reviewed-face-fill/2', 'standard-accent/21', 'standard-photo-preview', 'standard-prepared-target', 'standard-thread-result']:
            assert marker in code, 'Required Phase10 reference feature absent: '+marker
    if args.portrait_framing:
        for marker in ['standard-preparation/3', 'reviewed-head-framing/3', 'portrait-framing-controls', 'line-budget-hours', 'Yelkani qoldirish', 'Ip soni']:
            assert marker in code, 'Required Phase11 framing feature absent: '+marker
    if args.customer_flow:
        for marker in ['standard-preparation/4','reviewed-customer-framing/4','customer-gesture-surface','customer-start','customer-result','Galereyadan tanlash','Qayta moslash']:
            assert marker in code, 'Required Phase12 customer feature absent: '+marker
    if args.classic_least_squares:
        for marker in ['classic-greedy/3','classic-reference/3','axis-centre-skip/1','classic3','referenceEngine']:
            assert marker in code, 'Required Phase13 least-squares feature absent: '+marker
    assert hashlib.sha256(apk.read('assets/public/fonts/NotoNaskhArabic-Regular.ttf')).hexdigest() == 'a87da9e7687b097af15f9dc217fe3e2dd80bcb3d50eccb394a4aece74b1ca4d9'
    voices = json.loads(apk.read('assets/public/voices/manifest.json'))
    assert len(voices['profiles']) == 2 and not any(p['clips'] for p in voices['profiles']), 'Unexpected fictional/undeclared voice assets'
    assert not any(n.endswith('.wav') for n in public_names), 'Synthetic test audio must not ship'
    assert '/voices/manifest.json' in apk.read('assets/public/sw.js').decode('utf-8')
    for notice in ['fonts/OFL.txt', 'fonts/OFL-NotoNaskhArabic.txt', 'licenses/qrcode.txt', 'licenses/dijkstrajs.txt']:
        assert apk.read('assets/public/' + notice), 'Missing license: ' + notice
badging = subprocess.run([args.aapt, 'dump', 'badging', str(APP)], capture_output=True, text=True, check=True, timeout=60).stdout
assert "package: name='uz.iprasm.app'" in badging
app_hash = digest(APP)
base = args.series + '-' + app_hash[:12]
archives = []
for source, suffix in [(APP, '-debug.apk'), (TEST, '-debug-androidTest.apk')]:
    target = OUT / (base + suffix)
    preserve_copy(source, target)
    archives.append(target)
signatures = []
for path in [OUT / 'ip-rasm-photo-quality-debug.apk', *archives]:
    check = subprocess.run([args.java, '-jar', args.apksigner, 'verify', '--print-certs', str(path)], capture_output=True, text=True, check=True, timeout=60)
    certificates = re.findall(r'Signer #\d+ certificate SHA-256 digest: ([a-fA-F0-9]{64})', check.stdout)
    assert len(certificates) == 1 and certificates[0].lower() == CERTIFICATE, 'Signing identity changed'
    signatures.append(dict(path=str(path.relative_to(ROOT)), sha256=digest(path), certificateSha256=CERTIFICATE))
assert verify_old() == old_count
evidence = dict(debug=True, nativeDeviceTested=False, phoneInstalled=False, productionActive=False,
                webDirectory=str(dist.relative_to(ROOT)), standardKitVerified=args.standard_kit,
                classicReferenceVerified=args.classic_reference, portraitFramingVerified=args.portrait_framing, customerFlowVerified=args.customer_flow, classicLeastSquaresVerified=args.classic_least_squares,
                previousApksVerifiedUnchanged=old_count, webAssetsVerified=len(assets),
                archivedApks=[str(p.relative_to(ROOT)) for p in archives], signatures=signatures,
                applicationBadging=badging.splitlines()[:6], recordedVoicesInstalled=0,
                assets=[dict(path=p.relative_to(dist).as_posix(), sha256=digest(p)) for p in assets])
report = OUT / (base + '-evidence.json')
report.write_text(json.dumps(evidence, indent=2), encoding='utf-8')
print(json.dumps({k: v for k, v in evidence.items() if k != 'assets'}))
