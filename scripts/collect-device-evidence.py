"""Collect only known synthetic instrumentation artifacts; never copy phone preferences/photos."""
import argparse
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--adb', required=True)
parser.add_argument('--serial', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
out = root / 'output/product-evidence/device'
out.mkdir(parents=True, exist_ok=True)
files = ['product-device-core.json', 'product-device-customer.json',
         'product-device-assembly.png', 'product-device-customer.png',
         'ip-rasm.json', 'ip-rasm-guide.pdf']
for name in files:
    result = subprocess.run([args.adb, '-s', args.serial, 'exec-out', 'run-as',
                             'uz.iprasm.app', 'cat', 'cache/' + name],
                            capture_output=True, check=True, timeout=30)
    (out / name).write_bytes(result.stdout)
project = json.loads((out / 'ip-rasm.json').read_text(encoding='utf-8'))
assert project['schema'] == 'iprasm.project/1'
assert project['project']['progress']['confirmed'] == 10
assert (out / 'ip-rasm-guide.pdf').read_bytes().startswith(b'%PDF-')
print(json.dumps({'files': len(files), 'syntheticOnly': True,
                  'sequenceHash': project['project']['instruction']['sequenceHash'],
                  'physicalAcceptance': False}))
