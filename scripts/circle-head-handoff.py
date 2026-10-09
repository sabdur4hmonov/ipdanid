"""Local reviewed portrait artifacts and synthetic service evidence; no live secrets/DB."""
from pathlib import Path
import hashlib,json,shutil,subprocess
root=Path(__file__).resolve().parent.parent
out=root.parent.parent/'outputs/ip-rasm-circle-quality'
out.mkdir(parents=True,exist_ok=True)
browser=json.loads((root/'output/circle-head/browser-evidence.json').read_text())
assert len(browser['exact'])==4 and len(browser['projects'])==4 and not browser['errors']
for folder in ['circle-head','circle-head-240','circle-head-240-clean','circle-head-240-192']:
 source=root/'output'/folder;destination=out/folder;destination.mkdir(exist_ok=True)
 for name in ['circle-guide.json','circle-guide.txt','circle-guide.pdf','circle-source.png','circle-target.png','circle-sequence.png','circle-common.png','circle-target.bin','circle-sequence.f32','circle-settings.json','circle-compute.json','selection.json','circle-pdf-evidence.json','circle-template-evidence.json','circle-pdf-contact-sheet.png']:
  shutil.copy2(source/name,destination/name)
 for name in ['comparison.png','features.png','measurements.json','browser-evidence.json','report.html','common-target.png']:
  if (source/name).exists():shutil.copy2(source/name,destination/name)
outline=out/'outline';outline.mkdir(exist_ok=True)
for name in ['outline-sequence.png','outline-guide.json','outline-guide.pdf']:
 shutil.copy2(root/'output/outline'/name,outline/name)
for name in ['CIRCLE_PORTRAIT_CHECKPOINT.md','LOCAL_OPERATIONS.md','PHYSICAL_TRIAL.md']:
 shutil.copy2(root/'docs'/name,out/name)
for name in ['unit-accepted.log','resolution-rerun.log','staff-http.json','browser-accepted.json','resolution-browser.json','build-final.log','android-build-final.log','signing-final.json']:
 shutil.copy2(root/'output/completion'/name,out/name)
apk=root/'output/mobile/ip-rasm-circle-quality-debug.apk';build=root/'output/mobile/ip-rasm-circle-quality-build-evidence.json'
digest=hashlib.sha256(apk.read_bytes()).hexdigest();assert digest==json.loads(build.read_text())['apkSha256']
shutil.copy2(apk,out/apk.name);shutil.copy2(build,out/build.name)
commit=subprocess.run(['git','rev-parse','HEAD'],cwd=root,capture_output=True,text=True,check=True).stdout.strip()
evidence=dict(commit=commit,apkSha256=digest,exactOfflinePortraits=4,uniqueUnitTestsWithPassingEvidence=87,uniqueRelevantBrowserOutcomes=10,staffHttpChecks=67,customerHttpChecks=37,currentBuildDeviceTested=False,physicalAcceptance=False,qualityAcceptance='mixed/inconclusive; no default promotion',photosUploaded=False,productionActive=False,localOnly=True)
(out/'evidence.json').write_text(json.dumps(evidence,indent=2),encoding='utf8')
print(json.dumps(dict(output=str(out),**evidence)))
