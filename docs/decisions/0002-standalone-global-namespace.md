# 0002 — Classic-script namespace and collision policy

**Status** — Accepted · 2026-11-21

## Context

Offline embedding requires a classic-script build. Independently loaded packages and repeated card initialization may share a JavaScript context.

## Decision

A keyboard classic script installs the constructor at `Pianorealm.Keyboard`, including its static rendering method. Create the namespace only if absent and preserve sibling members. A duplicate load of the same package/version reuses the installed constructor, identified by a stable own build marker. Fail clearly without changing existing bindings for an incompatible namespace, occupied unrecognized member, different version or non-writable installation target. Use own properties and an explicit global installer.

Package root exports ESM plus types, with no CommonJS condition initially. Target `pianorealm-keyboard.esm.js` in an ESM-typed package and `pianorealm-keyboard.umd.js` plus `pianorealm-keyboard.umd.min.js` as standalone browser artifacts, outside the npm import contract. The classic branch must follow the installer policy. Bundle styling and resources locally. Future packages opt in to a standalone artifact.

## Alternatives

A bare constructor global simplifies older templates but consumes a global per package. Exporting a module object under `Keyboard` would accommodate more functions at the cost of changing constructor access. Supporting CommonJS would expand the artifact matrix.

## Consequences

Side-by-side versions in one realm require isolation or a future namespace decision. The filename and loader behavior require built-artifact verification.

## Verification

At Phase 9, test a classic script with a preexisting sibling member, duplicate load and incompatible load. Verify constructor identity and unchanged bindings. With networking disabled, mount and render static SVG. Verify ESM and declarations from the packed artifact at Phase 10.

## References

[Ecosystem architecture §9](../ARCHITECTURE.md#9-distribution-and-browser-globals), [keyboard spec §16](../../packages/keyboard/PROJECT_SPEC.md#16-embedded-environments-and-anki).
