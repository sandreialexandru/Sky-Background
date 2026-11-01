"""Bump the version everywhere it is written, and open a new section in CHANGELOG.md.

Run:  python tools/bump_version.py 0.2.0
Then review, commit, and tag:  git tag v0.2.0 && git push origin main --tags
The release workflow checks that manifest.json, const.py and the tag agree.
"""
import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "custom_components" / "sky_background" / "manifest.json"
CONST = ROOT / "custom_components" / "sky_background" / "const.py"
CHANGELOG = ROOT / "CHANGELOG.md"
REPO = "https://github.com/sandreialexandru/Sky-Background"


def main() -> None:
    if len(sys.argv) != 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
        sys.exit("usage: python tools/bump_version.py MAJOR.MINOR.PATCH")
    new = sys.argv[1]

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    old = manifest["version"]
    if new == old:
        sys.exit(f"already at {old}")
    manifest["version"] = new
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")

    const = CONST.read_text(encoding="utf-8")
    const, n = re.subn(r'^VERSION = ".*"$', f'VERSION = "{new}"', const, flags=re.M)
    if n != 1:
        sys.exit("VERSION not found in const.py")
    CONST.write_text(const, encoding="utf-8", newline="\n")

    log = CHANGELOG.read_text(encoding="utf-8")
    today = datetime.date.today().isoformat()
    log = log.replace("## [Unreleased]\n", f"## [Unreleased]\n\n## [{new}] - {today}\n", 1)
    log = re.sub(
        r"^\[Unreleased\]: .*$",
        f"[Unreleased]: {REPO}/compare/v{new}...HEAD\n[{new}]: {REPO}/compare/v{old}...v{new}",
        log,
        count=1,
        flags=re.M,
    )
    CHANGELOG.write_text(log, encoding="utf-8", newline="\n")
    print(f"{old} -> {new}. Fill in the {new} section of CHANGELOG.md, then commit and tag v{new}.")


if __name__ == "__main__":
    main()
