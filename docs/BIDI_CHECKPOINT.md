# Mixed lettering, Phase15 C02

New `shapeText` resolves Unicode bidirectional levels, visual run ordering and mirrored punctuation with pinned MIT bidi-js1.0.3 (Unicode13 implementation). It then passes each logical run, script and explicit direction to the existing pinned OpenType fontkit shaper. Noto Sans covers Latin/Cyrillic/common punctuation; Noto Naskh Arabic covers Arabic letters/marks/numerals. Metrics share an em-normalized coordinate system. Numbers retain LTR glyph order even inside an RTL paragraph. Logical Arabic strings are never manually reversed.

Existing `shapeLettering`, thread-lettering/1 and issued caption1 guides retain their old contracts. New mixed/Arabic geometry has shaped-bidi-paths/2, thread-lettering/2 and explicit per-run font/glyph/direction provenance; caption2 independently selects the new shaping. All actual contours enter the same target or continuous custom-outline sequence. The ordinary standard-kit lettering path uses the actual rendered pixels as its immutable source; it does not claim custom-outline metadata. Outline templates preserve the existing physical pin-spacing guard and reject infeasible typography/count/size combinations.

Initial regression caught unsupported RTL punctuation assigned to the Arabic-only font and an infeasible120-pin mixed outline. Common punctuation now uses the pinned Sans font; a legal48-pin fixture passes the unchanged1.8mm minimum, rather than relaxing that guard.23 focused tests passed, including actual mixed-target rasters, unreversed Arabic numerals, canonical metadata tamper refusal, one continuous mixed outline, old single-script geometry and three previously issued caption1 guides. Desktop/mobile ordinary/caption/Expert/old export tests are recorded in PROGRESS as they finish.

This is not a claim of Unicode18 conformance or physical text readability. Unsupported glyphs/controls/oversized strings fail explicitly. Both dependency licenses are bundled and precached offline.

Sources: [Unicode UAX9](https://www.unicode.org/reports/tr9/), [bidi-js upstream implementation/license/conformance](https://github.com/lojjic/bidi-js), [fontkit glyph layout](https://github.com/foliojs/fontkit). The installed @pdf-lib/fontkit runtime's five layout arguments were inspected locally; its declarations omit script/language/direction, so a narrowly typed runtime adapter is used.


Final C02 UI: initial16-case run14pass/2newfixtureselectorfail; corrected accessible combobox selector,2/2fresh repair pass23.8s, strict16latest passed in output/phase15/bidi-browser-summary.json. TypeScript/build1990 passed31.39s. Actual Heart prepared target visually confirms correct٢٠٢٦; physical thread legibility remains separate. No old served assets/API/data used.
