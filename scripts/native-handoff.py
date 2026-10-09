"""Archive reviewed synthetic evidence and the exact device-tested APK locally."""
from pathlib import Path
import hashlib, json, shutil, subprocess

root = Path(__file__).resolve().parent.parent
source = root / 'output/outline/device'
out = root.parent.parent / 'outputs/ip-rasm-native'
out.mkdir(parents=True, exist_ok=True)
log = (source / 'accepted-device-test.log').read_text(encoding='utf-8-sig')
assert 'OK (5 tests)' in log and 'FAILURES!!!' not in log
browser = json.loads((source / 'final-browser.json').read_text(encoding='utf-8-sig'))
assert browser['stats']['expected'] == 10 and browser['stats']['unexpected'] == 0
apk = root / 'output/mobile/ip-rasm-native-speech-debug.apk'
digest = hashlib.sha256(apk.read_bytes()).hexdigest()
build = json.loads((root / 'output/mobile/ip-rasm-native-speech-build-evidence.json').read_text())
assert build['apkSha256'] == digest
human = json.loads((source / 'final/human-audio-evidence.json').read_text())
assert human['ownerConfirmedHeardRepeatedGuide'] and human['observedAppApkSha256'] == digest
for name in ['accepted-device-test.log','final-device-test.log','offline-test.log',
             'locked-device-test.log',
             'outline-test-attempt1.log','outline-test.log','human-listen-test.log',
             'human-listen-test2.log','final-browser.json','signing-evidence.json']:
    shutil.copy2(source / name, out / name)
for name in ['product-device-core.json','product-device-customer.json',
             'product-device-assembly.png','product-device-customer.png',
             'outline-device.json','outline-device-crop.png','speech-device.json',
             'human-audio-evidence.json','ip-rasm.json','ip-rasm-guide.pdf',
             'pdf-evidence.json','pdf-contact.png']:
    shutil.copy2(source / 'final' / name, out / name)
shutil.copy2(apk, out / apk.name)
shutil.copy2(root / 'output/mobile/ip-rasm-native-speech-build-evidence.json', out / 'build-evidence.json')
shutil.copy2(root / 'docs/NATIVE_SPEECH_CHECKPOINT.md', out / 'CHECKPOINT.md')
commit = subprocess.run(['git','rev-parse','HEAD'], cwd=root, capture_output=True, text=True, check=True).stdout.strip()
evidence = dict(commit=commit, apkSha256=digest, nativeDeviceTestedThisBuild=True,
                nativeChecks=5, uniqueRelevantBrowser=10, humanEnglishAudibility=True,
                fullDisconnectedCoreTestBuild='d2baf8c outline APK',
                generatorChanged=False, physicalAcceptance=False,
                portraitQualityAcceptance='inconclusive', productionActive=False,
                photosUploaded=False, localOnly=True)
(out / 'evidence.json').write_text(json.dumps(evidence, indent=2), encoding='utf-8')
print(json.dumps(dict(output=str(out), **evidence)))
