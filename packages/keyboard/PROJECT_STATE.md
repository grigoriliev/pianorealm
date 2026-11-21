# `@pianorealm/keyboard` — Project State

> **Status:** Planning · **Current phase:** Phase 0 — Architecture, contracts, and decisions  
> **Last updated:** 2026-11-21 · **Maintainer:** Project contributors  
> **Purpose:** Short, evidence-based handoff for the next development session. This file records **observed progress**, not intended features.

## 1. Snapshot

| Field | Current value |
| --- | --- |
| Ecosystem | Pianorealm |
| Package | `@pianorealm/keyboard` |
| Release | Not established; no version has been verified |
| Current phase | **0 — Architecture, contracts, and decisions** |
| Phase status | **Not started** (planning documents drafted; formal decision review pending) |
| Current task | Review specifications, resolve Phase 0 contracts, and record ADRs |
| Implementation | **Not verified / not present in the supplied workspace** |
| Tests and builds | **Not run**; no test/build scripts observed |
| Last verified commit / branch | **Unknown**; no Git metadata was available in the supplied workspace |
| Next milestone | Phase 0 architecture baseline accepted; then Phase 1 tooling and note utilities |

**Evidence scope:** This snapshot reflects only the files available when this document was created, not a checkout of the user's full Git repository. Absence of a file here does **not** prove it does not exist elsewhere. Do not convert planned work into completed work without inspecting the actual working tree and recording evidence.

## 2. Source documents

Read these before starting work, consulting each document for the subject it governs:

| Document | Authority | Observed here |
| --- | --- | --- |
| [`../../../docs/ECOSYSTEM.md`](../../../docs/ECOSYSTEM.md) | Pianorealm vision, package ownership, non-goals | Present; draft |
| [`../../../docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) | Cross-package boundaries and integration contracts | Present; draft |
| [`PROJECT_SPEC.md`](PROJECT_SPEC.md) | `keyboard` requirements and release acceptance | **Target path not present** in supplied workspace; an ecosystem-and-keyboard draft was available separately as `/mnt/data/PROJECT_SPEC.md` |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Keyboard module boundaries and proposed design | Present; proposed baseline |
| [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) | Phase sequence, deliverables, gates, verification | Present; planned |
| [`docs/decisions/`](docs/decisions/) | Accepted keyboard-specific ADRs | None observed |

**Documentation housekeeping:** Place the agreed keyboard specification at `packages/keyboard/PROJECT_SPEC.md` before implementation, and consider extracting ecosystem-wide requirements into their owning root documents. Resolve discrepancies explicitly; do not silently treat draft design sketches as final API contracts.

## 3. Phase tracker

Statuses: **Not started / In progress / Blocked / Complete / Deferred**. Update only after concrete evidence.

| Phase | Milestone | Status | Evidence / note |
| --- | --- | --- | --- |
| 0 | Architecture, contracts, and decisions | **Not started** | Draft architecture exists; decisions and ADRs remain open |
| 1 | Project foundation and note utilities | Not started | No implementation or tests verified |
| 2 | Pure geometry engine | Not started | — |
| 3 | Shared scene and minimal live SVG | Not started | — |
| 4 | Pressed-key visual state | Not started | — |
| 5 | Skins and customization | Not started | — |
| 6 | Sizing and motion | Not started | — |
| 7 | Labels, indicators, and overlays | Not started | — |
| 8 | Events, hit testing, and extensions | Not started | — |
| 9 | Static SVG, offline builds, and Anki | Not started | Design constraints begin in Phase 0; full verification later |
| 10 | Release hardening and publication prep | Not started | — |

For tasks and gates, see [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md). Phase completion requires its documented gate, not just a plausible implementation.

## 4. Established boundaries (requirements, not implementation claims)

- `@pianorealm/keyboard` provides **visualization only**. Mouse, touch, and computer-key interaction belong to `@pianorealm/interaction`; MIDI I/O to `@pianorealm/midi`; audio playback to `@pianorealm/audio`.
- MIDI integers **0–127** are canonical note identities; default scientific notation uses **C4 = 60**.
- Geometry, scene generation, and static SVG serialization must be independent of browser DOM globals.
- Mounted SVG and static SVG must share geometry and resolved visual representation.
- Pressed-key updates should update affected DOM elements rather than rebuild the entire keyboard.
- Public integration should not require inspection or mutation of private SVG nodes.
- Multiple instances, safe teardown, scoped styles/IDs, offline operation, accessible rendering, and restricted-host/Anki concerns must inform implementation from the start.
- No future Pianorealm package is a required runtime dependency of `keyboard`.

**Not yet accepted:** Concrete signatures, behavior at boundary conditions, bundle names, event payload shapes, and other choices explicitly called *proposed* in `ARCHITECTURE.md`.

## 5. Current task — Phase 0 decision review

**Goal:** Ratify enough contracts that Phase 1 can begin without inventing behavior that later phases depend on.

### Pending work

- [ ] Inspect the actual Git working tree; verify the package spec location and record branch/commit.
- [ ] Review the package spec against both ecosystem documents and the keyboard architecture; log conflicts or unclear requirements.
- [ ] Decide repository/workspace structure, package entry points, toolchain expectations, and initial TypeScript exports.
- [ ] Decide note-name parsing, accidental policy, octave offsets, inclusive ranges, invalid values, and single-note handling.
- [ ] Decide coordinate units, white/black key placement, partial black-key endpoint behavior, cropping, and layout fixtures.
- [ ] Decide pressed-note state outside visible range, ordering of returned keys, and no-op event behavior.
- [ ] Decide `setOptions()` update semantics, validation atomicity, visual-state preservation, and skin override priority.
- [ ] Decide a shared scene representation, safe overlay/label policy, SVG ID generation, and live/static parity criteria.
- [ ] Decide minimal hit-testing coordinates, bounds, black-key precedence, and event subscription/disposal contracts.
- [ ] Decide standalone bundle/global namespace strategy (proposed `Pianorealm.Keyboard`) and supported embedded-environment baseline.
- [ ] Write/accept keyboard-specific ADRs under `packages/keyboard/docs/decisions/`; use root `docs/decisions/` for ecosystem-wide decisions.
- [ ] Update `ARCHITECTURE.md` and this state file to reference accepted decisions and their evidence.

### Phase 0 acceptance gate

- [ ] Critical architectural choices above are decided or explicitly deferred with a safe default.
- [ ] ADRs identify the decision, alternatives, reasoning, consequences, and status.
- [ ] Initial module/API sketch and geometry fixture list are reviewable.
- [ ] No known unresolved conflict blocks Phase 1.
- [ ] `PROJECT_STATE.md` records reviewed artifacts and the next bounded implementation task.

## 6. Unresolved decisions / risk register

| ID | Question or risk | Why it matters | Owner / status |
| --- | --- | --- | --- |
| D-01 | Partial-range geometry, especially black-key endpoints | Correctness of both rendering paths | Unassigned / Open |
| D-02 | Coordinate space and sizing/fit behavior | Geometry and hit-testing parity | Unassigned / Open |
| D-03 | Pressed state outside visible range | Predictable state on range changes | Unassigned / Open |
| D-04 | Configuration merge and validation rules | Safe atomic public API updates | Unassigned / Open |
| D-05 | Shared scene and SVG ID isolation | DOM/static parity and multi-instance safety | Unassigned / Open |
| D-06 | Event and hit-test semantics | Future `interaction` integration without private DOM access | Unassigned / Open |
| D-07 | Unsafe overlay/text inputs and sanitization | Security in embedded and static SVG output | Unassigned / Open |
| D-08 | UMD/global shape and package exports | Offline and Anki deployment | Unassigned / Open |
| D-09 | Embedded browser support and verification matrix | Honest compatibility guarantees | Unassigned / Open |

These are **decisions to make**, not confirmed defects or blockers. Add a blocker only when a specific task cannot proceed safely.

## 7. Verification log

Record actual execution, including failures and unavailability. Never infer success from generated code or a previous model response.

| Date | Check / environment | Result | Evidence |
| --- | --- | --- | --- |
| 2026-11-21 | Documentation file inventory in supplied workspace | Ecosystem and keyboard architecture documents and development plan observed; package-local spec not observed | File inventory only |
| 2026-11-21 | Git branch/commit | Not available in supplied workspace | No `.git` directory observed |
| 2026-11-21 | Typecheck / tests / build / lint | **Not run** | Package implementation/scripts not observed |
| 2026-11-21 | Browser, accessibility, visual, Anki, offline smoke tests | **Not run** | No executable artifacts available |

**Last code changes:** None made as part of creating this state document.  
**Known implementation defects:** None verified; implementation status is unknown outside the supplied workspace.  
**Environmental limitations:** No actual Git history or runnable keyboard package was available here.

## 8. Next recommended session

**Task:** *Phase 0A — Requirements and architecture audit*.

1. Supply or inspect the real repository, including `packages/keyboard/PROJECT_SPEC.md` and any existing source.
2. Compare the keyboard spec, architecture, and ecosystem contracts; write a short issue/decision list.
3. Prioritize high-impact contracts: geometry endpoints, pressed-state policy, scene/IDs, hit testing, and bundle global.
4. Create ADRs for accepted choices; update architecture references.
5. Update this file with confirmed Git revision, changes, checks, blockers, and the next Phase 0 task.

**Do not begin broad feature implementation in this session** unless the blocking contracts are resolved. When ready, the first Phase 1 task is repository/tooling setup plus note utilities and focused tests.

## 9. Update protocol (for every future handoff)

When finishing a bounded task:

1. Change only statuses supported by reviewed code, decisions, and verification.
2. Replace the current-task checklist with the next concrete task; mark individual completed items with evidence.
3. Record files changed, commands actually run, results (including failures), and relevant commit/PR identifiers if known.
4. Link accepted ADRs; keep unresolved decisions visible. Record environment/client versions for compatibility claims.
5. Keep this document **short and current**. Commit history, test reports, and ADRs contain detailed history; avoid accumulating long session transcripts here.
6. If no commands were run, say **Not run** and why; if evidence is missing, say **Unknown** rather than **Passing**.

### Copy-ready handoff fields

```text
Date:
Branch / commit:
Phase / task:
Completed (with evidence):
Files changed:
Commands run and outcomes:
Known issues / blockers:
ADRs added or changed:
Next exact task:
```

---

**Working rule:** This file is the factual handoff. The specification says *what* is required, architecture says *how* it should work, and the development plan says *when* to build it. Do not confuse any of those with verified implementation progress.
