"""Verify the freshly built APK against dist; compilation is not device execution."""
from pathlib import Path
import zipfile, hashlib, json, shutil
from datetime import datetime, timezone

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
    assert all(marker in worker for marker in ['greedy-optical/4', 'density-optical/5', 'continuous-guarded/6', 'density-multiscale/7', 'contrastScales', 'pairLimit', 'pinDegreeLimit', 'stockPolicy', 'parentSequenceHash', 'target-luminance-v1', 'manual-light', 'backgroundMask', 'foregroundMask', 'processed-target/sample-centers-v1', 'jobId']), 'Portrait engine missing'
out.mkdir(parents=True, exist_ok=True)
shutil.copy2(apk, out / 'ip-rasm-debug.apk')
shutil.copy2(test_apk, out / 'ip-rasm-debug-androidTest.apk')
evidence = dict(builtAt=datetime.now(timezone.utc).isoformat(), debug=True,
    webAssetsVerified=len(files), bytes=apk.stat().st_size,
    apkSha256=hashlib.sha256(apk.read_bytes()).hexdigest(), algorithms=['greedy-optical/4','density-optical/5','continuous-guarded/6','density-multiscale/7'],
    backgroundSelection="manual 64x64 background and foreground masks",
    regionReference="processed-target/sample-centers-v1", workerJobAssociation=True,
    resolution=160, maxLines=20000, stockPolicy='estimate', instrumentationCompiled=True,
    nativeDeviceTested=False, physicallyValidated=False, productionActive=False,
    assets=[dict(path=f.relative_to(dist).as_posix(),sha256=hashlib.sha256(f.read_bytes()).hexdigest()) for f in files])
(out / 'build-evidence.json').write_text(json.dumps(evidence, indent=2), encoding='utf-8')
print(json.dumps({k:v for k,v in evidence.items() if k != 'assets'}))
