"""Headless Firefox driver shared by the offline and release exercises."""

import json
from pathlib import Path
import socket
import subprocess
from tempfile import TemporaryDirectory
import time


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


def run_firefox(check):
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
                        check(Marionette(connection), directory)
                finally:
                    process.terminate()
