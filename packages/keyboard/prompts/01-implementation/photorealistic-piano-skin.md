# Feature — Photorealistic Acoustic Piano Skin

> **Project:** Pianorealm  
> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Focused feature implementation (additional skin; not a numbered development phase)  
> **Working directory:** Pianorealm repository root  
> **Proposed skin identifier:** `realistic` (confirm against existing naming conventions before implementation)  
> **Status:** Ready for Codex; run after skin and visualization infrastructure is verified  
> **Publishing:** Explicitly out of scope

## Objective

Implement a visually compelling **photorealistic acoustic-piano keyboard skin** for `@pianorealm/keyboard`. Aim for the appearance of real piano keys photographed in soft studio light: subtly warm polished white keytops, deep near-black raised black keys, physically plausible depth, fine bevels, edge reflections, contact shadows, and restrained material texture.

The outcome should look markedly more realistic than the existing `classic` skin, **without compromising the library's SVG architecture, clarity, performance, accessibility, embeddability, or offline/static rendering**.

This is a **visual skin**, not a new keyboard engine. Implement the strongest *credible* level of realism achievable within the current rendering architecture. Do not describe results as indistinguishable from photography unless validated by actual visual review. Prioritize legibility and reliable SVG behavior over decorative complexity.

## 1. Read and inspect before editing

Use the **local checkout**, which may be newer than the public GitHub branch.

1. Read root `AGENTS.md` and `packages/keyboard/AGENTS.md`.
2. Read `docs/ECOSYSTEM.md` and `docs/ARCHITECTURE.md`.
3. Read `packages/keyboard/PROJECT_SPEC.md` (skins, customization, SVG rendering, offline operation, Anki, accessibility).
4. Read `packages/keyboard/ARCHITECTURE.md` and `packages/keyboard/DEVELOPMENT_PLAN.md` (skin resolution, shared scene, live/static parity, Phase 10).
5. Read `packages/keyboard/PROJECT_STATE.md` and relevant **accepted** ADRs in `docs/decisions/` and `packages/keyboard/docs/decisions/`.
6. Inspect current built-in skin definitions, appearance tokens, shared scene nodes, serializer, mounted SVG adapter, static `renderToSVG()` API, configuration validation, tests, and existing demo/playground.
7. Check `git status` and preserve any pre-existing edits. Record the current implementation and baseline verification results.

**Authority:** Accepted ADRs and established public APIs prevail over example code and proposed choices in this prompt. If a necessary contract is absent, choose the smallest compatible implementation and record the rationale; propose an ADR only if it changes a significant architecture decision.

## 2. Preconditions and approach

- Confirm the existing skin system and shared scene/rendering pipeline are working. Do not use this task to reimplement earlier phases.
- Confirm that the skin can be selected by the current public API, and identify whether custom rendering primitives or richer paint tokens are already supported.
- Confirm current SVG filtering/gradient policy, generated-ID policy, and static serializer behavior.
- Run existing tests, type checks, and builds before editing, where available; report failures rather than assuming the baseline is green.
- Briefly propose a design plan (appearance primitives, likely modules, test plan, potential compatibility risks) before coding.

**Prefer extending generic appearance/scene capabilities where necessary over writing a hard-coded special renderer for this skin.** Keep the extension narrow and compatible with other existing skins.

If the existing architecture cannot support essential bevel/shading without a major new rendering engine, do **not** quietly create one. Implement a graceful SVG-compatible subset, document the limitation and propose the smallest follow-up decision.

## 3. Visual design brief

### 3.1 Overall aesthetic

Target a **high-end acoustic grand piano** photographed from a nearly top-down angle:

- Keys are straight, precisely aligned, and physically proportioned according to the existing geometry engine.
- White keys resemble polished, slightly warm ivory-colored synthetic keytops (not literal ivory), with subtle tonal variance, smooth sheen, and believable edges.
- Black keys are taller and visually raised above the white keys, with a restrained satin-to-semi-gloss finish and coherent highlights.
- Soft ambient illumination comes predominantly from the upper-left/top side of the composition; light direction is consistent across all notes.
- Shadows are localized and soft; avoid floating keys, exaggerated outlines, and toy-like 3D effects.
- The spaces between keys remain perceptible, especially at full 88-key scale.
- Avoid wood grain on keytops, artificial marble patterns, rainbow reflections, heavy bloom, cartoonish bevels, and thick borders.
- Any decorative keyboard-bed/backdrop is optional and must not change key geometry, hit testing, clipping, or host page appearance.

Create visual depth with a coherent order of elements: underlying key body → subtle keytop face → highlights/bevels → black-key depth/shadow → overlays/pressed state/labels as dictated by current scene layering. Exact implementation must respect the existing scene architecture and visual state rules.

### 3.2 White keys — appearance requirements

- Base tone: warm off-white, approximately near `#f7f5ee` to `#fffefb` (illustrative, not rigid tokens).
- Very subtle top-to-bottom tonal gradient; no hard stripes or obvious banding.
- Thin, slightly darker separators between adjacent white keys.
- Narrow highlights along appropriate edges to imply a polished, slightly rounded top surface.
- Discreet lower edge/bottom bevel and faint occlusion shading where keys meet.
- Subtle ambient/specular variation that reads as manufactured synthetic piano keytops, not aged or yellowed keys.
- Optional faint noise/grain **only** if it is deterministic, lightweight, embedded, and meaningfully improves the appearance. A texture is not a requirement.

### 3.3 Black keys — appearance requirements

- Near-black charcoal base, retaining visible dimensional detail (avoid featureless pure black).
- Carefully shaped gradient or layered shading to suggest a raised, sculpted keytop.
- A fine reflective edge along the illuminated side and a darker opposite edge.
- A modest end-face/front-face highlight or bevel where practical, preserving the actual note bounds.
- A soft contact shadow on neighboring white keys to create a convincing height illusion.
- Rounded corners only to the extent supported by established skin/geometry contracts.
- Reflections must remain subtle and visually consistent across the keyboard.

### 3.4 Pressed keys and annotations

- Existing `color`, `indicator`, and `both` modes must remain correct, distinguishable, and configurable.
- Pressed-state appearance should retain some material shading, rather than replacing all depth with a flat fill, **where this can be achieved without breaking user appearance overrides**.
- Preserve high enough contrast for active-state indicators, note labels, MIDI numbers, badges, highlights, and overlays.
- Do not simulate physical key travel by changing actual hit-test geometry or note positions. Optional purely decorative press shading must be reversible and must respect reduced-motion and explicit animation disablement.
- All existing visual layers must remain legible and correctly ordered.

### 3.5 Variations / scalability

Review the result at:

- A compact two-octave keyboard.
- Full `A0–C8` range.
- Small embedded and mobile widths.
- Both horizontal and vertical orientations (light direction should remain coherent and the design must not appear broken when rotated).
- Single-note and partial ranges including black-key endpoints.

Favor a **clean simplified appearance at tiny sizes** rather than forcing every highlight and shadow into a few pixels. If an adaptive detail policy is warranted, it must be deterministic, documented, and based only on presentation scale—not note identity.

## 4. Implementation constraints

### 4.1 Architecture and state

- Skin affects **appearance only**. Never change MIDI identity, range semantics, note order, computed key bounds, orientation transforms, geometry fixtures, event contracts, or hit-testing precedence.
- Reuse the existing skin registration/selection mechanism and appearance resolver.
- Reuse the shared scene for mounted DOM and static string SVG; no parallel photorealistic SVG renderer.
- Keep geometry, pressed state, labels, highlights, and overlays independent of skin selection.
- Changing skins must preserve the current pressed-note set, overlay state, selection configuration, orientation, range, and sizing behavior.
- Do not add pointer/touch/mouse handlers, MIDI, audio, or dependencies on other Pianorealm packages.
- Keep public API additions minimal. If new generic visual tokens/scene primitives are unavoidable, maintain backward compatibility and document them.

### 4.2 SVG implementation and fidelity

Prefer **self-contained, reusable SVG drawing techniques**:

- Linear/radial gradients for material tonal changes and specular highlights.
- Carefully restrained SVG filters (`feGaussianBlur`, `feDropShadow`, or equivalents) for depth, if supported by target clients.
- Layered shapes/strokes for bevels and edges, without modifying the geometry engine's actual bounds.
- Scoped `<defs>` with collision-safe IDs, using the project's accepted `idPrefix` strategy.
- Coordinate-relative gradient directions/units that behave predictably during resizing and orientation changes.

Where SVG filters are expensive or unsupported, provide a **graceful readable fallback** using ordinary fills/strokes/gradients. Test rather than assume filter support in Anki webviews.

Avoid external files, remote fonts, CDN assets, CSS frameworks, runtime requests, scripts inside exported SVG, `<foreignObject>`, untrusted raw markup, unsafe `url(...)` values, or host-global CSS. No external runtime dependencies merely for this skin.

**Do not introduce bitmap/photo assets by default.** If you believe an embedded texture is essential, first justify its visual benefit, size and rendering impact, licensing/provenance, and how it will be embedded safely and consistently in static/standalone SVG. Obtain approval before introducing a material asset requirement.

### 4.3 Safety, ids, and multi-instance support

- Escape/validate all user-configurable style, label, and overlay inputs using existing safety mechanisms.
- Ensure gradients, masks, clip paths, and filters have unique per-instance identifiers in mounted SVG.
- Static SVG should be deterministic for identical inputs under the accepted explicit `idPrefix` policy.
- No cross-instance styling leaks or collisions when two keyboards use the photorealistic skin on the same page.
- No changes to npm/UMD global behavior or network requirements.

### 4.4 Accessibility and animation

- Retain existing accessible labels and descriptions; this is a display-only component.
- Do not rely solely on subtle shadows or color to indicate pressed notes; preserve non-color-only indicator modes.
- Respect explicit disabled animations and `prefers-reduced-motion`.
- Static SVG must show stable, final visual states and remain understandable without animations or filter effects.
- Preserve suitable label/indicator contrast. Verify contrasts for representative combinations instead of claiming automatic accessibility compliance.

## 5. Suggested implementation sequence

Carry out small, testable increments:

1. **Inventory:** Determine how skins map to shared appearance values, scene primitives, and SVG `<defs>` today. Identify gaps.
2. **Visual prototype:** Add a minimal `realistic` skin definition and demonstrate its base white/black materials using existing capabilities.
3. **Depth:** Introduce subtle lighting, bevels, black-key edge treatments, and optional shadows using generic, reusable scene/appearance facilities only where needed.
4. **State integration:** Verify pressed notes, appearance overrides, overlays, labels, and high-contrast/reduced-motion policies still work.
5. **Parity:** Ensure mounted and `renderToSVG()` results describe equivalent visuals, including all required definitions and isolated IDs.
6. **Demo:** Add the new skin to the existing playground selector; add a representative preview alongside `classic` if the demo already supports comparison.
7. **Validation:** Run automated checks and perform manual browser visual review at representative ranges, scales, orientations, and states. Refine the most visible realism problems rather than adding effects indiscriminately.
8. **Documentation:** Update skin list, public usage examples, styling limitations, and project-state handoff only after verified implementation.

Keep the work focused. Do not opportunistically rewrite other skins or build a standalone image-based rendering path.

## 6. Demo and visual-review expectations

The existing demo/playground should expose the skin by its adopted identifier and enable inspection of:

- `minimal`, `classic`, and `realistic` under identical note ranges and dimensions.
- Horizontal `C3–C5`, full `A0–C8`, and one partial range with black endpoints.
- Vertical orientation.
- Unpressed keys and a chord such as C4–E4–G4, including `indicator` and `both` where supported.
- Optional labels and overlays.
- Static SVG export of the realistic skin.

If browser screenshot tooling is available, capture **before/after** or **Classic vs Realistic** comparisons using the same geometry and viewport. Keep screenshot files in the existing visual-test structure if adopted; do not add undocumented binary assets to the production bundle.

**Visually inspect actual output** rather than concluding realism from the presence of gradients. Identify defects such as excessive gloss, repeated highlight stripes, shadows that look detached, black keys losing shape, misaligned bevels, or muddy rendering at small sizes.

## 7. Required automated tests

Add or update tests at the lowest appropriate layer. Do not replace existing fixtures merely to make tests pass.

### Skin configuration and API

- `realistic` resolves through the documented built-in skin mechanism.
- Existing skins retain unchanged default appearance semantics unless a justified shared fix is needed.
- Unknown skins and invalid overrides remain rejected atomically.
- User appearance overrides use the accepted precedence rules.
- No mutation of shared skin definitions across instances.

### Layout and state invariants

- Geometry snapshots/bounds for identical range/dimensions match other skins.
- Switching to/from `realistic` preserves pressed/off-range notes and overlays/labels.
- Individual press/release operations retain the existing targeted-update behavior.
- Hit-testing returns the same notes under every skin.

### SVG and compatibility

- Shared scene and serialized SVG contain necessary gradients/filter definitions with valid references.
- No unresolved `<defs>` references, duplicate IDs within a document, or collisions between mounted instances.
- Deterministic static SVG under the approved ID policy.
- No external URLs, scripts, or runtime resource fetches in static output.
- Valid output for vertical layout, partial black-key ranges, small sizes, multiple instances, and embedded/offline scenarios.
- Browser/standalone build behavior remains intact.

### Visual checks

- Add representative screenshot/visual-regression cases for `realistic` in both orientations, two sizes, normal/pressed states, and static/live outputs **if visual infrastructure exists**.
- If visual regression tooling is unavailable, record explicit manual checks and unverified environments; do not claim visual tests passed.

## 8. Quality gate / definition of done

This task is complete only when:

- [ ] A visually distinctive realistic skin is available through the public skin API.
- [ ] Actual browser inspection shows credible white/black key material, depth, highlights, and contact shadows, without overwhelming detail.
- [ ] No geometry/state/hit-test behavior depends on the skin.
- [ ] Existing skins, appearance overrides, pressed modes, labels, and overlays still work.
- [ ] Mounted and static SVG use the same scene/appearance logic with self-contained effects.
- [ ] Multiple instances and offline/Anki-safe fallbacks have been considered and tested to the extent the environment permits.
- [ ] Type checking, tests, and production build pass, or concrete failures/blockers are documented.
- [ ] Demo, documentation, and `PROJECT_STATE.md` accurately reflect implementation and verification.

Do not mark unperformed browser/Anki inspections as verified. If photo-level realism is unattainable with current primitives, explicitly state the achieved visual fidelity and trade-offs.

## 9. Final report

Provide a concise but evidence-based report with:

1. **Design summary:** What makes this skin more realistic than `classic`.
2. **Implementation:** Files created/modified; any new appearance tokens or scene primitives; why each was necessary.
3. **Usage:** The actual public option to enable the skin, using verified exported types/API.
4. **Verification:** Exact commands and results; visual checks performed and environment; images/screenshots if available.
5. **Compatibility:** Static SVG, multiple instances, compact sizing, UMD/offline, and Anki status—distinguish passed from unverified.
6. **Limitations:** Remaining gaps, performance costs, accessibility/contrast caveats, and any follow-up decisions.
7. **Project status:** Changes to `PROJECT_STATE.md` and next recommended task.

Do **not** commit, push, tag, publish, or create a release. Do not bump the package version unless explicitly instructed.
