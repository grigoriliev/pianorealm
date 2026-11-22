"""Exercise each built classic script in an offline Firefox with local Anki-style fixtures."""

import json
import re
from pathlib import Path
from shutil import copyfile
import socket
import subprocess
from tempfile import TemporaryDirectory
import time


PACKAGE = Path(__file__).resolve().parents[2]
GUIDE = PACKAGE / "docs/guides/anki-integration.md"
BUNDLES = ("pianorealm-keyboard.umd.js", "pianorealm-keyboard.umd.min.js")


class Marionette:
    def __init__(self, connection):
        self.connection = connection
        self.stream = connection.makefile("rb")
        self.sequence = 0
        self.receive()

    def receive(self):
        length = bytearray()
        while (byte := self.stream.read(1)) != b":":
            if not byte:
                raise EOFError("Firefox disconnected")
            length.extend(byte)
        return json.loads(self.stream.read(int(length)))

    def call(self, command, **args):
        self.sequence += 1
        body = json.dumps([0, self.sequence, command, args]).encode()
        self.connection.sendall(str(len(body)).encode() + b":" + body)
        _, response, error, result = self.receive()
        assert response == self.sequence
        if error:
            raise RuntimeError(error)
        return result

    def evaluate(self, script):
        return self.call("WebDriver:ExecuteScript", script=script, args=[])["value"]


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


def main():
    with TemporaryDirectory(prefix="pianorealm-firefox-") as temporary:
        directory = Path(temporary)
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        profile = directory / "profile"
        profile.mkdir()
        (profile / "user.js").write_text(
            f'user_pref("marionette.port", {port});\n'
            'user_pref("ui.prefersReducedMotion", 1);\n'
            'user_pref("network.manage-offline-status", false);\n'
            'user_pref("browser.startup.page", 0);\n'
        )
        with (directory / "firefox.log").open("w") as log:
            with subprocess.Popen([
                "firefox", "--headless", "--no-remote", "--marionette",
                "--remote-allow-system-access", "--profile", str(profile),
            ], stdout=log, stderr=subprocess.STDOUT) as process:
                try:
                    deadline = time.monotonic() + 15
                    while True:
                        try:
                            connection = socket.create_connection(("127.0.0.1", port), timeout=3)
                            break
                        except ConnectionRefusedError:
                            if process.poll() is not None or time.monotonic() > deadline:
                                raise
                            time.sleep(0.1)
                    with connection:
                        connection.settimeout(20)
                        check_pages(Marionette(connection), directory)
                finally:
                    process.terminate()


if __name__ == "__main__":
    main()
