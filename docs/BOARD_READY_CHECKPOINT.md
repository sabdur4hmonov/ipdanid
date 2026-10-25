# Physical first-build pack — 2026-10-25

This milestone prepares the existing physical kit for the owner's first build. It does not accept portrait likeness or complete the broader roadmap. Source composition/classic3/physical rendering and all old guides remain unchanged. Existing previews4194-4214 and owner data are untouched.

## Exact printable geometry

`scripts/export-board-pack.ts` reuses production `standardKitPdf`, profiles, sector ticks and canonical config. New ignored folder `output/board-ready-20261025`, immutable export refusal after manifest. One500x500mm sheet, six real-size A4 tiles, eighteen A4 sector sheets.720distinct holes,240per shape; minimum inter-pattern centre gap3.004948324mm. Circle460mm, Square470mm, Heart actual pin bounds367.041354x348.385498mm; its390mm setting is a nominal envelope, not measured pin-bound width. Physical orientation is front-view/x-right/y-down from board top-left.

PDF footer now distinguishes1.5mm **pin shaft** from a pilot drill diameter, with scrap-material testing. It does not change hole centres or silently specify an untested MDF thickness. Owner Uzbek HTML/doc explains100%printing,50mm calibration,3x2tile assembly/overlap, separateC/S/H patterns, sector page ranges, exact first-step source, same-device rest/offline, material/stock/quality limitations. Export has no photo, password, admin token or kit code.

`scripts/verify-board-pack.py` independently reads all25PDF pages with pdfplumber: dimensions/calibration,720sheet+4320tile+4320sticker pin-centre checks with1e-6mm tolerance, all720sector labels fully visible on at least one overlapping tile/no overlaps, PDFsha256s and physical gap. The three PDFs rendered with Poppler and all25pages visually inspected through contact sheets, plus full sheet/Heart detail. Runtime warns about unavailable unusedSymbol/ArialUnicode display fonts; visible Helvetica labels/geometry render correctly. No font install. Uzbek HTML1280/390screens inspected with no overflow/runtime errors. Evidence `output/board-ready-render` and PDFverification JSON.

## Real normal-flow acceptance

New `board-first-build.spec.ts`: actual gallery JPG upload, choose each of Circle/Square/Heart, generate500px/240pins/3000strands, compare pin IDs/sectors and physical centres to the printed kit, redeem an ordinary `standard-base-r1` code through customer PDF gate, download guide, start at actual first strand/zero confirmation, confirm3, rest, offline reload at step4, confirm4 and verify unchanged sequence hash. Existing phase14assembly test also exercises large taps, wake-lock lifecycle and UZ/RU/EN device-TTS hooks.

First diagnostic4pass/4fail used byte-equal Node/Chrome trigonometric values; Circle/Heart differed only by floating-point ULPs. Final comparison requires exact IDs/labels and physical coordinate error<1e-9mm; measured Circle maximum1.11e-13mm. This is arithmetic tolerance, not movable holes. Final8/8desktop/mobile passed2.1min at4515/API4661. Generation2.646-3.971s.17/17focused core/kit/session tests,TSC,isolated2125module build16.26s pass.

`scripts/verify-board-first-build.py` independently checks all6actual downloaded79-page guides: all18000ordered numeric/sector steps equal saved immutable JSON; all1000px cover RGB bytes equal actual app preview. Physical pins/paused progress checks linked to each export. Initial absentpdftotext binary replaced with existingpdfminer fallback; no install. No real device/winding/calibration claim.

Deliverable archive `output/ip-rasm-yasash-paketi-500mm-20261025.zip`,8explicit allowlisted files, CRC-tested. Includes3PDFs/coordinates/UzbekHTML/manifests; no private assets/credentials. Reproduce on source download: npmci,then `node --import tsx scripts/export-board-pack.ts`. The output is intentionally not committed.

Next: close C21 deployment erasure replay/retention audit and web-critical remaining CODE, retaining portrait quality as an unresolved separate acceptance gate. No more rejected quality parameter sweeps. Full unit/browser/APK/releasePR remains C26.
