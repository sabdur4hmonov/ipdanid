"""Copy only reviewed local artifacts; never include sandbox secrets or original source file."""
from pathlib import Path
import shutil, hashlib, json, subprocess
root=Path(__file__).resolve().parent.parent
out=root.parent.parent/'outputs'/'ip-rasm-outline'
out.mkdir(parents=True,exist_ok=True)
folder=root/'output'/'outline'
files=['report.html','comparison.png','features.png','marked-head.png','selection.json','measurements.json','browser-evidence.json','final-browser.json','signing-evidence.json','report-browser.png']
files += [name+suffix for name in ['baseline','rectangle','outline'] for suffix in ['-sequence.png']]
files += [name+suffix for name in ['rectangle','outline'] for suffix in ['-guide.json','-guide.txt','-guide.pdf','-template-evidence.json','-pdf-evidence.json','-pdf-contact-sheet.png','-compute.json','-settings.json']]
for name in files:
    assert (folder/name).is_file(),name
    shutil.copy2(folder/name,out/name)
apk=root/'output/mobile/ip-rasm-outline-debug.apk'
shutil.copy2(apk,out/apk.name)
shutil.copy2(root/'output/mobile/ip-rasm-outline-build-evidence.json',out/'build-evidence.json')
shutil.copy2(root/'docs/HEAD_OUTLINE_CHECKPOINT.md',out/'CHECKPOINT.md')
commit=subprocess.run(['git','rev-parse','HEAD'],cwd=root,text=True,capture_output=True,check=True).stdout.strip()
evidence={'commit':commit,'apkSha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'tests':{'fullUnit':77,'finalOutline':3,'uniqueRelevantBrowser':10,'exactSequencePreviews':3,'offlineProjects':2},'nativeDeviceTestedThisBuild':False,'physicalAcceptance':False,'portraitQualityAcceptance':'inconclusive','productionActive':False,'photosUploaded':False,'localOnly':True}
(out/'evidence.json').write_text(json.dumps(evidence,indent=2))
print(json.dumps({'output':str(out),**evidence}))
