"""Seal the local photo-input increment; exclude private preferences and traces."""
from pathlib import Path
import argparse, hashlib, json, shutil, subprocess
root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--dest',type=Path,required=True);args=parser.parse_args()
dest=args.dest.resolve();assert dest!=root and root not in dest.parents
reports=[root/'output/completion'/name for name in ['camera-browser-final.json','camera-browser-release.json']]
passed=set()
def outcomes(suites):
    for suite in suites:
        for spec in suite.get('specs',[]):
            for case in spec['tests']:
                if any(result['status']=='passed' for result in case['results']):
                    passed.add((spec['file'],spec['title'],case['projectName']))
        outcomes(suite.get('suites',[]))
for path in reports:outcomes(json.loads(path.read_text(encoding='utf-8'))['suites'])
assert len(passed)==20
release=json.loads(reports[1].read_text(encoding='utf-8'))
assert release['stats']['expected']==6 and release['stats']['unexpected']==0
device=json.loads((root/'output/camera/device-verification.json').read_text(encoding='utf-8'))
assert device['nativeCameraTestPassed'] and device['nativeGalleryCancellationTestPassed'] and device['savedPreferencesPreservedExactly']
install=json.loads((root/'output/camera/install-evidence.json').read_text(encoding='utf-8'))
assert install['installedApkSha256Verified']==install['apkSha256']
files=list((root/'docs').glob('*.md'))+reports
files += [p for p in (root/'output/camera').iterdir() if p.is_file() and p.suffix in ['.json','.png','.log'] and not p.name.startswith('diagnostic')]
files += [p for p in (root/'output/mobile').glob('ip-rasm-camera*') if '-previous-' not in p.name]
assert all(p.suffix not in ['.xml','.zip','.db','.jpg'] for p in files)
receipt=[]
for path in sorted(set(files)):
    relative=path.relative_to(root);target=dest/relative;data=path.read_bytes()
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists():assert target.read_bytes()==data,'Existing handoff differs; choose a new destination'
    else:shutil.copy2(path,target)
    digest=hashlib.sha256(data).hexdigest();assert hashlib.sha256(target.read_bytes()).hexdigest()==digest
    receipt.append(dict(path=relative.as_posix(),bytes=len(data),sha256=digest))
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
(dest/'RECEIPT.json').write_text(json.dumps(dict(commit=commit,uniqueBrowserOutcomes=20,targetedNativeTests=2,
    installedApkVerified=True,personalCaptureTested=False,fullProductComplete=False,portraitAcceptance='open',
    privatePreferencesCopied=False,tracesCopied=False,files=receipt),indent=2),encoding='utf-8')
print(json.dumps(dict(commit=commit,files=len(receipt),destination=str(dest),verified=True)))
