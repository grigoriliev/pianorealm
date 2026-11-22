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
OFFLINE = r"""
ip link set lo up
ip -br address
interfaces=$(ip -o link show)
ipv4_routes=$(ip route show)
ipv6_default=$(ip -6 route show default)
if [ "$(printf '%s\n' "$interfaces" | wc -l)" -ne 1 ] ||
   [ -n "$ipv4_routes" ] || [ -n "$ipv6_default" ]; then
    echo "Expected an isolated network namespace with only loopback" >&2
    exit 1
fi
exec "$@"
"""


def wait_for_process(command, *, timeout, **options):
    with subprocess.Popen(command, start_new_session=True, **options) as process:
        try:
            return process.wait(timeout=timeout)
        finally:
            # QtWebEngine and other subprocesses inherit the group, even if the launcher exits first.
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass


def seed_profile(release, base, environment):
    base.mkdir()
    seed_env = dict(environment, PYTHONPATH=str(release / "app_packages"))
    status = wait_for_process(
        [release / "python/bin/python3", "-c", SEED_PROFILE, base, PROFILE],
        timeout=30, env=seed_env,
    )
    if status:
        raise RuntimeError(f"Anki profile setup exited with status {status}")


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
    status = wait_for_process(
        ["node", "--input-type=module", "-e", script],
        timeout=30, cwd=PACKAGE, env=environment,
    )
    if status:
        raise RuntimeError(f"Static SVG generation exited with status {status}")


def read_events(evidence):
    events = []
    for index, line in enumerate(evidence.splitlines(), start=1):
        try:
            event = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid Anki report JSON on line {index}: {error.msg}") from error
        if not isinstance(event, dict) or not isinstance(event.get("step"), str):
            raise ValueError(f"Missing Anki report step on line {index}")
        events.append(event)
    return events


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
        with log.open("w", encoding="utf-8") as output:
            try:
                status = wait_for_process(
                    ["unshare", "--map-root-user", "--net", "sh", "-ec", OFFLINE, "anki-offline",
                     str(executable), "-b", str(base), "-p", PROFILE, "-l", "en"],
                    timeout=90, env=desktop_env, stdout=output, stderr=subprocess.STDOUT,
                )
                if status:
                    problem = f"Anki exited with status {status}"
            except subprocess.TimeoutExpired:
                problem = "Anki timed out after 90 seconds"

        evidence = results.read_text(encoding="utf-8") if results.exists() else ""
        report_error = None
        if report is not None and evidence:
            try:
                report.write_text(evidence, encoding="utf-8")
            except OSError as error:
                report_error = f"Could not save the Anki report: {error}"
        try:
            events = read_events(evidence)
        except ValueError as error:
            events = []
            print(error, file=sys.stderr)
            problem = problem or "The Anki report was invalid"
        for event in (event for event in events if event["step"] != "PASS"):
            details = event.get("app") or event.get("userAgent")
            print(f"{event['step']} {details}" if details else event["step"], flush=True)
        if problem or not events or events[-1]["step"] != "PASS" or any(e["step"] == "FAIL" for e in events):
            print(log.read_text(encoding="utf-8"), file=sys.stderr)
            if events:
                failed = next((event for event in events if event["step"] == "FAIL"), events[-1])
                print(json.dumps(failed, indent=2), file=sys.stderr)
            if report_error:
                print(report_error, file=sys.stderr)
            raise RuntimeError(problem or "The clean-profile checklist did not pass")
        if report_error:
            raise RuntimeError(report_error)
        print("PASS", flush=True)


def on_sigterm(signum, _frame):
    raise SystemExit(128 + signum)


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
    signal.signal(signal.SIGTERM, on_sigterm)
    try:
        run(executable, args.report)
    except KeyboardInterrupt:
        parser.exit(130, "Anki test interrupted\n")
    except (OSError, RuntimeError, ValueError, subprocess.TimeoutExpired) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
