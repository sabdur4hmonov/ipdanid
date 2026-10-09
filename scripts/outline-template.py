"""Run the existing independent PDF-coordinate audit on derived sealed records."""
from pathlib import Path
import json, runpy, sys
folder=Path('output/outline')
for name in ['rectangle','outline']:
    project=json.loads((folder/f'{name}-guide.json').read_text())['project']
    path=folder/f'{name}.json'
    expected={'instruction':project['instruction']}
    if path.exists():assert json.loads(path.read_text())==expected
    else:
        with path.open('x') as stream:json.dump(expected,stream)
sys.argv=['scripts/verify-contrast-template.py','outline','rectangle','outline']
runpy.run_path(sys.argv[0],run_name='__main__')
