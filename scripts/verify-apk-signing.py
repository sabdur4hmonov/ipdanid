"""Local signature verification against the archived APK; never reads private keys."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--java', required=True)
parser.add_argument('--apksigner', required=True)
parser.add_argument('--expected-certificate', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('apks', nargs='+')
args = parser.parse_args()
evidence = []
for name in args.apks:
    apk = Path(name)
    check = subprocess.run(
        [args.java, '-jar', args.apksigner, 'verify', '--print-certs', str(apk)],
        capture_output=True, text=True, check=True, timeout=60,
    )
    certificates = re.findall(r'Signer #\d+ certificate SHA-256 digest: ([0-9a-fA-F]{64})', check.stdout)
    assert len(certificates) == 1, 'Expected exactly one APK signing identity'
    certificate = certificates[0].lower()
    assert certificate == args.expected_certificate.lower(), 'Signing identity changed'
    evidence.append(dict(path=str(apk), verified=True, bytes=apk.stat().st_size,
                         sha256=hashlib.sha256(apk.read_bytes()).hexdigest(),
                         certificateSha256=certificate))
result = dict(apks=evidence, nativeDeviceTested=False, physicalAssemblyValidated=False)
Path(args.output).write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result))
