# 0002 — Layout, viewport fitting and geometry queries

**Status** — Accepted · 2026-11-21

## Context

Partial ranges need deterministic dimensions and the future interaction adapter needs key identity from the rendered layout.

## Decision

- **A-03.** Lay whites consecutively using equal pitch width. Center each black over the seam between the surrounding whites, using virtual whites where needed. Take the pitch-axis union of visible rectangles and translate its minimum to zero. Always retain full white-key depth in the viewport, including a single black note. Default white pitch/depth is 20/100, black pitch/depth 12/60. Draw whites before blacks, each group in ascending MIDI order. For horizontal bounds `(x,y,w,h)` and pitch extent `L`, vertical bounds are `(y,L-x-w,h,w)`; rotate placement, keep text upright.
- **A-04.** Use SVG user units. Keep intrinsic geometry under container resize; center uniform contain scaling in the available content box. Excess area is blank. In fixed mode each omitted viewport dimension defaults to the corresponding oriented intrinsic extent. Clip decorative paint to the viewport, with scrolling and minimum size controls deferred. An unavailable, disconnected or zero-size container in container mode has no active viewport; measure on notification or explicit `resize()`. Static output defaults to fixed intrinsic size and takes explicit viewport dimensions without measuring.
- **A-09.** Keep the pure query in logical units, with half-open rectangles and black precedence; styling, rounded corners and overlays leave hit regions unchanged. The proposed mounted `getNoteAtPoint(clientX, clientY): number | null` accepts viewport CSS pixels. Invert the mounted root's screen transform inside the adapter, accounting for translation, scaling, scrolling, orientation and letterboxing without an explicit device-pixel-ratio conversion. Return null for points outside displayed key bounds or if the transform is unavailable/noninvertible. Non-finite inputs are invalid; use after destroy throws. Callers own input listeners and gesture mapping. Host overlays and unrelated ancestors' clipping are outside the geometric query.

## Alternatives

Clipping endpoint blacks to the included white span loses visible key area and needs a single-black special case. Stretching axes fills the container but distorts the key ratio. A viewBox-space public method alone would require a second public coordinate-conversion contract for input adapters.

## Consequences

A black endpoint can create blank space below its protrusion. Short and long ranges retain proportions while occupying different fractions of the same container. Actual transformed-host behavior needs browser evidence.

## Verification

Use the numeric fixtures in the [Phase 0 review](../PHASE_0_REVIEW.md). Verify pure layout in Phase 2 and DOM fit in Phase 3. Verify the public coordinate mapping under scroll, CSS transforms and different device pixel ratios in Phase 8.

## References

[Spec §§6, 11–12](../../PROJECT_SPEC.md), [package architecture §6](../../ARCHITECTURE.md#6-geometry-engine), [ecosystem architecture §6](../../../../docs/ARCHITECTURE.md#6-keyboard-specific-integration-surface).
