"""Independent PDF geometry/print verification; reads only the exported kit pack."""
import hashlib
import json
import math
import re
from pathlib import Path
import pdfplumber

root = Path(__file__).resolve().parent.parent / "output/board-ready-20261025"
data = json.loads((root / "coordinates.json").read_text())
manifest = json.loads((root / "manifest.json").read_text())
mm = 72 / 25.4
holes = data["holes"]
assert len(holes) == 720
assert len({(h["pattern"], h["label"]) for h in holes}) == 720
assert manifest["config"] == data["config"]
assert data["config"]["baseMm"] == 500
for pattern in ["circle", "rectangle", "heart"]:
    selected = [h for h in holes if h["pattern"] == pattern]
    assert len(selected) == 240
    assert {h["label"] for h in selected} == {f"{s}-{i}" for s in "ABCD" for i in range(1, 61)}
minimum = min(math.hypot(a["xMm"]-b["xMm"], a["yMm"]-b["yMm"])
              for i, a in enumerate(holes) for b in holes[:i])
assert minimum >= 3
assert abs(minimum-manifest["minGapMm"]) < 1e-8

results = []
for entry in manifest["files"]:
    path = root / entry["name"]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry["sha256"]
    kind = entry["kind"]
    with pdfplumber.open(path) as doc:
        assert len(doc.pages) == {"sheet": 1, "tiles": 6, "stickers": 18}[kind]
        verified = 0
        for number, page in enumerate(doc.pages):
            assert abs(page.width/mm-(500 if kind == "sheet" else 210)) < 1e-6
            assert abs(page.height/mm-(500 if kind == "sheet" else 297)) < 1e-6
            assert any(abs(line["x1"]-line["x0"]-50*mm) < 1e-6 and
                       abs(line["top"]-line["bottom"]) < 1e-6 and
                       abs(line["linewidth"]-.6) < 1e-6 for line in page.lines)
            if kind == "sheet":
                assert "pin shaft 1.5 mm" in page.extract_text()
                assert "test pilot size on scrap" in page.extract_text()
            expected = holes if kind != "stickers" else [h for h in holes if h["pattern"] == ["circle", "rectangle", "heart"][number//6]]
            curves = page.curves
            assert len(curves) == len(expected)
            col, row = (0, 0) if kind == "sheet" else (number%3, (number%6)//3)
            for hole, curve in zip(expected, curves):
                x = (curve["x0"]+curve["x1"])/(2*mm)
                y = (curve["top"]+curve["bottom"])/(2*mm)
                assert abs(x-((0 if kind == "sheet" else 10)+hole["xMm"]-180*col)) < 1e-6
                assert abs(y-((0 if kind == "sheet" else 25)+hole["yMm"]-247*row)) < 1e-6
                assert abs(curve["width"]/mm-(1.5 if kind != "stickers" else .7)) < 1e-6
                verified += 1
        if kind == "stickers":
            for pattern in range(3):
                page = doc.pages[pattern*6]
                words = [w for w in page.extract_words(x_tolerance=.5) if re.fullmatch("[A-Z]-[0-9]+", w["text"])]
                assert len(words) == 240
                by_label = {w["text"]: w for w in words}
                for j, mark in enumerate(data["stickers"][pattern]["marks"]):
                    w = by_label[mark["label"]]
                    distance = 8.5 if j%2 else 5
                    assert abs((w["x0"]+w["x1"])/2-(10+mark["xMm"]+mark["nx"]*distance)*mm) < .01
                    assert any(10*mm <= w["x0"]-(tile%3)*180*mm and w["x1"]-(tile%3)*180*mm <= 200*mm and
                               25*mm <= w["top"]-(tile//3)*247*mm and w["bottom"]-(tile//3)*247*mm <= 282*mm for tile in range(6))
                for j,a in enumerate(words):
                    for b in words[:j]:
                        assert min(a["x1"], b["x1"]) <= max(a["x0"], b["x0"]) or min(a["bottom"], b["bottom"]) <= max(a["top"], b["top"])
        results.append({"name":entry["name"],"pages":len(doc.pages),"calibrationMm":50,"pinCentreChecks":verified,"labelOverlap":0 if kind=="stickers" else None})
report = {"minimumHoleGapMm":minimum,"uniqueHoles":720,"results":results}
(root / "pdf-verification.json").write_text(json.dumps(report,indent=2))
print(json.dumps(report))
