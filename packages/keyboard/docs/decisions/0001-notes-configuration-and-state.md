# 0001 — Note normalization, configuration transactions and visual state

**Status** — Accepted · 2026-11-21

## Context

Phase 1 needs stable note and configuration rules. Later renderers must agree on state and visibility.

## Decision

- **A-02.** Accept integers 0–127 or trimmed strings matching an ASCII A–G letter (case-insensitive), optional single `#`, `b`, `♯` or `♭`, and a decimal octave with an optional leading minus. Apply the accidental before checking the final range, including octave crossings. MIDI = `12 × (octave + 1 − octaveOffset) + naturalPitchClass + accidental`. A positive offset raises the displayed octave, so +1 spells 60 as C5 and parses C5 as 60. Default to sharps and offset zero. Accept inclusive equal endpoints. Throw `TypeError` for malformed syntax/types, `RangeError` for numeric/domain violations such as invalid MIDI or reversed ranges.
- **A-05.** Store a set of normalized MIDI notes independent of the visible range. Replace atomically in `setPressedKeys`, deduplicate equivalent inputs and return a fresh ascending array. Press adds, release removes, and repeated operations are no-ops. Render the visible intersection. Preserve pressed notes and overlay assignments across range, skin, orientation, notation and size changes. Interpret names at ingestion and keep normalized MIDI thereafter.
- **A-06.** Default to MIDI 21–108, horizontal, container sizing for mounted instances, Minimal skin, empty state and overlays. Validate known options recursively before committing. Merge only declared nested records, replace arrays and named skin selections, and treat range as a whole endpoint pair. Omitted fields preserve values. An explicit `undefined` resets an optional field to its default or removes an appearance override. Reject unknown fields and invalid combinations. Validate notation before normalizing endpoints in the same patch. `container` is construction-only. Require positive finite configured dimensions and black dimensions no greater than the corresponding white dimensions, with black width strictly smaller. Resolve defaults → selected skin → explicit appearance overrides → explicit accessibility constraints. Keep pitch/depth sizing in sizing options. Register custom appearance tokens per instance, reject duplicate names including built-ins, and allow inline tokens for static use.

## Alternatives

Clamping notes hides caller errors. Discarding offscreen notes reduces state but loses continuity. Replacing whole nested objects simplifies validation but forces callers to resend unrelated values. Letting skins supply key metrics makes a skin change affect geometry.

## Consequences

A logical note can be pressed while invisible. Changing notation does not reinterpret existing notes. Key dimensions are configured through sizing options as specified in [spec §9](../../PROJECT_SPEC.md#9-skins-styling-and-customization).

## Verification

Phase 1 covers parsing, formatting, range and rejected patches. Phase 4 verifies retained notes reappear after restoring a range, duplicate/no-op updates and unchanged state after an invalid batch. Phase 5 verifies override reset and precedence.

## References

[Spec §§5, 8–9, 12](../../PROJECT_SPEC.md), [architecture §§4–5, 8–9](../../ARCHITECTURE.md), [plan §§6, 9–10](../../DEVELOPMENT_PLAN.md).
