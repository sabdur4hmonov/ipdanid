from pathlib import Path
import json,hashlib,shutil,subprocess
root=Path(__file__).resolve().parent.parent
out=root.parent.parent/'outputs/ip-rasm-anatomical-quality';out.mkdir(parents=True,exist_ok=True)
summary=json.loads((root/'output/anatomy/verification-summary.json').read_text());assert summary['passedUnitTests']==94 and summary['uniqueRelevantBrowserOutcomes']==6
files=[]
def copy(src,dst):
 dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst);files.append(dict(path=dst.relative_to(out).as_posix(),sha256=hashlib.sha256(dst.read_bytes()).hexdigest(),bytes=dst.stat().st_size))
for name in ['report.html','comparison.png','features.png','common-target.png','comparison.json','evaluation.json','legacy-replay.json','verification-summary.json','report-layout.json','report-393.png','report-1280.png','reference-native.png','reference-common.png','control-native.png','control-common.png','control.json','control.f32','control-guide.json','control-guide.txt','control-guide.pdf','nose-lip-native.png','nose-lip-common.png','nose-lip.json','nose-lip.f32','nose-lip-guide.json','nose-lip-guide.txt','nose-lip-guide.pdf','nose-lip-pdf-evidence.json','nose-lip-template-evidence.json','nose-lip-pdf-contact-sheet.png']:
 copy(root/'output/anatomy'/name,out/'anatomy'/name)
for name in ['ip-rasm-anatomy-debug.apk','ip-rasm-anatomy-debug-androidTest.apk','ip-rasm-anatomy-build-evidence.json','ip-rasm-anatomy-signing-evidence.json','anatomy-gradle-final.log']:
 copy(root/'output/mobile'/name,out/'mobile'/name)
for name in ['anatomy-unit-release.json','anatomy-browser-final.json','anatomy-browser-corrected.json']:
 copy(root/'output/completion'/name,out/'verification'/name)
for name in ['ANATOMICAL_IMPORTANCE_CHECKPOINT.md','STATUS.md','ROADMAP.md','FEATURE_MATRIX.md','BLOCKERS.md','PHYSICAL_TRIAL.md']:
 copy(root/'docs'/name,out/'docs'/name)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True,encoding='utf8').strip()
assert all(not f['path'].endswith(('source.jpg','local-secrets.json','.sqlite')) for f in files)
receipt=dict(commit=commit,sourceCheckout=str(root),files=files,tests=summary,qualityAcceptance='inconclusive; unchanged defaults',physicalAcceptance=False,currentNativeBuildTested=False,productionActive=False,rawSourceIncluded=False,pushed=False,published=False)
(out/'receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf8')
print(json.dumps(dict(commit=commit,files=len(files),directory=str(out),rawSourceIncluded=False)))
