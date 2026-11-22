"""Automation loaded only as an add-on in the temporary Anki test profile."""

import json
import os
import re
import time
import traceback
from pathlib import Path
from unittest.mock import patch

import aqt
from aqt import gui_hooks
from aqt.clayout import CardLayout
from aqt.qt import QDialog, QDialogButtonBox, QEventLoop, QTimer, QT_VERSION_STR
from aqt.theme import Theme, theme_manager

REPORT = Path(os.environ["PIANOREALM_ANKI_TEST_REPORT"])
PACKAGE = Path(os.environ["PIANOREALM_ANKI_TEST_PACKAGE"])


def log(step, **data):
    with REPORT.open("a", encoding="utf-8") as output:
        output.write(json.dumps(dict(step=step, **data)) + "\n")


def pause(ms):
    loop = QEventLoop()
    QTimer.singleShot(ms, loop.quit)
    loop.exec()


def js(view, command):
    result = []
    loop = QEventLoop()
    timer = QTimer()
    timer.setSingleShot(True)
    timer.timeout.connect(loop.quit)
    def done(value):
        result.append(value)
        loop.quit()
    view.page().runJavaScript(command, done)
    if not result:
        timer.start(2000)
        loop.exec()
    timer.stop()
    return result[0] if result else None


def until(view, script, predicate, label):
    deadline = time.monotonic() + 7
    result = None
    while time.monotonic() < deadline:
        result = js(view, script)
        if predicate(result):
            return result
        pause(70)
    log("diagnostic", label=label, html=js(view, "document.body.outerHTML.substring(0,3000)"), result=result)
    raise AssertionError((label, result))

READ = """(() => {
    const card = document.querySelector('.pr-chord-card');
    if (!card) return null;
    const hosts = [...card.querySelectorAll('.pr-keyboard')];
    const ids = [...card.querySelectorAll('svg [id]')].map(n => n.id);
    return {
      card: card.querySelector('.pr-notes').textContent.trim(),
      widths: hosts.map(host => host.clientWidth),
      theme: !!card.closest('.nightMode'),
      status: card.querySelector('.pr-status').textContent,
      ids: ids.length,
      uniqueIds: new Set(ids).size,
      owner: window[Symbol.for('anki-template/pianorealm-chord-card')]?.active.length,
      origin: location.origin,
      roots: hosts.map(host => [...host.querySelectorAll('svg')].map(root => ({
        orientation: root.getAttribute('aria-label').split(' ')[0],
        width: Number(root.getAttribute('width')),
        height: Number(root.getAttribute('height')),
        markers: [...root.querySelectorAll('[data-pressed-indicator]')].reduce((a, m, i) => {
          if (m.getAttribute('display') === 'inline') a.push(Number(root.querySelectorAll('[data-note]')[i].dataset.note));
          return a;
        }, []).sort((a, b) => a - b),
        stops: root.querySelectorAll('linearGradient').length,
        pressedFill: root.querySelector('[data-note][fill="#175d9c"]') !== null ? '#175d9c'
          : root.querySelector('[data-note][fill="#85502b"]') !== null ? '#85502b' : null,
      }))),
    };
})()"""


def check(view, label, chord, markers, sides, dark=False, narrow=False):
    result = until(view, READ, lambda r: r and r["card"] == chord and r.get("owner") == len(sides)
        and len(r["roots"]) == len(sides) and all(len(group) == 1 for group in r["roots"])
        and r["theme"] == dark and all(group[0]["markers"] == markers for group in r["roots"])
        and (not narrow or r["roots"][-1][0]["width"] < 300), label)
    assert result["status"] == "", result
    assert result["ids"] == result["uniqueIds"], result
    for group, side in zip(result["roots"], sides):
        root = group[0]
        assert root["orientation"] == side and root["width"] > 0 and root["height"] > 0, result
        assert root["pressedFill"] == ("#175d9c" if dark else "#85502b"), result
        assert root["stops"] == (0 if dark else 2), result
    if narrow:
        assert result["roots"][-1][0]["width"] < 300, result
    log(label, **result)


def make_deck(mw, title, front, back, css, chords):
    models = mw.col.models
    note_type = models.new("Phase 9 " + title)
    models.add_field(note_type, models.new_field("Chord"))
    template = models.new_template("Card")
    template.update(qfmt=front, afmt=back)
    models.add_template(note_type, template)
    note_type["css"] = css
    models.add(note_type)
    did = mw.col.decks.id("Phase 9 " + title)
    notes = []
    for chord in chords:
        note = mw.col.new_note(note_type)
        note["Chord"] = chord
        mw.col.add_note(note, did)
        notes.append(note)
    return did, notes


def wait(predicate, label):
    deadline = time.monotonic() + 6
    while time.monotonic() < deadline:
        if value := predicate():
            return value
        pause(50)
    raise AssertionError(label)


def visible(mw, cls):
    return next((w for w in mw.app.topLevelWidgets() if isinstance(w, cls) and w.isVisible()), None)


def set_up_note_type(mw, front, back, css):
    from aqt.fields import FieldDialog
    from aqt.models import AddModel, Models

    mw.form.actionNoteTypes.trigger()
    manager = wait(lambda: visible(mw, Models), "Tools -> Manage Note Types")
    wait(lambda: manager.form.modelsList.count() > 0, "built-in types load")
    manager.onAdd()
    picker = wait(lambda: visible(mw, AddModel), "Add note type")
    labels = [picker.dialog.models.item(i).text() for i in range(picker.dialog.models.count())]
    labels = [label.replace("\u2068", "").replace("\u2069", "") for label in labels]
    log("note type choices", labels=labels)
    picker.dialog.models.setCurrentRow(labels.index("Add: Basic"))
    original_on_success = picker.on_success
    def name_note_type(note_type):
        with patch("aqt.models.getText", return_value=("Piano Chord", True)):
            original_on_success(note_type)
    picker.on_success = name_note_type
    picker.accept()
    wait(lambda: any(m.name == "Piano Chord" for m in manager.models), "new note type")
    row = next(i for i, model in enumerate(manager.models) if model.name == "Piano Chord")
    manager.form.modelsList.setCurrentRow(row)
    mid = manager.current_notetype()["id"]
    log("Manage Note Types", menu=mw.form.actionNoteTypes.text(), choice="Add: Basic", name="Piano Chord")
    def edit_fields():
        dialog = visible(mw, FieldDialog)
        assert dialog is not None
        assert dialog.form.fieldList.item(0).text().endswith("Front")
        with patch("aqt.fields.getOnlyText", return_value="Chord"):
            dialog.form.fieldRename.click()
        log("Fields renamed", field=dialog.form.fieldList.item(0).text())
        dialog.form.buttonBox.button(QDialogButtonBox.StandardButton.Save).click()
    QTimer.singleShot(200, edit_fields)
    manager.onFields()
    wait(lambda: mw.col.models.get(mid)["flds"][0]["name"] == "Chord", "field rename")
    manager.onCards()
    layout = wait(lambda: visible(mw, CardLayout), "Cards from Manage Note Types")
    layout.tform.front_button.click()
    layout.tform.edit_area.setPlainText(front)
    layout.tform.back_button.click()
    layout.tform.edit_area.setPlainText(back)
    layout.tform.style_button.click()
    initial_css = layout.tform.edit_area.toPlainText()
    layout.tform.edit_area.setPlainText(initial_css + "\n" + css)
    layout.accept()
    wait(lambda: not visible(mw, CardLayout), "saved template editor")
    manager.reject()
    model = mw.col.models.get(mid)
    assert [f["name"] for f in model["flds"]] == ["Chord", "Back"], model
    assert model["tmpls"][0]["qfmt"].strip() == front.strip() and model["tmpls"][0]["afmt"].strip() == back.strip()
    assert model["css"].endswith(css)
    log("Fields and Cards", fields=[f["name"] for f in model["flds"]], templates_saved=True)
    return model


def add_notes_using_window(mw, model):
    from aqt.addcards_legacy import AddCards
    did = mw.col.decks.id("Piano Chord Test")
    mw.onAddCard()
    add = wait(lambda: visible(mw, AddCards), "Add notes window")
    add.set_note_type(model["id"])
    add.set_deck(did)
    notes = []
    for chord in ["C4 E4 G4", "D4 F4 A4"]:
        example = mw.col.new_note(model)
        example["Chord"] = chord
        add.set_note(example, did)
        pause(350)
        add.add_current_note()
        candidates = wait(lambda: [mw.col.get_note(nid) for nid in add.history if mw.col.get_note(nid)["Chord"] == chord],
            "Add note through Add window")
        note = candidates[0]
        assert note["Back"] == "" and len(note.cards()) == 1, note
        notes.append(note)
        log("Add note", chord=chord, empty_back=True, cards=1)
    add.close()
    pause(250)
    return did, notes


def run():
    mw = aqt.mw
    log("environment", app=aqt.appVersion, qt=QT_VERSION_STR, profile=mw.pm.name)
    assert mw.pm.name == "Guide Test" and mw.col.note_count() == 0, "expected a fresh test profile"
    guide = (PACKAGE / "docs/guides/anki-integration.md").read_text(encoding="utf-8")
    front, back, static_image = re.findall(r"```html\n(.*?)```", guide, re.S)[:3]
    css = re.search(r"```css\n(.*?)```", guide, re.S).group(1)
    media = Path(mw.col.media.dir())
    for filename in ["_pianorealm-keyboard.umd.min.js", "_pianorealm-anki-card.js", "_c-major-horizontal.svg"]:
        assert (media / filename).is_file(), (media, filename)
    checked = []
    gui_hooks.media_check_did_finish.append(checked.append)
    def close_media_report():
        for widget in mw.app.topLevelWidgets():
            if isinstance(widget, QDialog) and widget.isVisible() and "Media" in widget.windowTitle():
                widget.close()
                return
        QTimer.singleShot(60, close_media_report)
    QTimer.singleShot(200, close_media_report)
    mw.form.actionCheckMediaDatabase.trigger()
    media_check = wait(lambda: checked and checked[0], "Tools -> Check Media")
    log("check media", title=mw.form.actionCheckMediaDatabase.text(), report=media_check.report)
    assert not media_check.missing, media_check
    a, b = ("C4 E4 G4", [60, 64, 67]), ("D4 F4 A4", [62, 65, 69])
    model = set_up_note_type(mw, front, back, css)
    did, notes = add_notes_using_window(mw, model)
    svg = (media / "_c-major-horizontal.svg").read_text(encoding="utf-8")
    static_did, _ = make_deck(mw, "Static", "<span hidden>{{text:Chord}}</span>" + static_image,
        "{{text:Chord}}", "", [a[0]])
    inline_did, _ = make_deck(mw, "Inline SVG", "<span hidden>{{text:Chord}}</span>" + svg,
        "{{text:Chord}}", "", [a[0]])
    custom_options = re.search(r"```js\n(.*?)```", guide, re.S).group(1)
    source = (media / "_pianorealm-anki-card.js").read_text(encoding="utf-8")
    customized = "_pianorealm-custom.js"
    (media / customized).write_text(source.replace("container: host,", "container: host,\n" + custom_options), encoding="utf-8")
    custom_did, _ = make_deck(mw, "Customized", front.replace("_pianorealm-anki-card.js", customized),
        back.replace("_pianorealm-anki-card.js", customized), css, [a[0]])
    invalid_did, _ = make_deck(mw, "Invalid", front, back, css, ["C4 E4 H4"])
    mw.pm.set_theme(Theme.LIGHT)
    theme_manager.apply_style()
    pause(300)

    bundle = media / "_pianorealm-keyboard.umd.min.js"
    withheld = bundle.with_suffix(".withheld")
    bundle.rename(withheld)
    try:
        assert "_pianorealm-keyboard.umd.min.js" not in mw.col.media.check().missing
        log("media checker skips missing template-only bundle")
        missing_preview = CardLayout(mw, notes[0])
        missing_preview.pform.preview_front.click()
        missing = until(missing_preview.preview_web, READ, lambda r: r
            and "Missing keyboard media" in r["status"] and r.get("owner") == 0, "missing bundle")
        log("missing bundle diagnostic", status=missing["status"])
        missing_preview.close()
    finally:
        withheld.rename(bundle)
    pause(300)
    preview = CardLayout(mw, notes[0])
    preview.pform.preview_front.click()
    check(preview.preview_web, "template preview front", *a, ["Horizontal"])
    log("webview", userAgent=js(preview.preview_web, "navigator.userAgent"))
    preview.pform.preview_back.click()
    check(preview.preview_web, "template preview back", *a, ["Vertical", "Horizontal"])
    preview.close()
    pause(300)

    def review(deck):
        mw.moveToState("deckBrowser")
        mw.col.decks.select(deck)
        mw.moveToState("overview")
        until(mw.web, "!!document.querySelector('#study')", bool, "Study Now")
        js(mw.web, "document.querySelector('#study').click()")
        return mw.reviewer.web

    web = review(did)
    check(web, "review first front offline", *a, ["Horizontal"])
    js(web, "window.phase9ReviewRealm = true")
    mw.reviewer._showAnswer()
    check(web, "review first back offline", *a, ["Vertical", "Horizontal"])
    mw.reviewer._answerCard(3)
    check(web, "review second front offline", *b, ["Horizontal"])
    assert js(web, "window.phase9ReviewRealm === true")
    mw.reviewer._showAnswer()
    check(web, "review second back offline", *b, ["Vertical", "Horizontal"])
    mw.moveToState("deckBrowser")
    mw.col.undo()
    mw.pm.set_theme(Theme.DARK)
    theme_manager.apply_style()
    pause(250)
    web = review(did)
    check(web, "return to first card in night mode", *a, ["Horizontal"], dark=True)
    js(web, "document.querySelector('.pr-chord-card').style.width = '210px'")
    check(web, "night front at narrow width", *a, ["Horizontal"], dark=True, narrow=True)
    mw.reviewer._showAnswer()
    check(web, "night back", *a, ["Vertical", "Horizontal"], dark=True)
    js(web, "document.querySelector('.pr-chord-card').style.width = '210px'")
    check(web, "night back at narrow width", *a, ["Vertical", "Horizontal"], dark=True, narrow=True)

    web = review(static_did)
    img = until(web, """(() => {const img=document.querySelector('#qa img'); return img && [img.complete, img.naturalWidth, img.naturalHeight, img.getAttribute('alt'), img.src];})()""",
        lambda r: r and r[0] and r[1] == 240 and r[2] == 80, "static media")
    pixel = js(web, """(() => {
        const img = document.querySelector('#qa img');
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return [...ctx.getImageData(120, 73, 1, 1).data];
    })()""")
    assert pixel == [133, 80, 43, 255], pixel
    log("static media offline, scriptless template", image=img, pressedPixel=pixel)
    mw.reviewer._showAnswer()
    until(web, "document.querySelector('#qa')?.textContent.trim()", lambda text: text == a[0], "scriptless chord answer")
    log("scriptless chord answer", chord=a[0])
    web = review(inline_did)
    inline = until(web, """(() => {const root=document.querySelector('#qa svg'); return root && [root.getAttribute('aria-label'), root.querySelectorAll('[data-pressed-indicator][display="inline"]').length, root.querySelectorAll('linearGradient').length];})()""",
        lambda r: r and r[1] == 3 and r[2] == 2, "inline svg")
    log("static inline offline, scriptless template", diagram=inline)
    web = review(custom_did)
    customized = until(web, """(() => {
        const svg = document.querySelector('#qa svg');
        return svg && [svg.querySelectorAll('rect[data-pressed-indicator][display="inline"]').length,
            !!svg.querySelector('[data-layer="labels"] text')];
    })()""", lambda r: r == [3, True], "guide customization")
    log("customization example", square_markers=customized[0], labels=customized[1])
    web = review(invalid_did)
    invalid = until(web, READ, lambda r: r and 'Enter 1' in r["status"] and r.get("owner") == 0, "malformed field")
    log("invalid chord diagnostic", status=invalid["status"])
    log("PASS")


def start():
    try:
        run()
    except Exception:
        log("FAIL", traceback=traceback.format_exc())
    finally:
        aqt.mw.app.quit()

gui_hooks.profile_did_open.append(lambda: QTimer.singleShot(1200, start))
