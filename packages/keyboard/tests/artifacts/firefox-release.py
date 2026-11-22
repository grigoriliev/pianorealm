"""Check built visual fixtures and the live playground in Firefox."""

import argparse
from base64 import b64decode
from pathlib import Path
from shutil import copyfile
import socket
import subprocess
import time
from urllib.request import urlopen

from firefox import run_firefox


FIXTURES = Path(__file__).resolve().parent
PACKAGE = FIXTURES.parents[1]
BASELINES = FIXTURES / "visual-baselines"


def until(check, label):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        result = check()
        if result:
            return result
        time.sleep(0.1)
    raise AssertionError(label)


def accessible(driver, selector, role, label):
    element = driver.call("WebDriver:FindElement", using="css selector", value=selector)["value"]
    element_id = element["element-6066-11e4-a52e-4f735466cecf"]
    actual_role = driver.call("WebDriver:GetComputedRole", id=element_id)["value"]
    actual_label = driver.call("WebDriver:GetComputedLabel", id=element_id)["value"]
    expected_roles = ("img", "image") if role == "img" else (role,)
    assert actual_role in expected_roles and actual_label == label, (selector, actual_role, actual_label)


def check_visual(driver, directory, update, output):
    fixture = directory / "visual.html"
    for path in (FIXTURES / "visual.html", FIXTURES / "visual.js",
                 PACKAGE / "dist/pianorealm-keyboard.umd.min.js"):
        copyfile(path, directory / path.name)
    driver.call("Marionette:SetContext", value="chrome")
    assert driver.evaluate("Services.io.offline = true; return Services.io.offline;")
    driver.call("Marionette:SetContext", value="content")
    check_visual_matrix(driver, fixture.as_uri(), "firefox", "Minimal · both", update, output)
    check_visual_matrix(driver, fixture.as_uri() + "?realistic", "firefox-realistic", "Classic · C3–C5", update, output)
    driver.call("Marionette:SetContext", value="chrome")
    assert driver.evaluate("Services.io.offline = false; return !Services.io.offline;")
    driver.call("Marionette:SetContext", value="content")


def check_visual_matrix(driver, url, name_prefix, first_label, update, output):
    for width, height in ((956, 544), (500, 1100)):
        driver.call("WebDriver:SetWindowRect", width=width, height=height)
        driver.call("WebDriver:Navigate", url=url)
        until(lambda: driver.evaluate("""
            return window.visualFixture?.every(({img}) => img.complete && img.naturalWidth > 0);
        """), "visual fixture or SVG images failed to load")
        assert driver.evaluate("""
            const items = window.visualFixture;
            const ids = [...document.querySelectorAll('svg [id]')].map(el => el.id);
            if (ids.length !== new Set(ids).size) return false;
            return items.every(({piano, container, markup, count}) => {
                const svg = container.querySelector('svg');
                const staticSvg = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
                const description = svg.querySelector('desc');
                const box = svg.getScreenCTM();
                const blackKey = svg.querySelector('[data-note="54"]');
                const center = new DOMPoint(
                    Number(blackKey.getAttribute('x')) + Number(blackKey.getAttribute('width')) / 2,
                    Number(blackKey.getAttribute('y')) + Number(blackKey.getAttribute('height')) / 2,
                ).matrixTransform(box);
                return svg.getAttribute('role') === 'img'
                    && svg.getAttribute('aria-label') === staticSvg.getAttribute('aria-label')
                    && svg.getAttribute('aria-describedby') === (description?.id ?? null)
                    && staticSvg.getAttribute('aria-describedby') === (staticSvg.querySelector('desc')?.id ?? null)
                    && !svg.querySelector('[tabindex], [role="button"]')
                    && svg.querySelectorAll('[data-note]').length === count
                    && svg.getAttribute('viewBox') === staticSvg.getAttribute('viewBox')
                    && piano.getNoteAtPoint(center.x, center.y) === 54;
            });
        """), "visual fixture structure, accessible metadata, or hit testing failed"
        accessible(driver, ".mounted svg", "img", first_label)
        accessible(driver, ".pair img", "img", first_label)
        screenshot = driver.call("WebDriver:TakeScreenshot", full=True)["value"]
        name = f"{name_prefix}-{width}.png"
        image = b64decode(screenshot)
        destination = output / name
        destination.write_bytes(image)
        baseline = BASELINES / name
        if update:
            baseline.parent.mkdir(parents=True, exist_ok=True)
            baseline.write_bytes(image)
        else:
            assert baseline.read_bytes() == image, f"Screenshot differs. Inspect {destination} against {baseline}"
        print(f"{name} PASS ({'baseline updated' if update else 'baseline match'})")


def check_playground(driver, directory):
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    url = f"http://127.0.0.1:{port}/demo/"
    with (directory / "vite.log").open("w+") as log:
        with subprocess.Popen(
            ["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1",
             "--strictPort", "--port", str(port)],
            cwd=PACKAGE, stdout=log, stderr=subprocess.STDOUT,
        ) as server:
            try:
                def ready():
                    try:
                        with urlopen(url, timeout=1) as response:
                            return response.status == 200
                    except OSError:
                        return False

                until(ready, "Vite did not start")
                driver.call("WebDriver:SetWindowRect", width=500, height=900)
                driver.call("WebDriver:Navigate", url=url)
                until(lambda: driver.evaluate("return !!document.querySelector('#horizontal svg');"),
                      "playground did not render")
                accessible(driver, "#notes", "textbox", "Pressed notes")
                accessible(driver, "#highlight-chord", "button", "C major")
                assert driver.evaluate("""
                    const get = id => document.getElementById(id);
                    const choose = (id, value) => {
                        get(id).value = value;
                        get(id).dispatchEvent(new Event('change', {bubbles: true}));
                    };
                    const click = id => get(id).click();
                    window.playgroundErrors = [];
                    window.addEventListener('error', event => playgroundErrors.push(event.message));
                    window.addEventListener('unhandledrejection', event => playgroundErrors.push(String(event.reason)));
                    const root = () => document.querySelector('#horizontal svg');
                    const active = () => root().querySelectorAll('[data-pressed-indicator][display="inline"]').length;
                    const require = (condition, label) => { if (!condition) throw Error(label) };
                    const formError = () => get('error').textContent;
                    require(document.querySelectorAll('.keyboard-host svg').length === 3, 'reference mounts');
                    const viewport = document.documentElement;
                    require(viewport.scrollWidth <= viewport.clientWidth,
                        'narrow page overflow: ' + viewport.scrollWidth + ' vs ' + viewport.clientWidth);
                    click('highlight-chord');
                    require(active() === 3, 'C major preset');
                    click('highlight-f-sharp-minor');
                    require(active() === 3, 'F sharp minor preset');
                    choose('notes', 'C4 128');
                    require(formError() && get('notes').getAttribute('aria-invalid') === 'true', 'invalid note message');
                    require(active() === 3 && get('example').value.includes('[\\n  54,'), 'bad input changed state');
                    choose('notes', 'C4, 60, 61');
                    require(active() === 2 && !formError(), 'valid deduplicated note selection');
                    choose('range', 'partial');
                    choose('orientation', 'vertical');
                    choose('skin', 'realistic');
                    choose('sizing', 'fixed');
                    choose('width', '120');
                    choose('height', '180');
                    choose('label-mode', 'note');
                    choose('pressed-mode', 'indicator');
                    choose('indicator-shape', 'square');
                    click('show-annotations');
                    click('hide-borders');
                    click('animate-highlights');
                    choose('duration', '170');
                    require(root().querySelectorAll('[data-note]').length === 10, 'black endpoint range');
                    require(root().getAttribute('aria-label').startsWith('Vertical'), 'orientation');
                    require(root().getAttribute('height') === '180', 'fixed sizing');
                    require(root().querySelector('[data-note="60"]').getAttribute('stroke-width') === '0', 'appearance');
                    require(root().querySelector('rect[data-pressed-indicator][display="inline"]'), 'square indicator');
                    require(root().querySelector('[data-layer="overlays"]'), 'annotations');
                    require(root().querySelector('[data-key-edge]'), 'Realistic finish');
                    require(get('example').value.includes('"duration": 170'), 'mounted motion snippet');
                    choose('example-api', 'static');
                    const example = get('example').value;
                    require(example.includes('"skin": "realistic"') && example.includes('"height": 180')
                        && !example.includes('animation'), 'static config');
                    const exampleScript = document.createElement('script');
                    exampleScript.type = 'module';
                    exampleScript.textContent = example.replace('@pianorealm/keyboard', '/src/index.ts')
                        + '\\n document.documentElement.dataset.exampleSvg = svg;';
                    document.body.append(exampleScript);
                    choose('sizing', 'container');
                    require(get('width').disabled && !formError(), 'container sizing reset');
                    click('clear-highlights');
                    require(active() === 0, 'clear pressed notes');
                    window.downloads = [];
                    const original = URL.createObjectURL;
                    URL.createObjectURL = blob => { downloads.push(blob.text()); return original(blob); };
                    HTMLAnchorElement.prototype.click = function () {};
                    document.querySelector('#horizontal button').click();
                    document.querySelector('#horizontal button').click();
                    return true;
                """)
                until(lambda: driver.evaluate("return !!document.documentElement.dataset.exampleSvg;"),
                      "generated static example did not run")
                assert driver.call("WebDriver:ExecuteAsyncScript", args=[], script="""
                    const done = arguments[arguments.length - 1];
                    Promise.all(window.downloads).then(values => {
                        const parser = new DOMParser();
                        const roots = values.map(xml => parser.parseFromString(xml, 'image/svg+xml').documentElement);
                        const sample = parser.parseFromString(
                            document.documentElement.dataset.exampleSvg, 'image/svg+xml').documentElement;
                        done(window.playgroundErrors.length === 0
                            && sample.getAttribute('height') === '180'
                            && sample.querySelectorAll('[data-pressed-indicator][display="inline"]').length === 2
                            && roots.length === 2 && roots.every(root => root.localName === 'svg'
                            && root.getAttribute('width') === document.querySelector('#horizontal svg').getAttribute('width')
                            && root.querySelector('[data-layer="overlays"]')
                            && !root.querySelector('[data-pressed-indicator][display="inline"]'))
                            && roots[0].querySelector('[id]').id !== roots[1].querySelector('[id]').id);
                    }).catch(() => done(false));
                """)["value"], "downloaded static SVG did not match the preview"
                print("Playground PASS (narrow viewport, controls, validation, code, static download)")
            finally:
                if server.poll() is None:
                    server.terminate()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="directory for current Firefox captures")
    parser.add_argument("--update-baselines", action="store_true", help="explicitly overwrite tracked PNGs")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    def check(driver, directory):
        session = driver.call("WebDriver:NewSession", capabilities={"alwaysMatch": {}})
        print("Firefox", session["capabilities"]["browserVersion"])
        driver.call("WebDriver:SetTimeouts", script=12000)
        check_visual(driver, directory, args.update_baselines, args.output)
        check_playground(driver, directory)

    run_firefox(check)


if __name__ == "__main__":
    main()
