# Phase 1 — Core Foundation, Note Utilities, and Configuration

> **Project:** Pianorealm  
> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Implementation  
> **Phase:** 1 of 10 (after Phase 0)  
> **Scope:** Tooling, pure note utilities, validation, and initial public entry point  
> **Working directory:** Pianorealm repository root

## Objective

Implement **Phase 1** of `@pianorealm/keyboard`: a small, buildable, type-checkable, testable TypeScript package with **DOM-independent musical note utilities** and **validated configuration foundations**.

This is the first implementation phase, **not** a request to build a visible keyboard. Prefer a narrow, reliable foundation over scaffolding later features prematurely.

## Instructions and sources of truth

First inspect the actual working tree. Follow all applicable `AGENTS.md` files, especially:

- `AGENTS.md`
- `packages/keyboard/AGENTS.md`

Then read the relevant sections of:

1. `docs/ECOSYSTEM.md` — package boundaries and composition rules.
2. `docs/ARCHITECTURE.md` — ecosystem architecture and dependencies.
3. `packages/keyboard/PROJECT_SPEC.md` — package requirements, particularly technology, notes, configuration, and distribution.
4. `packages/keyboard/ARCHITECTURE.md` — accepted internal boundaries and module responsibilities.
5. `packages/keyboard/DEVELOPMENT_PLAN.md` — **§6, Phase 1**, and the cross-phase working rules.
6. `packages/keyboard/PROJECT_STATE.md` — current verified project state and next task.
7. `packages/keyboard/docs/PHASE_0_REVIEW.md` — Phase 0 findings, approved design baseline, and test fixtures.
8. **All accepted ADRs relevant to Phase 1** under `packages/keyboard/docs/decisions/`, plus any applicable ADRs under `docs/decisions/`.

Treat accepted ADRs and approved specification decisions as authoritative over illustrative API sketches. **Do not infer contract details from this prompt if they are specified differently in an accepted ADR.** Do not silently resolve conflicting documentation; identify a blocking conflict and explain the smallest resolution needed. A missing source document must be reported rather than fabricated.

**Important:** The existing `PROJECT_STATE.md` records Phase 0 as complete and Phase 1 as not started. Verify that this is still true in the **current checkout**; do not trust an older snapshot over the working tree.

## Before editing

1. Inspect `git status --short` and the relevant tracked files to avoid overwriting local work. Do **not** discard or reset user changes.
2. Confirm that the Phase 0 gate is satisfied and the relevant ADRs are accepted. If not, stop the affected implementation work and report the blocker.
3. Briefly describe the Phase 1 module layout, proposed package scripts, and public exports you intend to create. Check these against the accepted ADRs.
4. Identify any existing project tooling and reuse it where appropriate. Do not introduce a repository-wide package manager, monorepo framework, or root dependencies without authorization.
5. If the phase is too large for one safe session, split it into coherent sub-tasks while preserving the Phase 1 acceptance gate. Record unfinished work explicitly; do not call a partial result complete.

## Scope of implementation

### A. Package tooling

Within `packages/keyboard/`, establish the **smallest working package** consistent with the accepted architecture:

- `package.json` with package name **`@pianorealm/keyboard`**, appropriate private/unpublished status if specified, and accurate metadata.
- A strict TypeScript configuration suitable for pure library modules.
- Vite library build configuration for the **currently approved ESM output**.
- Vitest configuration (or a minimal compatible setup) and a test script.
- A TypeScript type-check script and build script.
- A small `src/index.ts` exposing **only the Phase 1-approved public API**.
- Test files organized consistently with the repository architecture.
- Package-local dependency and lockfile handling consistent with the current repository; avoid installing redundant tools.

Use maintained, mutually compatible dependencies available in the actual environment. **Do not claim a tool or dependency is installed unless it is.** If the network or package registry is unavailable, create sound configuration where possible and report exactly what could not be run.

Keep package imports safe in Node without touching `window`, `document`, SVG DOM APIs, or browser-only globals at module-load time.

**Distribution boundary:** Phase 1 must build and import locally as ESM with types. Full standalone/UMD bundles, npm publication, and cross-environment compatibility checks belong to later phases. Do not promise or expose unbuilt outputs through `package.json` exports.

### B. Note identity and musical utilities

Implement pure, deterministic helpers/types following the **accepted note contracts**:

- MIDI note identity and validation: integer **0–127** only; reject fractions, `NaN`, infinities, out-of-range numbers, and unsupported input types.
- Note-name parsing and normalization from supported text inputs to MIDI integers.
- MIDI-to-note-name formatting with supported sharp/flat preference and octave-number offset semantics.
- Enharmonic equivalence, including spellings that cross octave boundaries when accepted by the ADRs.
- White-key/black-key classification by pitch class.
- Clear, documented handling of invalid note strings and accidental spellings.
- Internal representation remains MIDI numbers; note labels are boundary representations.

Use `C4 = 60` under default scientific pitch notation. Apply configuration options and accepted conventions rather than inventing additional syntax.

Implement the public surface **only** where Phase 0 has approved it. Pure internal helpers may remain unexported from the package root. Avoid interfaces/classes that merely wrap simple functions.

### C. Inclusive ranges and configuration

Implement the Phase 1 **pure configuration foundation**, as approved in the ADRs:

- Inclusive note-range parsing and validation (`from <= to`) with MIDI and supported note-name inputs.
- Accept a valid one-note range, including a single black key.
- Reject reversed ranges and invalid endpoints with understandable errors.
- Define necessary TypeScript option/value types and sensible default values for the portions required **now**.
- Normalize configuration into validated, deterministic values without browser or DOM dependencies.
- Validate options and preserve **atomicity**: invalid composite input must not result in a partially accepted configuration snapshot.
- Keep geometric dimensions under **sizing options**, not skin appearance tokens, per the Phase 0 decision.
- Ensure configuration design leaves room for later phases without implementing rendering, skin resolution, mounted state, or runtime observers.

Do not construct a pretend `PianoKeyboard` renderer simply to fill out the future API. An intentionally small Phase 1 entry point is preferable to stub methods or placeholder behavior.

### D. Errors and documentation

- Use predictable, appropriate error types and useful messages for invalid public input, consistent with approved decisions.
- Document supported note syntax, default octave numbering, accidental preference behavior, inclusive ranges, and important validation semantics in the package's minimal developer documentation or code-level docs as appropriate.
- Do not claim support for Anki, browsers, or bundle formats that have not been verified.
- Avoid rewriting unrelated design documents or accepted ADRs just to match implementation choices.

## Explicitly out of scope

Do **not** implement any of these in Phase 1:

- Piano-key geometry, sizing layout algorithms, hit testing, or key bounds (Phase 2 onward).
- SVG scene creation, DOM mounting, `PianoKeyboard` visualization lifecycle, or static SVG generation (Phases 3 and 9).
- Pressed-key state or key updates (Phase 4).
- Skins, overlays, labels, indicators, or animations (Phases 5–7).
- Public events, extension/plugin lifecycle, or user-input handling (Phase 8 / separate package).
- MIDI device integration or audio playback (other Pianorealm packages).
- Full standalone/UMD output, Anki integration, playground, or publishing (Phases 9–10).
- Unrequested monorepo tooling, Git commits, pushes, releases, or npm publication.

Do not create empty directories/files for later features solely to make the future project tree appear complete.

## Required verification

Add focused Vitest tests for **behavior that is implemented**. Include the Phase 0 fixtures where they apply:

| Area | Representative assertions |
| --- | --- |
| Canonical notes | `C4` → `60`; `C-1` → `0`; `G9` → `127` under default notation |
| Enharmonics | `F#3` and `Gb3` → `54`; `B#3` → `60`; `Cb4` → `59` |
| Formatting | `60` formats to `C4` by default; octave offset `+1` formats to `C5` and round-trips |
| Key classification | White/black classification across octaves, including MIDI endpoints |
| Invalid numbers | Reject `-1`, `128`, `60.5`, `NaN`, `Infinity` and unsupported numeric values |
| Invalid strings | Reject unsupported syntax such as `H4` and `C##4`, unless an accepted ADR explicitly permits it |
| Range validation | Inclusive endpoints; accept `61–61`; reject reversed ranges and invalid endpoints |
| Configuration | Defaults normalize; option validation rejects invalid combinations; failed composite input leaves prior validated snapshot untouched |
| Pure runtime | Importing Phase 1 utilities in Node works without browser DOM globals |
| Package build | Built ESM can be imported locally; declarations and exposed exports correspond to implemented functionality |

Add other boundary cases revealed by the accepted ADRs. Prefer tests of **observable contracts** over snapshots of implementation details.

Run the relevant commands available in the repository, ideally from `packages/keyboard/` (adjust to actual scripts):

```bash
npm run typecheck
npm test
npm run build
```

Also perform a local import smoke test against the **built output** and check the generated declaration files. If a test requires extra tools, use only dependencies justified by the phase. Run `git diff --check` and inspect `git status --short` before finishing. Record the **exact commands** and **actual outcomes**; do not invent a passing result.

## Definition of done — Phase 1 gate

Mark Phase 1 **Complete** only if all conditions below are demonstrated:

- [ ] The package has a working, documented package-local TypeScript / Vite / Vitest toolchain.
- [ ] ESM build succeeds and exposes a small intentional root API.
- [ ] TypeScript checking succeeds, including produced declarations as applicable.
- [ ] Unit tests pass for notes, formatting, normalization, ranges, and configuration.
- [ ] Edge cases specified by accepted ADRs are handled or explicitly documented as deferred with approval.
- [ ] Importing pure utilities requires no browser DOM.
- [ ] No later-phase implementation, empty stubs, or extra Pianorealm package dependencies were introduced.
- [ ] Local changes are reviewed; generated build artifacts and machine-local files are appropriately ignored.
- [ ] `PROJECT_STATE.md` records evidence-backed progress and the next task.

If any gate is unmet, mark the phase **In progress** or **Blocked**, and describe precisely what remains. No partial completion masquerading as success.

## State updates and final response

After meaningful verified work:

1. Update `packages/keyboard/PROJECT_STATE.md` with the **actual** status (phase, completed tasks, remaining tasks, files/modules changed, known issues, and exact command results).
2. Update the Phase 1 progress/checklist in `DEVELOPMENT_PLAN.md` only if the project's established tracking convention calls for it; do not rewrite the entire roadmap.
3. Refer to accepted ADRs by their **actual filenames**. Follow the repository's ADR numbering rules if a new decision is genuinely necessary; do not create speculative ADRs.
4. Do **not** commit, push, publish, or modify unrelated work without explicit permission.

End the session with a concise report:

```text
Phase: 1 — Core Foundation
Status: Complete / In progress / Blocked

Implemented:
- ...

Files created or modified:
- ...

Verification (exact command → observed result):
- ...

Unresolved issues / deviations:
- ...

Next bounded task:
- ...
```

**Principle:** Build the reliable musical and tooling foundation now; defer visual features until their planned phases.
