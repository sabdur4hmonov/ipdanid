"""Independently verify all ordered steps and physical cover pixels from real UI downloads."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from pypdf import PdfReader
from PIL import Image
from pdfminer.high_level import extract_text

parser=argparse.ArgumentParser()
parser.add_argument("--pdftotext")
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent/"output/board-first-build"
rows=[]
for path in sorted(root.glob("*/*/guide.pdf")):
    case=path.parent
    guide=json.loads((case/"guide.json").read_text())
    checks=json.loads((case/"checks.json").read_text())
    reader=PdfReader(path)
    cover=list(reader.pages[0].images)
    assert len(cover)==1
    actual=cover[0].image.convert("RGB")
    expected=Image.open(case/"app.png").convert("RGB")
    assert actual.size==expected.size==(1000,1000)
    assert actual.tobytes()==expected.tobytes()
    text=(subprocess.run([args.pdftotext,"-layout",str(path),"-"],check=True,capture_output=True,text=True,encoding="utf-8").stdout if args.pdftotext else extract_text(str(path)))
    steps=re.findall(r"(\d+)\.\s+([A-Z]-\d+)\s+\[(\d+)\]\s+->\s+([A-Z]-\d+)\s+\[(\d+)\]",text)
    expected_steps=[]
    for segment in guide["segments"]:
        for a,b in zip(segment["path"],segment["path"][1:]):
            expected_steps.append((str(len(expected_steps)+1),guide["profile"]["pins"][a]["sectorLabel"],str(a),guide["profile"]["pins"][b]["sectorLabel"],str(b)))
    assert len(steps)==3000
    assert steps==expected_steps
    assert guide["metrics"]["lines"]==3000
    assert checks["pinCoordinatesEqualPrintedTemplate"]
    assert checks["confirmedAfterResume"]==4
    rows.append({"case":str(case.relative_to(root)),"pages":len(reader.pages),"orderedSteps":len(steps),"coverExact":True,"physicalPinsMatchPrint":True,"offlineRestResume":True,"generationMs":checks["generationMs"],"coverRgbSha256":hashlib.sha256(actual.tobytes()).hexdigest()})
assert len(rows)==6,f"Expected all3shapes/2viewports, found{len(rows)}"
(root/"pdf-verification.json").write_text(json.dumps(rows,indent=2))
print(json.dumps(rows))
