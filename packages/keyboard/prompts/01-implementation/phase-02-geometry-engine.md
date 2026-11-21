# Phase 2 — Deterministic Keyboard Geometry Engine

> **Project:** Pianorealm  
> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Implementation  
> **Phase:** 2 of 10 (after Phase 0)  
> **Working directory:** Pianorealm repository root  
> **Scope:** Pure keyboard geometry, both orientations, bounds, ordering, and deterministic fixtures

## Objective

Implement **Phase 2** of `@pianorealm/keyboard`: a deterministic, browser-independent geometry engine that produces correct keyboard bounds for any valid inclusive MIDI note range. Its results will be consumed by the shared scene builder in Phase 3 and geometry-backed hit testing in Phase 8.

**Do not render a keyboard in this phase.** Deliver correct geometry and executable tests, not SVG, a DOM controller, or a visual demo.

## Authority and required reading

Inspect the **current checkout** first. Follow both applicable instruction files:

- `AGENTS.md`
- `packages/keyboard/AGENTS.md`

Then read:

1. `docs/ECOSYSTEM.md` and `docs/ARCHITECTURE.md` — ecosystem and dependency boundaries.
2. `packages/keyboard/PROJECT_SPEC.md` — especially geometry, note ranges, orientations, sizing, and integration requirements.
3. `packages/keyboard/ARCHITECTURE.md` — especially §§4–6 and the accepted Phase 0 references.
4. `packages/keyboard/DEVELOPMENT_PLAN.md` — especially §7 (Phase 2), the task gate, and verification matrix.
5. `packages/keyboard/PROJECT_STATE.md` — verified Phase 1 state, blockers, and handoff notes.
6. `packages/keyboard/docs/PHASE_0_REVIEW.md` — especially the **Phase 2 numerical fixtures**.
7. `packages/keyboard/docs/decisions/0002-layout-sizing-and-hit-testing.md` — **accepted geometry contract (A-03, A-04, A-09)**.
8. Other applicable accepted ADRs, including `packages/keyboard/docs/decisions/0001-notes-configuration-and-state.md` and any ecosystem-level decisions that constrain exports or module dependencies.
9. Existing Phase 1 source code, package scripts, types, and tests; **reuse existing utilities and validation**.

Accepted ADRs and approved specifications prevail over illustrative signatures in architecture documents or this prompt. If there is a genuine unresolved conflict, identify it rather than silently inventing a different policy.

**Phase 1 is reported complete by the maintainer, but verify this in the working tree.** Public GitHub or a previous handoff may be behind local commits. Do not overwrite uncommitted changes.

## Preflight (before editing)

1. Run `git status --short` and inspect current branch, package files, and available npm scripts.
2. Verify Phase 1's type checking, tests, and build are operational, or record any existing failure as a blocker/baseline issue.
3. Read the accepted geometry ADR and compare its fixtures with the current configuration and sizing types.
4. Briefly present the intended geometry inputs, result shape, module ownership, and calculation strategy before implementing.
5. Keep the work confined to `packages/keyboard/`, except for a necessary, justified change to a shared repository document. Do not discard existing work.
6. If the task exceeds a safe implementation scope, split it into coherent geometry-and-test sub-tasks, record progress, and avoid claiming the entire phase complete.

## Implementation scope

### A. Pure geometry contract

Implement a pure layout function (name and precise types should follow the existing codebase and accepted decisions; `calculateLayout(...)` is illustrative) that:

- Accepts a **validated, normalized inclusive MIDI range** and a supported orientation (`horizontal` or `vertical`).
- Accepts explicit, validated key dimensions from the **sizing** domain, not from a skin or appearance token.
- Returns one stable key record for **every MIDI note in the range**, including kind (`white` / `black`) and finite `{ x, y, width, height }` bounds.
- Returns intrinsic layout width/height, orientation, and sufficient private ordering / stacking information for Phase 3.
- Is deterministic for equivalent inputs, has no side effects, and has **no dependency on `document`, `window`, SVG elements, measurements, or rendering frameworks**.
- Exposes internal values/types only to the extent required for the future scene builder. Do not accidentally publish an unapproved public geometry API through `src/index.ts` or `package.json` exports.
- Keeps result structures immutable or read-only by contract. Do not leak mutable internal collections.

Reuse Phase 1 note normalization, classification, range validation, and sizing configuration rather than building a second musical parser.

### B. Horizontal geometry — accepted A-03 policy

Implement the accepted **white-key pitch lattice**:

- White-key pitch positions form consecutive equal-width slots, **not** equal chromatic/semitone spacing.
- Black keys center on the seam between their adjacent white neighbors.
- Use **virtual neighboring white keys outside the visible range** to place endpoint black keys correctly.
- For each included key, compute the **full rectangle** first. Take the union of included rectangles along the pitch axis; translate the minimum to zero. Do **not** crop endpoint black keys to the span of included white keys.
- Keep full white-key **depth** in the viewport even when the range contains only a black key.
- Low notes must be on the left, high notes on the right.
- Place all whites before blacks in visual stacking order; within each layer use ascending MIDI order.

Default logical dimensions from accepted ADR A-03:

| Key | Pitch-axis extent | Depth-axis extent |
| --- | ---: | ---: |
| White | 20 | 100 |
| Black | 12 | 60 |

Represent these in **SVG user units**; do not introduce implicit CSS pixels or browser measurements into the geometry module.

### C. Vertical geometry — accepted rotation rule

Vertical orientation must be **the exact geometric transform of the horizontal layout**, not a second, loosely equivalent spacing algorithm.

For horizontal key bounds `(x, y, w, h)` and horizontal pitch-axis extent `L`, accepted A-03 maps them to vertical bounds:

```text
vertical x      = y
vertical y      = L - x - w
vertical width  = h
vertical height = w
```

The resulting vertical viewport dimensions are horizontal depth × horizontal pitch extent. Verify:

- Lower notes are at the **bottom** and higher notes at the **top**.
- Black keys occupy the **left** portion of the key depth.
- Note identities and relative stacking do not change.
- A single black key and black endpoints remain valid and correctly positioned.

Text rotation is not part of this phase; scene/labels are later work.

### D. Dimensions, validation, and immutability

- Support validated non-default finite dimensions and proportions as allowed by existing sizing contracts.
- Reject invalid dimensions using the established Phase 1 error convention; do not silently clamp negative, non-finite, or otherwise invalid values.
- Never produce `NaN`, `Infinity`, negative bounds, divide-by-zero behavior, or missing keys for valid inputs.
- Use stable numeric output and avoid unnecessary rounding; document floating-point tolerance policy in tests if fractional dimensions are supported.
- Distinguish **intrinsic geometry** from viewport fitting. Accepted A-04 requires **uniform contain scaling and centering** for container fitting, but host measurement, CSS transforms, `ResizeObserver`, and actual mounting belong to Phases 3/6/8. Do not mix container measurement into this module.
- Keep geometry independent of skins, pressed-key state, labels, animation, audio, MIDI devices, and input handlers.

### E. Pure hit-test foundation (limited Phase 2 work)

Prepare a narrow **internal** geometry query if appropriate to the accepted architecture:

- Input is in the same **logical user-unit coordinate system** as the calculated layout.
- Use **half-open rectangles** (`min` inclusive, `max` exclusive) to avoid ambiguous shared-edge hits.
- Black keys take precedence over whites when rectangles overlap.
- Return the MIDI note or `null` for points outside visible key bounds.
- Follow the established invalid-coordinate policy for non-finite inputs.

**Do not implement** the public mounted `getNoteAtPoint(clientX, clientY)` API or viewport/client coordinate conversion yet. Screen transform inversion, scrolling, device-pixel-ratio behavior, and CSS letterboxing are **Phase 8** browser-integration work. If the accepted project plan reserves even the internal query for later, keep only the required bounds and document the deferral.

## Deterministic fixture tests (required)

Create focused Vitest tests, ideally table-driven, using the approved fixture definitions in `docs/PHASE_0_REVIEW.md`. **These expected values are contracts, not numbers to alter until tests pass.** With default white `20×100` and black `12×60`, assert:

| Range | Horizontal intrinsic viewport | Notes to verify |
| --- | --- | --- |
| `C4`–`B4` | `140×100` | One octave's seven whites and five blacks |
| `C3`–`C5` | `300×100` | Multi-octave key count and ordering |
| `A0`–`C8` | `1040×100` | Standard 88-key range |
| MIDI `0`–`127` | `1500×100` | Full MIDI range, exactly 128 distinct keys |
| `C#4`–`D#4` | `32×100` | Blacks at `x=0` and `x=20`; included white `D4` at `x=6` |
| `C4`–`C#4` | `26×100` | Endpoint black protrusion / no clipping |
| `C#4`–`D4` | `26×100` | Starting on a black note |
| `C4`–`C4` | `20×100` | Single white key |
| `C#4`–`C#4` | `12×100` | Single black bounds `(0,0,12,60)` while viewport retains depth `100` |

Vertical equivalents must be exact rotations; in particular:

- Single `C#4`: viewport `100×12`, black bounds `(0,0,60,12)`.
- `C#4`–`D#4`: viewport `100×32`, lower black at `y=20`, higher black at `y=0`.

Also cover:

- Both orientations for representative long and short ranges.
- Partial ranges ending or starting on sharps/flats; note names normalize to MIDI using Phase 1 behavior.
- Non-default/fractional valid dimensions and extreme but valid sizes; numerical precision and finite outputs.
- No missing or duplicate note records; each range has `to - from + 1` keys.
- Correct kind, stable ordering, white-before-black z-order, and valid black/white relative positioning.
- No bounds with negative width/height or coordinates outside the agreed intrinsic viewport.
- Input validation: invalid/reversed ranges, out-of-bounds/non-integral MIDI, invalid dimensions/orientation.
- Determinism: identical inputs produce equivalent layout results; input objects are not mutated.
- If the pure hit-test helper is implemented: overlap black precedence, half-open boundaries, gaps/out-of-range points, vertical geometry, and invalid coordinates.

Do not replace exact geometric assertions with snapshots alone. Add property/invariant checks alongside explicit fixtures.

## Expected modules and changes

Follow actual Phase 1 structure and accepted architecture; likely areas include:

```text
packages/keyboard/
├── src/
│   ├── notes/                  # reuse existing functions
│   ├── config/                 # reuse/extend validated sizing inputs
│   └── geometry/
│       ├── layout.ts           # pure entry point and result contracts
│       ├── horizontal.ts       # optional extraction, only if useful
│       ├── vertical.ts         # optional extraction, only if useful
│       └── hit-testing.ts      # internal only, if in scope
└── tests/
    └── unit/                   # geometry fixtures and invariants
```

Do **not** create empty folders or unnecessarily many abstraction layers. Prefer a small coherent implementation with pure helpers over Java-style factories or speculative plugin hooks.

## Explicitly out of scope

Do not implement or scaffold:

- SVG generation, scene graph, DOM mounting, browser rendering, static SVG serializer, `PianoKeyboard` controller (Phases 3/9).
- Pressed-key state or visual updates (Phase 4).
- Skins and custom appearance (Phase 5).
- Container observation, responsive host measurement, animations, or CSS (Phase 6).
- Labels, indicators, overlays (Phase 7).
- Public browser hit testing, input events, extension lifecycle, MIDI or audio (Phase 8 or other packages).
- Standalone bundles, Anki templates, playground, publication (Phases 9–10).
- Unrequested repository-wide tooling, additional packages, dependencies, or breaking changes to approved Phase 1 APIs.

Do not commit, push, publish, or create releases. Preserve user changes and accepted ADRs.

## Verification and execution

Run the scripts **actually present** in `packages/keyboard/package.json`, adapting commands if the project uses another entry point. Expected categories:

```bash
cd packages/keyboard
npm run typecheck
npm test
npm run build
```

Also run `git diff --check` and examine `git status --short`. Verify a Node/test-environment import or invocation of the pure geometry module with no browser globals.

Report **exact commands and real results**. Do not claim that browser rendering, visual regression, Anki, public hit testing, or responsive host sizing has been tested in Phase 2. If a check cannot run, provide the blocker, what was and was not verified, and the smallest next action.

## Phase 2 completion gate

Mark Phase 2 **Complete** only if all apply:

- [ ] Phase 1 baseline remains valid; no accidental regression in notes/configuration/package build.
- [ ] Pure, deterministic geometry exists with no browser/DOM dependency.
- [ ] Correct accepted horizontal white/black seam policy, endpoint unions, depth, and stacking.
- [ ] Vertical layouts are exact transforms and use the approved pitch direction.
- [ ] All approved numeric Phase 0 geometry fixtures pass.
- [ ] Full MIDI and arbitrary partial ranges yield complete, finite, nonnegative bounds.
- [ ] Valid custom sizing and invalid input paths are tested as applicable.
- [ ] Pure logical hit-test behavior is implemented/tested if included, or explicitly recorded as deferred.
- [ ] Typecheck, tests, and build pass; limitations are documented accurately.
- [ ] No Phase 3+ features or unsupported public APIs have been introduced.
- [ ] `PROJECT_STATE.md` reflects evidence-backed status, changed modules, last verification results, and the next task.

If any requirement is unmet, set the phase to **In progress** or **Blocked** rather than falsely marking it complete.

## Handoff and final report

At the end:

1. Update `packages/keyboard/PROJECT_STATE.md` with actual accomplishments, remaining work, affected modules, and **exact** test/build results.
2. Update phase status/checklists in `DEVELOPMENT_PLAN.md` only if this is consistent with current tracking practice; keep the roadmap authoritative and avoid broad rewrites.
3. Document any newly discovered contract conflict; don't rewrite accepted ADRs to suit generated code. Follow the repository ADR naming and numbering convention if a new decision is genuinely required.
4. Review the diff for accidental changes and do not commit or push.

Provide this concise completion report:

```text
Phase: 2 — Deterministic Keyboard Geometry
Status: Complete / In progress / Blocked

Implemented:
- ...

Files created/modified:
- ...

Verification (exact command → observed result):
- ...

Geometry fixture results:
- ...

Known issues, decisions, or deferrals:
- ...

Next bounded task:
- ...
```

**Principle:** Prove the geometry and coordinate contract independently now so that Phase 3 can render it without introducing a second layout algorithm.
