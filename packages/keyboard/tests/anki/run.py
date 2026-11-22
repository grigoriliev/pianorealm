"""Run the Anki guide against an extracted official Linux Desktop release."""

import argparse
import json
import os
import re
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile

PACKAGE = Path(__file__).resolve().parents[2]
GUIDE = PACKAGE / "docs/guides/anki-integration.md"
PROFILE = "Guide Test"
BUNDLE = "pianorealm-keyboard.umd.min.js"
HELPER = "_pianorealm-anki-card.js"

SEED_PROFILE = """
from pathlib import Path
import sys

from anki import lang
from aqt.profiles import ProfileManager, VideoDriver

lang.set_lang("en")
base, name = sys.argv[1:]
manager = ProfileManager(Path(base))
manager.setupMeta()
manager.create(name)
manager.meta.update(defaultLang="en", firstRun=False, updates=False)
manager.openProfile(name)
manager.profile.update(autoSync=False, syncMedia=False)
manager.set_video_driver(VideoDriver.Software)
manager.save()
"""

# Anki serves its review content on loopback. Bring up only that interface.
OFFLINE = """
ip link set lo up
ip -br address
test "$(ip -o link show | wc -l)" -eq 1
test -z "$(ip route show)"
test -z "$(ip -6 route show default)"
exec "$@"
"""


def seed_profile(release, base, environment):
    base.mkdir()
    seed_env = dict(environment, PYTHONPATH=str(release / "app_packages"))
    subprocess.run(
        [release / "python/bin/python3", "-c", SEED_PROFILE, base, PROFILE],
        check=True, env=seed_env,
    )


def stage_media(media, environment):
    media.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(PACKAGE / "dist" / BUNDLE, media / ("_" + BUNDLE))
    shutil.copyfile(GUIDE.with_name(HELPER), media / HELPER)
    guide = GUIDE.read_text(encoding="utf-8")
    example = re.search(r"node --input-type=module <<'JS'\n(.*?)\nJS\n", guide, re.S)
    if not example:
        raise ValueError("The guide's static SVG Node example is missing")
    # Resolve the package from its built directory, then write the sample into the test profile.
    script = f"process.chdir({json.dumps(str(media))});\n" + example[1]
    subprocess.run(
        ["node", "--input-type=module", "-e", script],
        check=True, cwd=PACKAGE, env=environment,
    )


def run(executable, report):
    with tempfile.TemporaryDirectory(prefix="pianorealm-anki-") as temporary:
        root = Path(temporary)
        base = root / "profile"
        temp = root / "tmp"
        temp.mkdir()
        results = root / "results.jsonl"
        environment = dict(
            os.environ,
            TMPDIR=str(temp),
            PIANOREALM_ANKI_TEST_PACKAGE=str(PACKAGE),
            PIANOREALM_ANKI_TEST_REPORT=str(results),
        )
        environment.pop("PYTHONOPTIMIZE", None)  # Keep the add-on's assertions active.
        seed_profile(executable.parent, base, environment)
        stage_media(base / PROFILE / "collection.media", environment)
        addon = base / "addons21/keyboard_guide_test"
        addon.mkdir(parents=True)
        shutil.copyfile(Path(__file__).with_name("guide_addon.py"), addon / "__init__.py")

        desktop_env = dict(environment, QT_QPA_PLATFORM="offscreen", QT_QUICK_BACKEND="software")
        # The namespace maps the current user to root. QtWebEngine needs this setting for that launch.
        desktop_env["QTWEBENGINE_DISABLE_SANDBOX"] = "1"
        log = root / "anki.log"
        problem = None
        with log.open("w", encoding="utf-8") as output, subprocess.Popen(
            ["unshare", "--map-root-user", "--net", "sh", "-ec", OFFLINE, "anki-offline",
             str(executable), "-b", str(base), "-p", PROFILE, "-l", "en"],
            env=desktop_env, stdout=output, stderr=subprocess.STDOUT, start_new_session=True,
        ) as desktop:
            try:
                status = desktop.wait(timeout=90)
                if status:
                    problem = f"Anki exited with status {status}"
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(desktop.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                problem = "Anki timed out after 90 seconds"

        evidence = results.read_text(encoding="utf-8") if results.exists() else ""
        if report is not None and evidence:
            report.write_text(evidence, encoding="utf-8")
        events = [json.loads(line) for line in evidence.splitlines()]
        for event in events:
            details = event.get("app") or event.get("userAgent")
            print(" ".join((event["step"], details)) if details else event["step"], flush=True)
        if problem or not events or events[-1]["step"] != "PASS":
            print(log.read_text(encoding="utf-8"), file=sys.stderr)
            if events:
                print(json.dumps(events[-1], indent=2), file=sys.stderr)
            raise RuntimeError(problem or "The clean-profile checklist did not pass")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--anki", required=True, type=Path, help="path to the extracted anki executable")
    parser.add_argument("--report", type=Path, help="save the WebView assertions as a JSONL file")
    args = parser.parse_args()
    executable = args.anki.resolve()
    if not sys.platform.startswith("linux"):
        parser.error("the isolated test runner currently requires Linux")
    for command in ("unshare", "ip", "node"):
        if not shutil.which(command):
            parser.error(f"{command} is required on PATH")
    if not (executable.is_file() and os.access(executable, os.X_OK)
            and (executable.parent / "python/bin/python3").is_file()
            and (executable.parent / "app_packages/aqt").is_dir()):
        parser.error("--anki must point to an official extracted Linux release with bundled Python")
    if not (PACKAGE / "dist" / BUNDLE).is_file():
        parser.error("run npm run build from packages/keyboard first")
    try:
        run(executable, args.report)
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
