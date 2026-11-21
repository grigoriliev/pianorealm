# 0004 — Mounted lifecycle, visual events and embedded hosts

**Status** — Accepted · 2026-11-21

## Context

Host contexts may persist across cards. Mounted instances own resources, and notification failures must preserve committed state.

## Decision

- **A-10.** Emit synchronous post-commit snapshots on real changes only. From a single transaction deliver range, orientation, skin, pressed notes, then effective viewport size, in that order when applicable. Deliver listener snapshots in subscription order. Subscriptions added or removed during dispatch affect the next event. Reject reentrant mutation/destroy during delivery with `Error`; reads and subscription changes may proceed. Continue delivery after a listener throws and send errors to a constructor-provided `onCallbackError` or host console; isolate error reporter failures. `on` returns an idempotent disposer. `use` accepts one synchronous setup function returning an optional cleanup and an idempotent removal handle; no registry or dependency graph. A failed setup must release its own partial resources. Run active cleanups in reverse installation order at teardown, continue after failures, and report via the same error channel.
- Mount into a caller-provided element, with a single live owner per container, and leave other host children alone. Stage configuration, initial nodes and resources with rollback on failure. On destroy stop observer and queued work, mark the instance destroyed, run cleanups, remove owned nodes and release mount and ID reservations. Send `destroyed` once to listeners present at teardown start, then clear subscriptions. Cleanup functions should hold their own disposers; instance use after destroy throws `Error` except idempotent destroy and returned disposers.
- **A-12.** Measure container content size in the adapter. Feature-detect `ResizeObserver`; when absent, measure initially and on explicit `resize()`. Coalesce observations and skip unchanged effective size. Keep zero-size mounts recoverable. Use scoped reduced-motion CSS and explicit motion-off; provide an SVG image name/description or decorative mode, no tab stops, and a shape indicator for pressed state. Use explicit host-selected theme/skin for night mode. On repeated card initialization the host disposes its prior instance before constructing another. Provide a self-contained static SVG workflow for hosts with scripting constraints.

## Alternatives

Async event delivery allows reentrant writes but introduces batching and teardown ambiguity. Automatically replacing a container's existing instance risks disposing consumers' resources. Polling old hosts adds timers. A generic extension registry adds ordering and dependency contracts.

## Consequences

Event listeners observe committed data. Minimum supported runtime versions and Anki support claims are deferred to actual tests. Prefer basic DOM/SVG and feature-detected optional APIs until then.

## Verification

Phase 3 verifies failed mount rollback, mount/double destroy/remount and isolated instances. Phase 6 verifies fallback sizing and reduced motion. Phase 8 verifies event order, no-ops, errors and cleanup. Phase 9 logs Anki client/version, OS/WebView, mount/card navigation, dark mode, offline mode and static fallback; unexecuted combinations are untested.

## References

[Spec §§13–16](../../PROJECT_SPEC.md), [package architecture §§10–14](../../ARCHITECTURE.md), [ecosystem architecture §§7–8](../../../../docs/ARCHITECTURE.md).
