"""Read-only independent checks of the locale export test artifacts."""
import json
from pathlib import Path
import pdfplumber

root = Path(__file__).resolve().parent.parent / "output/current-locale-exports"
checks = []
for kind in ["sheet", "tiles", "stickers"]:
    with pdfplumber.open(root / f"board-{kind}-en.pdf") as baseline:
        for locale in ["uz", "uz-Cyrl", "ru", "en"]:
            with pdfplumber.open(root / f"board-{kind}-{locale}.pdf") as document:
                assert len(document.pages) == len(baseline.pages)
                body_chars = 0
                for before, after in zip(baseline.pages, document.pages):
                    assert (before.width, before.height) == (after.width, after.height)
                    for field in ["curves", "lines", "rects"]:
                        coordinates = lambda p: [
                            (o["x0"], o["y0"], o["x1"], o["y1"], o.get("pts"))
                            for o in getattr(p, field)
                        ]
                        assert coordinates(before) == coordinates(after), (kind, locale, field)
                    # New locale prose uses Noto; clipped pin labels retain Helvetica.
                    for char in after.chars:
                        if "Noto" in char["fontname"]:
                            body_chars += 1
                            assert 0 <= char["x0"] <= char["x1"] <= after.width + 0.01
                            assert 0 <= char["top"] <= char["bottom"] <= after.height + 0.01
                if locale != "en":
                    assert body_chars > 50, (kind, locale)
                checks.append({"kind": kind, "locale": locale, "pages": len(document.pages),
                               "exact_geometry": True, "localized_body_chars": body_chars,
                               "localized_text_within_page": True})
for locale in ["uz", "uz-Cyrl", "ru", "en"]:
    with pdfplumber.open(root / f"{locale}.pdf") as document:
        assert document.metadata["Subject"].startswith("Sequence SHA-256:")
        text = "\n".join(page.extract_text() or "" for page in document.pages)
        if locale in ["uz-Cyrl", "ru"]:
            assert any("А" <= c <= "я" for c in text)
        checks.append({"kind": "guide", "locale": locale, "pages": len(document.pages),
                       "sequence_metadata": True, "extractable_localized_text": True})
result = {"pdfs": len(checks), "pages": sum(c["pages"] for c in checks), "checks": checks}
(root / "independent-verification.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps({"pdfs": result["pdfs"], "pages": result["pages"], "passed": True}))
