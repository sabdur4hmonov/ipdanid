"""Verify the freshly built APK against dist; compilation is not device execution."""
from pathlib import Path
import zipfile, hashlib, json, shutil, argparse
from datetime import datetime, timezone

parser=argparse.ArgumentParser();parser.add_argument('--archive-name',default='ip-rasm');args=parser.parse_args()
assert args.archive_name.replace('-','').isalnum(), 'Archive name must be a basename'
root = Path(__file__).resolve().parent.parent
apk = root / 'android/app/build/outputs/apk/debug/app-debug.apk'
test_apk = root / 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk'
dist = root / 'dist'
out = root / 'output/mobile'
files = sorted(p for p in dist.rglob('*') if p.is_file())
with zipfile.ZipFile(apk) as archive:
    for file in files:
        name = 'assets/public/' + file.relative_to(dist).as_posix()
        assert archive.read(name) == file.read_bytes(), f'Packaged asset mismatch: {name}'
    expected = {'assets/public/' + f.relative_to(dist).as_posix() for f in files if f.parent.name == 'assets'}
    actual = {n for n in archive.namelist() if n.startswith('assets/public/assets/') and not n.endswith('/')}
    assert actual == expected, 'Stale or missing compiled assets in APK'
    worker_name = next(n for n in expected if '/generator.worker-' in n)
    worker = archive.read(worker_name).decode()
    assert all(marker in worker for marker in ['density-convergence/1','chord-exchange/1','chord-exchange-state/1','nose-lip-residual/1']), 'Convergence/exchange recovery missing'
    assert all(marker in worker for marker in ['greedy-optical/4', 'density-optical/5', 'continuous-guarded/6', 'density-multiscale/7', 'density-physical/8', 'assembly-prune/9', 'density-fit-checkpoint/1', 'board-mm-forward/1', 'route-prune/1', 'contrastScales', 'pairLimit', 'pinDegreeLimit', 'stockPolicy', 'parentSequenceHash', 'target-luminance-v1', 'manual-light', 'backgroundMask', 'foregroundMask', 'processed-target/sample-centers-v1', 'jobId', 'circle-phase/1', 'radial-leaders/1', 'phaseDegreesClockwise']), 'Portrait engine missing'
    main_name = next(n for n in expected if '/index-' in n and n.endswith('.js'))
    main = archive.read(main_name).decode()
    assert 'Computation resolution' in main and 'resolution' in main and '192' in main, 'Resolution control missing'
    if args.archive_name=='ip-rasm-shape-fit':
        assert 'marked-face-shape-fit/1' in main and 'Fit marked face to shape' in main and 'not automatic detection' in main, 'Shape framing controls missing'
out.mkdir(parents=True, exist_ok=True)
if args.archive_name!='ip-rasm':
    # Never discard a previously verified fixed-name local build.
    for suffix in ['-debug.apk','-debug-androidTest.apk']:
        old=out/(args.archive_name+suffix)
        if old.exists():
            digest=hashlib.sha256(old.read_bytes()).hexdigest();backup=out/(args.archive_name+'-previous-'+digest[:12]+suffix)
            if not backup.exists():backup.write_bytes(old.read_bytes())
shutil.copy2(apk, out / (args.archive_name+'-debug.apk'))
shutil.copy2(test_apk, out / (args.archive_name+'-debug-androidTest.apk'))
evidence = dict(builtAt=datetime.now(timezone.utc).isoformat(), debug=True,
    webAssetsVerified=len(files), bytes=apk.stat().st_size,
    apkSha256=hashlib.sha256(apk.read_bytes()).hexdigest(), algorithms=['greedy-optical/4','density-optical/5','continuous-guarded/6','density-multiscale/7','density-physical/8','assembly-prune/9'],
    optimizerRecovery='local IndexedDB; exact processed target/material/seed/tuning and explicit extension/search binding', convergence='density-convergence/1; explicit 24-total-sweep allowance; experimental, no likeness acceptance', exchange='chord-exchange/1; equal gain-evaluation budgets; experimental, no likeness acceptance', simplification='complete-route regional-equivalence/1; human acceptance separate',
    backgroundSelection="manual 64x64 background and foreground masks",
    regionReference="processed-target/sample-centers-v1", workerJobAssociation=True,
    pinLayoutVersion="circle-phase/1", defaultPinLayoutUnchanged=True, templateVersion="radial-leaders/1",
    defaultResolution=160, experimentalResolution=192, importedResolutionPreserved=True, maxLines=20000, stockPolicy='estimate', instrumentationCompiled=True,
    nativeDeviceTested=False, physicallyValidated=False, productionActive=False,
    assets=[dict(path=f.relative_to(dist).as_posix(),sha256=hashlib.sha256(f.read_bytes()).hexdigest()) for f in files])
(out / ('build-evidence.json' if args.archive_name=='ip-rasm' else args.archive_name+'-build-evidence.json')).write_text(json.dumps(evidence, indent=2), encoding='utf-8')
print(json.dumps({k:v for k,v in evidence.items() if k != 'assets'}))
