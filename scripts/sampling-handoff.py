"""Curated owner-local evidence; never live credentials, database or original JPEG."""
from pathlib import Path
import hashlib,json,shutil,subprocess
root=Path(__file__).resolve().parent.parent
out=root.parent.parent/'outputs/ip-rasm-sampling-quality';out.mkdir(parents=True,exist_ok=True)
contour=json.loads((root/'output/contour/evaluation.json').read_text(encoding='utf8'));assert len(contour['rows'])==3 and len(contour['projects'])==2 and not contour['errors']
face=json.loads((root/'output/circle-head-240-face/browser-evidence.json').read_text(encoding='utf8'));assert face['exactFloatReplay'] and face['exactPreviewPixels'] and face['sourceCornerChecks']==6 and face['offlineReload'] and face['exactExport'] and not face['errors']
for name in ['sampling-browser.json','sampling-browser-final.json']:
 stats=json.loads((root/'output/completion'/name).read_text(encoding='utf8'))['stats'];assert not stats['unexpected'] and not stats['flaky']
files=[]
def copy(source,destination):
 destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,destination);files.append(dict(path=destination.relative_to(out).as_posix(),sha256=hashlib.sha256(destination.read_bytes()).hexdigest(),bytes=destination.stat().st_size))
for name in ['audit.json']:
 copy(root/'output/sampling'/name,out/'sampling'/name)
for name in ['report.html','comparison.png','features.png','common-target.png','evaluation.json','comparison.json','reference-native.png','reference-common.png','weight-2-native.png','weight-2-common.png','weight-4-native.png','weight-4-common.png']:
 copy(root/'output/contour'/name,out/'contour'/name)
for variant in ['weight-2','weight-4']:
 for suffix in ['.json','.f32','-guide.json','-guide.txt','-guide.pdf','-pdf-evidence.json','-template-evidence.json','-pdf-contact-sheet.png']:
  copy(root/'output/contour'/(variant+suffix),out/'contour'/(variant+suffix))
for name in ['circle-guide.json','circle-source.png','circle-target.png','circle-sequence.png','circle-common.png','circle-settings.json','circle-compute.json','selection.json','circle-target.bin','circle-sequence.f32','whole-head-source.png','whole-head-target.png','whole-head-sequence.png','whole-head-common.png','features.png','report.html','browser-evidence.json']:
 copy(root/'output/circle-head-240-face'/name,out/'face-framing'/name)
for name in ['SAMPLING_CONTOUR_CHECKPOINT.md','PHYSICAL_TRIAL.md','LOCAL_OPERATIONS.md']:
 copy(root/'docs'/name,out/name)
for name in ['sampling-tests.log','sampling-build.log','sampling-browser.json','sampling-browser-final.json','sampling-visual.json','sampling-mobile.png','sampling-desktop.png','sampling-android.log','sampling-signing.json','sampling-apk-audit.json']:
 copy(root/'output/completion'/name,out/name)
for name in ['ip-rasm-sampling-debug.apk','ip-rasm-sampling-build-evidence.json']:
 copy(root/'output/mobile'/name,out/name)
build=json.loads((out/'ip-rasm-sampling-build-evidence.json').read_text());assert build['apkSha256']==hashlib.sha256((out/'ip-rasm-sampling-debug.apk').read_bytes()).hexdigest() and build['webAssetsVerified']==16 and not build['nativeDeviceTested']
commit=subprocess.run(['git','rev-parse','HEAD'],cwd=root,capture_output=True,text=True,encoding='utf8',check=True).stdout.strip()
evidence=dict(commit=commit,unitTestsThisIncrement=13,uniqueRelevantBrowserOutcomes=4,exactPreviewReplays=4,exactNewOfflineProjects=3,pdfGuidesVerified=2,pdfPages=108,facePdfIndependentlyVerified=False,apkSha256=build['apkSha256'],webAssetsVerified=16,currentBuildDeviceTested=False,physicalAcceptance=False,qualityAcceptance='open; no default promotion',uploaded=False,pushed=False,localOnly=True,files=files)
(out/'evidence.json').write_text(json.dumps(evidence,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in evidence.items() if k!='files'}))
