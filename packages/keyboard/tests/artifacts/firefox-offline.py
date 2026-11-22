"""Exercise each built classic script in an offline Firefox with local Anki-style fixtures."""

import json
import re
from pathlib import Path
from shutil import copyfile
import time

from firefox import run_firefox


PACKAGE = Path(__file__).resolve().parents[2]
GUIDE = PACKAGE / "docs/guides/anki-integration.md"
BUNDLES = ("pianorealm-keyboard.umd.js", "pianorealm-keyboard.umd.min.js")


def check_pages(driver, directory):
    session = driver.call("WebDriver:NewSession", capabilities={"alwaysMatch": {}})
    print("Firefox", session["capabilities"]["browserVersion"])
    driver.call("Marionette:SetContext", value="chrome")
    assert driver.evaluate("Services.io.offline = true; return Services.io.offline;")
    driver.call("Marionette:SetContext", value="content")

    guide = GUIDE.read_text(encoding="utf-8")
    front, back = re.findall(r"```html\n(.*?)```", guide, re.DOTALL)[:2]
    card_css = re.search(r"```css\n(.*?)```", guide, re.DOTALL).group(1)
    template = Path(__file__).with_name("offline.html").read_text(encoding="utf-8")
    page = template.replace("__CARD_CSS__", card_css).replace("__FRONT__", json.dumps(front).replace("</", "<\\/"))
    page = page.replace("__BACK__", json.dumps(back).replace("</", "<\\/"))
    for bundle in BUNDLES:
        fixture = directory / bundle
        fixture.mkdir()
        # Serve the artifact under the guide's exact media name, regardless of the build variant.
        copyfile(PACKAGE / "dist" / bundle, fixture / "_pianorealm-keyboard.umd.min.js")
        copyfile(GUIDE.with_name("_pianorealm-anki-card.js"), fixture / "_pianorealm-anki-card.js")
        html = fixture / "offline.html"
        html.write_text(page, encoding="utf-8")
        driver.call("WebDriver:Navigate", url=html.as_uri())
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            result = driver.evaluate("return document.querySelector('#status').textContent;")
            if result != "running":
                assert result == "PASS", result
                print(f"{bundle} PASS (offline, local files, template remount, resize fallback, SVG raster)")
                break
            time.sleep(0.1)
        else:
            raise TimeoutError(f"{bundle}: test did not finish")


if __name__ == "__main__":
    run_firefox(check_pages)
