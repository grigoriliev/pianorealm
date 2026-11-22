# Use `@pianorealm/keyboard` in Anki

Build the keyboard package, then copy the minified classic script and the [card helper](_pianorealm-anki-card.js) into a test profile. The examples use trusted note data and render locally in a WebView with SVG, ES2022 JavaScript and local script loading. Start with the static image workflow if your review client restricts template JavaScript or local script loading. The Anki manual describes persistent review pages and warns that template JavaScript can behave differently across clients. [Anki manual on template JavaScript](https://docs.ankiweb.net/manual/templates/styling#javascript)

## Prepare the media and note type

In Anki Desktop, use **File → Switch Profile** to add and open a test profile. Open the profile once so Anki creates its collection and media directory. Find the profile directory using the manual's instructions for your OS. [Anki profile and file locations](https://docs.ankiweb.net/manual/files)

Run these commands from `packages/keyboard` in a POSIX shell with Node 22.12+ in the 22.x line or Node 24.x and npm. Replace the sample path with the absolute path of the test profile's `collection.media` directory.

```sh
npm ci
npm run build
anki_media='/absolute/path/to/test profile/collection.media'
cp dist/pianorealm-keyboard.umd.min.js "$anki_media/_pianorealm-keyboard.umd.min.js"
cp docs/guides/_pianorealm-anki-card.js "$anki_media/_pianorealm-anki-card.js"
```

Copy actual files, keeping the exact names and leading underscores. Run **Tools → Check Media** after copying, then confirm both files are present in `collection.media`. The media checker skips references that appear only in templates, so a clean report can also appear when a required script is missing. Let media synchronization finish before testing on another device. [Anki media handling](https://docs.ankiweb.net/manual/media) · [Media synchronization](https://docs.ankiweb.net/manual/syncing.html)

1. Open **Tools → Manage Note Types → Add**. Choose **Add: Basic** and name the new type **Piano Chord**. Select **Piano Chord**, open **Fields**, rename **Front** to **Chord**, and click **Save**.
2. In **Manage Note Types**, keep **Piano Chord** selected and open **Cards**. Replace the front and back templates with the examples below, append the CSS to **Styling**, and click **Save**. The back template defines its own card content, so paste it as a complete replacement.
3. In **Add**, select **Piano Chord** and a test deck. Add a note with `C4 E4 G4` in **Chord**, then add another with `D4 F4 A4`. Leave the **Back** field empty for both notes. Open **Cards** from a populated note to preview real chord data, then select the deck and click **Study Now**. Expect one horizontal keyboard on the question and two keyboards on the answer, each marking that note's three pitches. [Anki card templates and preview](https://docs.ankiweb.net/manual/templates/intro)

Use plain note names or MIDI numbers separated by spaces or commas. `60, 64, 67` is equivalent to `C4 E4 G4` with the default notation. Keep pitches in C3–C5 to see them all in the examples. The helper reads `textContent` from the element populated by Anki's `text:` filter, checks the token grammar, and passes the notes to the public API. Keep the field to trusted plain note data. For generated decks, validate the note tokens before import and HTML-escape text crossing into the template. Keep field substitutions out of script strings, event attributes and media URLs. [Anki field replacement and formatting](https://docs.ankiweb.net/manual/templates/fields)

## Front Template

The front displays the chord horizontally for identification.

```html
<section class="pr-chord-card" data-theme="auto">
  <p>Name this chord.</p>
  <span class="pr-notes" hidden>{{text:Chord}}</span>
  <div class="pr-keyboard" data-orientation="horizontal"></div>
  <p class="pr-status" role="status"></p>
</section>
<script src="_pianorealm-anki-card.js"></script>
```

## Back Template

The back shows the answer with two independent keyboards. The vertical one uses fixed sizing. Both show the chord. These templates each define their own content so the answer can initialize once when it replaces the question.

```html
<section class="pr-chord-card" data-theme="auto">
  <p>Chord notes <strong class="pr-notes">{{text:Chord}}</strong></p>
  <div class="pr-keyboard" data-orientation="vertical"></div>
  <div class="pr-keyboard" data-orientation="horizontal"></div>
  <p class="pr-status" role="status"></p>
</section>
<script src="_pianorealm-anki-card.js"></script>
```

## Styling

Append this CSS in the note type's **Styling** tab.

```css
.pr-chord-card .pr-keyboard {
  margin: 0.5rem auto;
}
.pr-chord-card .pr-keyboard[data-orientation="horizontal"] {
  width: 100%;
  max-width: 300px;
  height: 100px;
}
.pr-chord-card .pr-keyboard[data-orientation="vertical"] {
  width: 92px;
}
.pr-chord-card .pr-status:empty {
  display: none;
}
```

The helper loads the minified script from local media and calls `destroy()` on the previous card's owned instances before mounting. Its ownership key is shared by this example's front and back across evaluations of the helper. Use a distinct ownership key and root class if adapting the helper for independently active templates in the same page. Keep each keyboard in its own child container. Mounted definition IDs are assigned by the library. If a host offers a card-exit callback, destroy the owned instances there as well. Hosts without an exit callback release the previous card's instances on the next initialization or when the review page is discarded.

The horizontal example needs a nonzero content box. With `ResizeObserver`, a keyboard mounted while hidden can recover when shown. Otherwise call the instance's `resize()` after the host becomes visible or changes size. For example, a host that controls the reveal can call `resize()` on each owned instance after showing the card. Fixed sizing is an option when the host lacks observation or a reveal callback. Compact diagrams are easier to read with a shorter range and the default shape indicator. Provide meaningful note names in accompanying text when they are part of the answer.

Night mode is chosen in the template helper. It uses the documented `.nightMode` ancestor convention for `data-theme="auto"` and selects Minimal with inline appearance overrides on a dark card. Set `data-theme="dark"` or `data-theme="light"` explicitly if a client's theme indicator differs. The library supplies SVG paint, gradients and markers locally and scopes its transition CSS to each mount. Keep broad card rules for `svg`, `rect` and `text` away from the mounts if those rules override SVG presentation attributes. Animation is disabled in these templates. [Anki night-mode styling](https://docs.ankiweb.net/manual/templates/styling#night-mode)

## Customize your deck

Edit the helper in your source checkout and copy your edited file into the test profile. The two templates load the same helper, so changes to its constructor options apply to both sides.

For example, add these properties to the `new Keyboard({ ... })` options in the helper to show note names and use square pressed markers:

```js
labels: { mode: 'note' },
indicator: { shape: 'square' },
pressedMode: 'both',
```

Change `range` in the same options object to display a different span. For a compact card, try `{ from: 'C4', to: 'C5' }` and review both sides to confirm the chord fits. To remove a keyboard from the answer, remove its corresponding `.pr-keyboard` element from the back template. For an extra keyboard, add another host element and give it its own `data-orientation` value.

If you write your own helper, the bundle exposes the constructor as `Pianorealm.Keyboard`. Create a keyboard after the host element is present and the script has loaded. Use `piano.setPressedKeys(notes)` to replace the selection on an existing instance, `piano.setOptions(patch)` to update its display, and `piano.destroy()` before reusing the host for a new instance. Treat the current card as the owner of its keyboard instances. If initialization awaits script loading, check that the card is still current before mounting. The example helper uses a fresh token on each initialization for this check. [Keyboard API and configuration](../../README.md#mount-a-keyboard)

## Static SVG media

Generate a diagram from the built package directory using the same `anki_media` setting as above.

```sh
node --input-type=module <<'JS'
import { writeFileSync } from 'node:fs';
import { PianoKeyboard } from '@pianorealm/keyboard';

writeFileSync('_c-major-horizontal.svg', PianoKeyboard.renderToSVG({
  range: { from: 'C3', to: 'C5' },
  skin: 'classic',
  sizing: { width: 240, height: 80 },
  pressedKeys: ['C4', 'E4', 'G4'],
  idPrefix: 'c-major-horizontal',
}));
JS
cp _c-major-horizontal.svg "$anki_media/"
```

For a shared diagram, use this image tag in a separate test note type based on **Piano Chord**. Keep the hidden `Chord` element on the front so Anki can generate the card from the populated field. Replace the keyboard host with the image, remove the script tag, and set the back template to `{{text:Chord}}` to show the answer without scripts. Use `C4 E4 G4` for this example so the answer matches the media file.

```html
<img src="_c-major-horizontal.svg" alt="Piano diagram with C4, E4 and G4 marked">
```

For per-note diagrams, put the complete image tag into a **Diagram** field and insert that field into a template as `{{Diagram}}`. This lets Anki see the media reference in the field. If your client rejects SVG images, export the same drawing to PNG, add it as media, and reference the PNG. The generated SVG has its own paint definitions and needs no runtime script, stylesheets, or network resources.

If your client preserves inline SVG, you can paste the generated string into the template as markup. Use a different explicit `idPrefix` for each inline diagram sharing a document. Embedding as an image keeps each copy's IDs in its own document.

## Troubleshoot a blank card

| Symptom | What to check |
| --- | --- |
| Both sides are blank | Check that the helper and bundle are in the active profile's media folder with their exact names. If the client blocks either script, try the static image template. |
| The helper reports invalid notes | Preview from a populated note and check that its `Chord` field contains valid note names or MIDI numbers. A status message in the note-type editor can come from placeholder field text. |
| Keys display without the expected marks | Confirm the chord is inside the configured range. For example, C6 is a valid note and falls outside the example's C3–C5 span. |
| The vertical keyboard renders and the horizontal one is blank | Check that you pasted the Styling block and that the horizontal host has a nonzero content box. On a host without observation, call `resize()` after revealing it. |
| The first card works and later cards go blank | Inspect the review console for a script error or a duplicate mount on the same host. Confirm the helper runs on both sides and destroys the instances it owns before mounting again. |

## Test on each client

1. Record the OS/device, client version, and WebView version when available. Preview the card and then review it in a normal session. Check the horizontal front, both back diagrams, and the C4/E4/G4 markers.
2. Review at least two cards with different chords, then return to the first card. Flip, repeat, and leave and re-enter review. Check that each host shows one drawing and that the markers track the current card. If the console is available, compare the document's SVG definition IDs and check for mount-ownership errors.
3. Test at narrow widths and in both client themes. Rotate a mobile device, resize the review window, or reveal a previously hidden host. Check both layouts and the non-color marker. Try explicit fixed dimensions if the horizontal example stays at zero size.
4. Once media has synced, disconnect the device from the network and repeat local review. Try the static example on each client, including any surface that blocks scripts. For AnkiWeb, test connected static display and keep that result separate from offline native review.
5. When blank, first check that both exact filenames are in the active profile and present on the reviewing device. If the helper loaded, its status element can show invalid chord data or bundle-loading errors. If scripts are blocked, even the status element may stay empty. Inspect the client's console when available for media path, syntax, CSP or namespace errors. Confirm that the horizontal host has a nonzero width and height, and look for duplicate script initialization or an existing mount on the same element.

## Run the clean-profile Desktop test

The repository test drives the real Anki Desktop dialogs and reviewer offscreen. Use Linux with Python 3, Node and npm, `ip` from iproute2, and `unshare` from util-linux. The host must let your user create a user and network namespace and enable loopback inside it. Extract the official Anki Desktop 26.09.3 Linux release. Keep the executable next to its bundled `python/` and `app_packages/` directories. The test uses that release's Desktop automation interfaces. [Anki 26.09.3 downloads](https://github.com/ankitects/anki/releases/tag/26.09.3)

From `packages/keyboard`, run:

```sh
npm ci
npm run build
python3 tests/anki/run.py --anki "/path/to/extracted/anki" --report /tmp/pianorealm-anki-results.jsonl
```

The runner creates and removes a temporary profile and serves local media over loopback in a namespace with no external routes. It needs no Anki account or running desktop session. It reads the HTML templates, styling, customization, and SVG example from this guide. The test checks setup through **Manage Note Types**, **Fields**, **Cards**, and **Add**, then exercises preview, review, resizing, night mode, static SVG, and bad-input and missing-media diagnostics.

A successful run prints `PASS` and exits with status 0. The optional `--report` argument saves the client version and observations as JSON Lines. If Anki fails to start or a check fails, the runner exits nonzero and prints Anki's log. If `unshare` or `ip link set lo up` fails with a permission error, use a Linux environment that supports user network namespaces for this test.

## Compatibility matrix

The Linux result comes from an automated run of the actual Anki Desktop application on 2026-11-22. The temporary profile used the templates above and copied media directly into `collection.media`. Anki ran offscreen with only loopback networking for its local media server. Sync and other Anki versions remain untested. [Anki 26.09.3 release](https://github.com/ankitects/anki/releases/tag/26.09.3) · [Test evidence](../../PROJECT_STATE.md#anki-desktop-checklist)

| Client | OS/device | Client version | Scenario | Outcome |
| --- | --- | --- | --- | --- |
| Anki Desktop | Windows | — | Review, navigate, theme, offline and static | Untested |
| Anki Desktop | macOS | — | Review, navigate, theme, offline and static | Untested |
| Anki Desktop | Debian 13.8 x86-64 | 26.09.3, QtWebEngine 6.11.2 (Chromium 140) | Preview, two-card review and return, light and night mode, 210 px width, offline local media, static SVG image and inline SVG | Passed in an isolated offscreen profile |
| AnkiDroid | Android | — | Synced media, rotate, navigate, theme, offline and static | Untested |
| AnkiMobile | iOS/iPadOS | — | Synced media, rotate, navigate, theme, offline and static | Untested |
| AnkiWeb | Browser/device unverified | — | Connected static display and script policy | Untested |
