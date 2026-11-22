# Piano keyboard diagrams in Anki

Build the keyboard package, then copy the minified classic script and the [card helper](_pianorealm-anki-card.js) into a test profile. The examples use trusted note data and render locally in a WebView with SVG, ES2022 JavaScript and local script loading. Start with the static image workflow if your review client restricts template JavaScript or local script loading. The Anki manual describes persistent review pages and warns that template JavaScript can behave differently across clients. [Anki manual on template JavaScript](https://docs.ankiweb.net/manual/templates/styling#javascript)

## Prepare the media and note type

Run these commands from `packages/keyboard` with Node 22.12+ in the 22.x line or Node 24.x and npm. Set `anki_media` to the absolute path of the **test profile's** `collection.media` directory first.

```sh
npm ci
npm run build
cp dist/pianorealm-keyboard.umd.min.js "$anki_media/_pianorealm-keyboard.umd.min.js"
cp docs/guides/_pianorealm-anki-card.js "$anki_media/_pianorealm-anki-card.js"
```

Find the profile directory using the manual's instructions for Windows, macOS, or Linux. Copy actual files, keeping the exact names and leading underscores. Anki's media checker does not scan templates for references. The underscore marks media shared by templates. Run **Tools → Check Media** after copying, and let media synchronization finish before testing on another device. Keep the scripts, SVGs and any fallback images in the media directory itself. [Anki file locations](https://docs.ankiweb.net/manual/files) · [Anki media handling](https://docs.ankiweb.net/manual/media) · [Media synchronization](https://docs.ankiweb.net/manual/syncing.html)

In a test note type, create a field named `Chord` and enter `C4 E4 G4`. Use plain note names or MIDI numbers separated by spaces or commas. Keep values in C3–C5 to see all of them in these examples. The field is placed in a text element via Anki's `text:` filter. The helper reads `textContent`, checks the token grammar, then passes notes to the public API for normalization. Keep the field to trusted plain note data. For generated decks, validate the note tokens before import and HTML-escape text crossing into the template. Keep field substitutions out of script strings, event attributes and media URLs. [Anki field replacement and formatting](https://docs.ankiweb.net/manual/templates/fields)

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

## Static SVG media

Generate a diagram on your development machine. Run this from the built package directory and copy the resulting file into the profile's media directory.

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

Use this markup in a template for a shared diagram, or put the complete image tag into a diagram field for each note and insert that field as `{{Diagram}}`. The latter lets Anki see the media reference in the field. For clients that reject SVG images, export the same drawing to PNG, add it as media, and reference the PNG instead. This SVG has its own paint definitions and needs no runtime script, stylesheets, or network resources.

```html
<img src="_c-major-horizontal.svg" alt="Piano diagram with C4, E4 and G4 marked">
```

If your client preserves inline SVG, you can paste the generated string into the template as markup. Use a different explicit `idPrefix` for each inline diagram sharing a document. Embedding as an image keeps each copy's IDs in its own document.

## Test on each client

1. Record the OS/device, client version, and WebView version when available. Preview the card and then review it in a normal session. Check the horizontal front, both back diagrams, and the C4/E4/G4 markers.
2. Review at least two cards with different chords, then return to the first card. Flip, repeat, and leave and re-enter review. Check that each host shows one drawing and that the markers track the current card. If the console is available, compare the document's SVG definition IDs and check for mount-ownership errors.
3. Test at narrow widths and in both client themes. Rotate a mobile device, resize the review window, or reveal a previously hidden host. Check both layouts and the non-color marker. Try explicit fixed dimensions if the horizontal example stays at zero size.
4. Once media has synced, disconnect the device from the network and repeat local review. Try the static example on each client, including any surface that blocks scripts. For AnkiWeb, test connected static display and keep that result separate from offline native review.
5. When blank, first check that both exact filenames are in the active profile and present on the reviewing device. If the helper loaded, its status element can show invalid chord data or bundle-loading errors. If scripts are blocked, even the status element may stay empty. Inspect the client's console when available for media path, syntax, CSP or namespace errors. Confirm that the horizontal host has a nonzero width and height, and look for duplicate script initialization or an existing mount on the same element.

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
