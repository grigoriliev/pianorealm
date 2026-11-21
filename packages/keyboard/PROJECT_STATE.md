# `@pianorealm/keyboard` — Project State

> **Status:** Planning · **Current phase:** Phase 0 — Complete
> **Last updated:** 2026-11-21 · **Maintainer:** Project contributors

## Verified snapshot

- Checkout: `main` at `fff34bbff776b678d0a8e2a1d4bcce7d2c48ca2b` before this documentation update. Pre-existing untracked `.idea/` files were outside scope.
- Reviewed both ecosystem documents, both applicable `AGENTS.md` files, the invoked planning prompt, and the package specification, architecture, development plan and prior state. `packages/keyboard/PROJECT_SPEC.md` is present. Neither ADR directory existed before this review.
- The checked-out project contained planning documents and a license. The inventory found no keyboard source, test suite, package manifest, or build configuration.
- The [Phase 0 review](docs/PHASE_0_REVIEW.md) records the audit, conflict proposals, architecture blueprint, risk register and design fixtures. Six ADRs are linked from the [package architecture](ARCHITECTURE.md#phase-0-review-references). The maintainer accepted all six on 2026-11-21.
- Phase 1–10 are Not started. Typecheck, tests, builds, browser, accessibility and Anki checks were not run. The checkout had no runnable keyboard package.

## Verification

- `git status --short --untracked-files=all` reported the pre-existing IDE files in the initial inventory. `git ls-files` and `find packages/keyboard docs -name AGENTS.md -o -type d -name decisions` confirmed the tracked scope and applicable package guidance. `git log -1 --format='%H %D'` identified the checkout.
- `git diff --check` passed after an initial whitespace finding was fixed. An inline `python3 -` check validated ADR headings and statuses, local document targets in the review/state/ADRs, new-document whitespace, nine proposed pitch extents and the black-endpoint offsets. The calculations checked design fixtures.

## Gate and next task

Phase 0 is complete. The audit, accepted ADRs, module and API sketches, and geometry fixtures are in place. The maintainer approved all six ADRs and confirmed that key dimensions belong to sizing options and skin tokens are appearance-only. Spec §9 records that decision. Optional public key bounds, CommonJS, and exact browser and Anki support floors remain deferred.

Next session: begin [Phase 1](DEVELOPMENT_PLAN.md#6-phase-1--tooling-note-utilities-and-configuration) with package-local TypeScript, Vite and Vitest setup, followed by note normalization and inclusive range validation with focused tests. Phase 1 has not started.
