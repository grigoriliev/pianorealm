# 0001 — Start with one independently buildable package

**Status** — Accepted · 2026-11-21

## Context

The checkout already places the keyboard under `packages/keyboard`. Phase 1 needs a repeatable package build and test loop.

## Decision

Keep the current layout. Put the manifest, lockfile, strict TypeScript configuration, Vite library configuration and Vitest scripts in the keyboard package. Use npm from that directory. Expose an explicit package root with named ESM exports and generated declarations. Keep internal paths private. Pick concrete tool versions and a compatible local Node baseline in Phase 1 and record them in package metadata.

## Alternatives

A root workspace would centralize installs and scripts. A separate repository would maximize isolation while moving shared documentation and coordination across repositories.

## Consequences

The first package can build without root tooling. Revisit workspace policy when a second real package requires coordinated development.

## Verification

Phase 1 must run `npm ci`, `npm run typecheck`, `npm test` and `npm run build` from the package and smoke-test the emitted root import in Node with no DOM globals. Review the export map and internal dependency directions before publishing.

## References

[Ecosystem §9](../ECOSYSTEM.md#9-repository-strategy), [ecosystem architecture §10](../ARCHITECTURE.md#10-repository-and-build-architecture), [Phase 1](../../packages/keyboard/DEVELOPMENT_PLAN.md#6-phase-1--tooling-note-utilities-and-configuration).
