"""Owner-authorized in-place update. Never clear/uninstall or print private preferences."""
import subprocess, pathlib, zipfile, hashlib, json, shutil, argparse
parser = argparse.ArgumentParser()
parser.add_argument('--artifact',choices=['white-background','people-features','paint','portrait-detail','thread-fineness','simple-flow'],default='white-background')
parser.add_argument('--verify-only',action='store_true')
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
out = root / 'output' / args.artifact
out.mkdir(parents=True, exist_ok=True)
adb = r'C:\Users\user\AppData\Local\Android\Sdk\platform-tools\adb.exe'
target = [adb, '-s', 'bmjvzppr6955t4nr']
def run(args):
    result = subprocess.run(args, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    return result.stdout
def prefs():
    return subprocess.check_output(target + ['exec-out','run-as','uz.iprasm.app','cat','shared_prefs/CapacitorStorage.xml'])
apk = root / 'android/app/build/outputs/apk/debug/app-debug.apk'
test = root / 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk'
dest = root / 'output/mobile' / f'ip-rasm-{args.artifact}-debug.apk'
shutil.copy2(apk, dest)
assets = []
with zipfile.ZipFile(apk) as package:
    for file in (root / 'dist').rglob('*'):
        if file.is_file():
            key = 'assets/public/' + file.relative_to(root / 'dist').as_posix()
            assert package.read(key) == file.read_bytes(), key
            assets.append(key)
    expected=set(assets)
    actual={name for name in package.namelist() if name.startswith('assets/public/') and not name.endswith('/')}
    assert actual-expected == {'assets/public/cordova.js','assets/public/cordova_plugins.js'}, 'Unexpected extra packaged public files'
java = r'D:\Coding projects\ipdan face yasaydigan app\tmp\toolchains\jdk-21.0.12.1+1\bin\java.exe'
jar = r'C:\Users\user\AppData\Local\Android\Sdk\build-tools\36.0.0\lib\apksigner.jar'
signer = '8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90'
for file in (apk,test):
    assert signer in run([java,'-jar',jar,'verify','--print-certs',str(file)])
report = dict(apk=str(dest), apkBytes=apk.stat().st_size,
              apkSha256=hashlib.sha256(apk.read_bytes()).hexdigest(),
              testApkSha256=hashlib.sha256(test.read_bytes()).hexdigest(),
              verifiedDistAssets=len(assets), signerSha256=signer)
(out/'build-evidence.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
if args.verify_only:
    print('Build assets and signatures verified. No phone connection, install or native test attempted.')
    raise SystemExit(0)
assert run(target + ['get-state']).strip() == 'device', 'Authorized phone is not available'
before = prefs()
(out/'private-device-prefs-before.xml').write_bytes(before)
for file,flags in ((dest,['-r']),(test,['-r','-t'])):
    assert 'Success' in run(target + ['install'] + flags + [str(file)])
    print(file.name,'installed in place')
classes = 'uz.iprasm.app.PackagedAssetsTest,uz.iprasm.app.CoreWorkflowTest#photoFirstStartShowsOnlyTwoSourceActions,uz.iprasm.app.CoreWorkflowTest#actualNativeCameraCancellationPreservesPhotoAndCrop,uz.iprasm.app.CoreWorkflowTest#packagedOutlineAndCancelledNativePhotoPickerPreserveSource'
log = run(target + ['shell','am','instrument','-w','-e','class',classes,'uz.iprasm.app.test/androidx.test.runner.AndroidJUnitRunner'])
(out/'device-tests.log').write_text(log,encoding='utf-8')
assert 'OK (5 tests)' in log, log
after = prefs()
(out/'private-device-prefs-after.xml').write_bytes(after)
assert before == after, 'Saved preferences changed'
report.update(nativeChecks=5, savedPreferencesExact=True)
(out/'device-update-evidence.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('Five device checks passed; saved preferences are byte-identical.')
