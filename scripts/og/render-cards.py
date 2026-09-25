"""Render the Horizonte social cards (1200x630 JPEG) in a running Chrome.

Needs: the site dev server on http://127.0.0.1:4330, Chrome with remote
debugging on port 9333, and the agent-browser CLI. See scripts/og/README.md.
"""
import json
import os
import shutil
import subprocess
import urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SITE_PUBLIC = os.path.join(ROOT, "apps", "site", "public")
STAGE = os.path.join(SITE_PUBLIC, "__og")
OUT = os.path.join(SITE_PUBLIC, "images", "social")
PNPM = os.path.join(ROOT, "node_modules", ".pnpm")
FONTS = {
    "spectral-latin-300-normal.woff2": "@fontsource+spectral@5.3.0/node_modules/@fontsource/spectral/files",
    "spectral-latin-300-italic.woff2": "@fontsource+spectral@5.3.0/node_modules/@fontsource/spectral/files",
    "jost-latin-wght-normal.woff2": "@fontsource-variable+jost@5.3.0/node_modules/@fontsource-variable/jost/files",
}


def ab(*args):
    return subprocess.run(["agent-browser", *args], capture_output=True, text=True).stdout


def main():
    os.makedirs(os.path.join(STAGE, "fonts"), exist_ok=True)
    shutil.copy(os.path.join(os.path.dirname(__file__), "og-card.html"), os.path.join(STAGE, "card.html"))
    for name, folder in FONTS.items():
        shutil.copy(os.path.join(PNPM, folder, name), os.path.join(STAGE, "fonts", name))
    cards = json.load(open(os.path.join(os.path.dirname(__file__), "cards.json")))
    ab("connect", "9333")
    ab("set", "viewport", "1200", "630")
    try:
        for key, card in cards.items():
            for locale in ("es", "en"):
                params = {k: card[k] for k in ("img", "size", "fx", "fy", "zoom", "tint")}
                params.update(card[locale])
                params["lang"] = locale
                url = "http://127.0.0.1:4330/__og/card.html?" + urllib.parse.urlencode(params)
                ab("open", url)
                ab("wait", "[data-ready]")
                ab("wait", "400")
                png = os.path.join(STAGE, f"card-{key}-{locale}.png")
                ab("screenshot", png)
                jpg = os.path.join(OUT, f"card-{key}-{locale}.jpg")
                subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "88", png, "--out", jpg], check=True, capture_output=True)
                print(key, locale, os.path.getsize(jpg) // 1024, "KB")
    finally:
        shutil.rmtree(STAGE)


if __name__ == "__main__":
    main()
