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
    if args.archive_name in ['ip-rasm-saved-portrait','ip-rasm-feature-contrast']:
        assert 'resolved-convergence/1' in worker, 'Resolved extension binding missing'
        main='\n'.join(archive.read(n).decode() for n in expected if '/index-' in n and n.endswith('.js'))
        assert all(marker in main for marker in ['iprasm.local-input/1','iprasm.local-generation-inputs','Continue saved calculation','Delete local calculation photo and state']), 'Saved target or localized controls missing'
        assert not any(n.startswith('assets/public/') and ('/output/' in n or n.endswith(('source.jpg','.f32','.bin'))) for n in archive.namelist()), 'Private input/report packaged'
    assert all(marker in worker for marker in ['density-convergence/1','chord-exchange/1','chord-exchange-state/1','nose-lip-residual/1']), 'Convergence/exchange recovery missing'
    assert all(marker in worker for marker in ['greedy-optical/4', 'density-optical/5', 'continuous-guarded/6', 'density-multiscale/7', 'density-physical/8', 'assembly-prune/9', 'density-fit-checkpoint/1', 'board-mm-forward/1', 'route-prune/1', 'contrastScales', 'pairLimit', 'pinDegreeLimit', 'stockPolicy', 'parentSequenceHash', 'target-luminance-v1', 'manual-light', 'backgroundMask', 'foregroundMask', 'processed-target/sample-centers-v1', 'jobId', 'circle-phase/1', 'radial-leaders/1', 'phaseDegreesClockwise']), 'Portrait engine missing'
    main_name = next(n for n in expected if '/index-' in n and n.endswith('.js'))
    main = archive.read(main_name).decode()
    if args.archive_name=='ip-rasm-portrait-dispatch':
        assert all(marker in main for marker in ['portrait-quality-setup','portrait-detail-profile','portrait-choice/off','preserved-result-notice']), 'Explicit portrait workflow or result provenance missing'
        assert all(marker in worker for marker in ['density-resolved/12','direct-source320/1','group-optical/15']), 'Preserved portrait engines missing'
        assert not any(name.startswith('assets/public/') and '/output/' in name for name in archive.namelist()), 'Private reports packaged'
    assert 'Computation resolution' in main and 'resolution' in main and '192' in main, 'Resolution control missing'
    if args.archive_name=='ip-rasm-photo-quality':
        assert all(marker in worker for marker in ['group-optical/15','multiple-portraits/1','hair-cycle-checkpoint/1']), 'Multiple-person engine or legacy recovery missing'
        assert all(marker in main for marker in ['photo-quality-advice','mark-two-faces','uz-Cyrl','checkout-total','business-admin','Guide language','Backend URL is not configured']), 'Photo assistance, locales, local commerce or backend guard missing'
        photo_name=next(n for n in expected if '/photo-prepare.worker-' in n)
        assert 'analysisTurn' in archive.read(photo_name).decode(), 'Orientation-aware local analysis missing'
        assert not any(name.startswith('assets/public/') and ('/output/' in name or name.endswith(('source.jpg','.f32','.bin'))) for name in archive.namelist()), 'Private evidence or photograph packaged'
    if args.archive_name=='ip-rasm-portrait-resolved':
        assert 'density-resolved/12' in worker and 'direct-source320/1' in worker, 'Resolved sampling engine/binding missing'
        assert '320 samples the original more finely' in main, 'Localized resolved controls missing'
        assert not any('/output/' in n or n.endswith('source.jpg') for n in archive.namelist()), 'Private photograph packaged'
    if args.archive_name=='ip-rasm-shape-fit':
        assert 'marked-face-shape-fit/1' in main and 'Fit marked face to shape' in main and 'not automatic detection' in main, 'Shape framing controls missing'
    if args.archive_name=='ip-rasm-outline':
        assert 'Fit marked outline' in main and 'Whole-head outline' in main and 'data-outline-index' in main, 'Manual source outline controls missing'
    if args.archive_name=='ip-rasm-native-speech':
        assert 'IpRasmSpeech' in main and 'Fit marked outline' in main, 'Native voice or outline controls missing'
        assert any(b'IpRasmSpeechPlugin' in archive.read(n) for n in archive.namelist() if n.endswith('.dex')), 'Native voice implementation missing'
    if args.archive_name=='ip-rasm-sampling':
        assert all(marker in main for marker in ['Check facial detail before computing','Hisoblashdan oldin yuz detallarini tekshiring','Проверьте детали лица до расчёта','portrait-sampling','data-clipped','data-small']), 'Localized portrait sampling missing'
        assert not any(name.startswith('assets/public/') and ('/output/' in name or name.endswith(('source.jpg','.f32','.bin'))) for name in archive.namelist()), 'Private experiment/photo assets packaged'
    if args.archive_name=='ip-rasm-anatomy':
        assert all(marker in worker for marker in ['density-anatomy/10','manual-nose-lip-importance/1','raised-cosine/1','noseMultiplier','mouthMultiplier']), 'Anatomical objective or recovery binding missing'
        assert all(marker in main for marker in ['Nose and lip priority (v10, experimental)','Burun va lab ustuvorligi (v10, tajriba)','Приоритет носа и губ (v10, эксперимент)']), 'Localized anatomical action missing'
        assert not any(name.startswith('assets/public/') and ('/output/' in name or name.endswith(('source.jpg','.f32','.bin'))) for name in archive.namelist()), 'Private experiment/photo assets packaged'
    if args.archive_name in ['ip-rasm-head-quality','ip-rasm-test-ready']:
        assert all(marker in worker for marker in ['density-head/13','manual-head-importance/1','hair-cycles/14','face-protected-cycles/1']), 'Whole-head/cycle optimizer or recovery binding missing'
        assert all(marker in main for marker in ['Face and hair priority · experimental','Yuz va sochga e’tibor · tajriba','Приоритет лица и волос · эксперимент']), 'Localized experimental portrait control missing'
        assert not any(name.startswith('assets/public/') and ('/output/' in name or name.endswith(('source.jpg','.f32','.bin'))) for name in archive.namelist()), 'Private photograph or experiment assets packaged'
    if args.archive_name=='ip-rasm-test-ready':
        assert 'hair-cycle-checkpoint/1' in worker, 'Bounded hair recovery missing'
        assert 'optimizer-recovery' in main and 'Keep recovered guide separately' in main, 'Recovery UI missing'
    if args.archive_name in ['ip-rasm-pin-basis','ip-rasm-grid-product','ip-rasm-camera']:
        assert all(marker in worker for marker in ['density-pin-basis/11','circle-chords/1','minimumAngularGapDegrees']), 'Pin basis binding missing'
        assert all(marker in main for marker in ['240/320-pin circle (v11, experimental)','240/320 mixli doira (v11, tajriba)','Круг с 240/320 гвоздями (v11, эксперимент)']), 'Localized basis controls missing'
        assert not any(name.startswith('assets/public/') and ('/output/' in name or name.endswith(('source.jpg','.f32','.bin'))) for name in archive.namelist()), 'Private assets packaged'
    if args.archive_name in ['ip-rasm-grid-product','ip-rasm-camera']:
        assert all(marker in main for marker in ['inventory-regret-linear-rgb/1','serpentine-top-left/1','iprasm.grid-project/1','Grid crafts','Olmosli rasm','Алмазная живопись']), 'Grid engine/localization missing'
        assert any('/grid-pdf-' in name for name in expected), 'Grid PDF export missing'
    if args.archive_name=='ip-rasm-camera':
        assert all(marker in main for marker in ['Rasm yuklash','Rasmga olish','Take photo','Use this photo','Сделать фотографию','getUserMedia','native-photo-capture','environment','image/*']), 'Camera/upload flow missing'
        manifest=archive.read('AndroidManifest.xml')
        action='android.media.action.IMAGE_CAPTURE'
        assert action.encode() in manifest or action.encode('utf-16le') in manifest, 'Native camera query missing'
        permission='android.permission.CAMERA'
        assert permission.encode() not in manifest and permission.encode('utf-16le') not in manifest, 'Unexpected dangerous camera permission'
    if args.archive_name=='ip-rasm-feature-contrast':
        assert all(marker in worker for marker in ['density-feature/16','source-feature-contrast/1','consistent-undershoot/1']), 'Fine-feature engine or strict fresh-light recovery missing'
        assert 'fine-feature-experiment' in main, 'Experimental control missing'
        assert not any(name.startswith('assets/public/') and ('/output/' in name or name.endswith(('source.jpg','.f32','.bin'))) for name in archive.namelist()), 'Private assets packaged'
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
    apkSha256=hashlib.sha256(apk.read_bytes()).hexdigest(), algorithms=['greedy-optical/4','density-optical/5','continuous-guarded/6','density-multiscale/7','density-physical/8','assembly-prune/9']+(['density-anatomy/10','density-pin-basis/11'] if args.archive_name in ['ip-rasm-pin-basis','ip-rasm-grid-product','ip-rasm-camera'] else ['density-anatomy/10'] if args.archive_name=='ip-rasm-anatomy' else ['density-head/13','hair-cycles/14'] if args.archive_name in ['ip-rasm-head-quality','ip-rasm-test-ready'] else []),
    anatomicalImportance='manual-nose-lip-importance/1; raised-cosine/1; immutable params and recovery binding; opt-in, quality acceptance open' if args.archive_name=='ip-rasm-anatomy' else None,
    headImportance='manual-head-importance/1; opt-in, face-region maximum weighting, exact coordinate reference' if args.archive_name in ['ip-rasm-head-quality','ip-rasm-test-ready'] else None,
    hairCycles='face-protected-cycles/1; preserves face pixels/routes, adds executable paired strands; experimental, not promoted' if args.archive_name in ['ip-rasm-head-quality','ip-rasm-test-ready'] else None,
    optimizerRecovery='local IndexedDB; exact processed target/material/seed/tuning and explicit extension/search binding', convergence='density-convergence/1; explicit 24-total-sweep allowance; experimental, no likeness acceptance', exchange='chord-exchange/1; equal gain-evaluation budgets; experimental, no likeness acceptance', simplification='complete-route regional-equivalence/1; human acceptance separate',
    backgroundSelection="manual 64x64 background and foreground masks",
    regionReference="processed-target/sample-centers-v1", workerJobAssociation=True,
    pinLayoutVersion="circle-phase/1", defaultPinLayoutUnchanged=True, templateVersion="radial-leaders/1",
    defaultResolution=160, experimentalResolution=320 if args.archive_name in ['ip-rasm-portrait-resolved','ip-rasm-head-quality','ip-rasm-test-ready'] else 192, importedResolutionPreserved=True, maxLines=20000, stockPolicy='estimate', instrumentationCompiled=True,
    nativeDeviceTested=False, physicallyValidated=False, productionActive=False,
    assets=[dict(path=f.relative_to(dist).as_posix(),sha256=hashlib.sha256(f.read_bytes()).hexdigest()) for f in files])
if args.archive_name=='ip-rasm-portrait-resolved':
    evidence['algorithms'] += ['density-anatomy/10','density-pin-basis/11','density-resolved/12']
    evidence['samplingVersion']='direct-source320/1; opt-in; guarded 240/320 circular basis; exact target/checkpoint binding'
if args.archive_name=='ip-rasm-photo-quality':
    evidence['algorithms']+=['density-anatomy/10','density-pin-basis/11','density-resolved/12','density-head/13','hair-cycles/14','group-optical/15']
    evidence['multiplePortraits']='independent reviewed sample-center regions; guarded continuous path; exact-person likeness acceptance open'
    evidence['photoAdvice']='actual target clipping, sampling and low-contrast advisories; no guaranteed quality score'
    evidence['uiLocales']=['uz','uz-Cyrl','ru','en']
    evidence['nativeBackend']='unconfigured by default; HTTPS must be configured for commerce; offline artwork remains available'
    evidence['bundledDistinctVoices']=False
    evidence['experimentalResolution']=320
if args.archive_name in ['ip-rasm-saved-portrait','ip-rasm-feature-contrast']:
    evidence['algorithms']+=['density-anatomy/10','density-pin-basis/11','density-resolved/12','density-head/13','hair-cycles/14','group-optical/15']
    evidence['convergence']='resolved-convergence/1; exact old-budget validation, 8+16=24 total, unchanged target/profile/objective'
    evidence['localInputs']='iprasm.local-input/1; exact private target, recipe and completed state; explicit deletion; no pixels in shared instructions'
    evidence['experimentalResolution']=320
if args.archive_name=='ip-rasm-feature-contrast':
    evidence['algorithms']+=['density-feature/16']
    evidence['featureContrast']='source-feature-contrast/1; local opt-in; not a likeness breakthrough or promoted default'
    evidence['initialObjective']='consistent-undershoot/1; fresh light only; legacy validation retained'
(out / ('build-evidence.json' if args.archive_name=='ip-rasm' else args.archive_name+'-build-evidence.json')).write_text(json.dumps(evidence, indent=2), encoding='utf-8')
print(json.dumps({k:v for k,v in evidence.items() if k != 'assets'}))
