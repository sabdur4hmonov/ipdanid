"""Collect only known synthetic instrumentation artifacts; never copy phone preferences/photos."""
import argparse
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--adb', required=True)
parser.add_argument('--serial', required=True)
parser.add_argument('--output', default='output/product-evidence/device')
parser.add_argument('--include-outline-speech', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
out = (root / args.output).resolve()
assert out.is_relative_to(root / 'output'), 'Evidence must stay inside project output'
out.mkdir(parents=True, exist_ok=True)
files = ['product-device-core.json', 'product-device-customer.json',
         'product-device-assembly.png', 'product-device-customer.png',
         'ip-rasm.json', 'ip-rasm-guide.pdf']
if args.include_outline_speech:
    files += ['outline-device.json', 'outline-device-crop.png', 'speech-device.json']
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
