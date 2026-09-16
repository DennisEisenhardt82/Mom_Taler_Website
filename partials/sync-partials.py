"""Kopiert partials/header.html und partials/footer.html wortgleich in alle *.html
zwischen die Marker <!-- header:start --> ... <!-- header:end --> (bzw. footer).

Aufruf aus dem Projektstamm:  python partials/sync-partials.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PARTIALS = ROOT / "partials"


def block(name: str) -> str:
    return (PARTIALS / f"{name}.html").read_text(encoding="utf-8").strip()


def sync(page: pathlib.Path) -> bool:
    text = page.read_text(encoding="utf-8")
    original = text
    for name in ("header", "footer"):
        pattern = re.compile(rf"(<!-- {name}:start -->)(.*?)(<!-- {name}:end -->)", re.S)
        if not pattern.search(text):
            print(f"  WARN {page.name}: keine {name}-Marker")
            continue
        text = pattern.sub(lambda m, n=name: f"{m.group(1)}\n{block(n)}\n{m.group(3)}", text)
    if text != original:
        page.write_text(text, encoding="utf-8", newline="\n")
        return True
    return False


def main() -> int:
    changed = 0
    for page in sorted(ROOT.glob("*.html")):
        if sync(page):
            changed += 1
            print(f"  sync {page.name}")
    print(f"{changed} Seite(n) aktualisiert.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
