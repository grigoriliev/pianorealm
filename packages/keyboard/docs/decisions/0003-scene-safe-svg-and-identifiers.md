# 0003 — Shared scene, declarative SVG and identifier isolation

**Status** — Accepted · 2026-11-21

## Context

Mounted and static renderers must share placement and appearance, safely handling text and overlays for multiple keyboards.

## Decision

- **A-07.** Build a pure typed scene from layout, resolved appearance, pressed notes and overlay data. Scene identifies keys by MIDI and definitions by semantic slot. One shared key scene builder also generates changed fragments for live state updates. Scene consumers only materialize nodes or serialize. Layer background, white bodies, black bodies, labels/indicators, then user overlays. Apply key-state fills to their key bodies. Clip all per-key decorations to their visible key area, subtracting overlying black footprints from white clips. Preserve overlay input order within each note and order note groups by MIDI. Keep retained overlay assignments when a note leaves the range.
- **A-08.** Offer typed text, badges and numeric shape primitives (including validated path commands with finite operands) with bounded data, supported SVG attributes and explicit clipping. Accept documented color tokens such as hex and transparent; gradients use typed stops and generate internal references. Validate CSS values by type and allowlist; user text remains text. Reject raw markup, arbitrary attributes, stylesheets, URLs, external assets and event attributes. Serialize XML with context-appropriate escaping and reject invalid XML characters, including isolated surrogates. Construct mounted nodes with SVG DOM APIs and text nodes.
- Allocate IDs at output time. Live output reserves a per-document prefix across module copies and checks document IDs before mount; keep the prefix through structural updates and release the reservation on destroy. Default static output allocates a unique prefix within the loaded library copy; callers co-embedding separate runs or copies must supply distinct prefixes. For reproducible bytes use an explicit validated `idPrefix` and canonical ordering/number formatting. Prefix every definition and accessible-name reference, and scope any embedded CSS to that root. Cross-output parity compares scene semantics with prefixes normalized.

## Alternatives

Independent renderers double placement and style logic. A content hash alone collides for repeated identical renders. Raw SVG with sanitizer hooks expands the supported input surface and introduces dependency and portability costs.

## Consequences

Consumers copying a static string multiple times must regenerate it with distinct prefixes or embed each copy as an isolated image. Standard built-in shapes and validated custom geometry share one live/static pipeline.

## Verification

Phase 3 compares scene-derived bounds, order and paint properties, tests multiple live instances and rejects unsafe inputs. Phase 7 verifies per-key design and clipping. Phase 9 verifies standalone XML parsing, repeatable explicit prefixes, default prefix isolation per copy, and Node import without DOM globals.

## References

[Spec §§7, 9–10, 14–16](../../PROJECT_SPEC.md), [package architecture §§7, 13](../../ARCHITECTURE.md).
