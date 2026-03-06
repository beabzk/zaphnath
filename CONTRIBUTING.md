# Contributing

## Before you start

- Use Node.js `24.x` and pnpm `10+`.
- Install dependencies with `pnpm install`.
- Rebuild native modules with `pnpm run rebuild` if `better-sqlite3` does not load cleanly.
- Read the project overview in `README.md`.
- Read `docs/ENGINEERING-ARCHITECTURE.md` before changing preload, IPC, repository import, or renderer state contracts.

## Repository layout

- `packages/main`: Electron main process, SQLite access, repository import/discovery/validation, IPC handlers
- `packages/preload`: typed renderer bridge exposed through `window.*`
- `packages/renderer`: React UI, Zustand stores, reader, repository management, settings
- `types`: ambient app contracts shared across packages
- `docs`: ZBRS standards, implementation notes, and engineering guidance
- `tools`: versioning, validation, and one-off maintenance scripts

## Development workflow

1. Create a focused branch from `dev`.
2. Keep changes scoped to one improvement or bug fix when possible.
3. Prefer small commits with clear conventional-style messages such as `fix(renderer): tighten repository selection typing`.
4. Do not mix structural refactors, docs rewrites, and feature work unless they are directly coupled.
5. If you touch a large hotspot file, bias toward extracting a focused unit instead of adding more branching in place.

## Required checks

Run these before opening a PR:

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
```

Notes:

- There is not yet a real package-level automated test suite. CI currently validates buildability more than behavior.
- If you add tests as part of focused work, wire them into package scripts so CI executes them intentionally rather than implicitly.
- If a change cannot safely pass `build`, `typecheck`, and `lint`, document why in the PR and keep the scope small.

## Coding expectations

### TypeScript and boundaries

- Keep `packages/preload` stricter than the renderer. Do not expose loose or convenience-only APIs to the UI.
- Avoid `any` on preload, IPC, and store boundaries. Use named DTOs or `unknown` plus normalization.
- Do not introduce new undeclared `window.*` globals.
- Do not use `@ts-ignore` at boundary seams unless there is a temporary, documented blocker. Prefer fixing the contract.

### Repository and translation model

- Treat a parent repository and a readable translation as different entities.
- Keep parent repository metadata in `repositories`.
- Keep translation metadata in `repository_translations`.
- Keep imported readable content in `books` and `verses`.
- Do not reconstruct ad hoc translation shapes in multiple places if a shared mapper can own the conversion.

### Renderer

- Keep components focused on composition and presentation where possible.
- Move normalization, persistence repair, and cross-view state shaping into stores or adapters instead of repeating it in components.
- Prefer shared UI primitives from `packages/renderer/src/components/ui` over hand-rolled controls.

### Main process

- Keep IPC handlers thin. Validation, transport wiring, and service orchestration should stay separate where practical.
- Avoid logging sensitive or noisy user data such as raw search terms unless gated behind explicit debug behavior.
- Keep raw database access private to the main process.

## Pull requests

Each PR should include:

- a short problem statement
- the chosen approach and any tradeoffs
- file or subsystem impact
- commands run for verification
- screenshots or short notes for visible UI changes

If a change intentionally defers follow-up work, call that out explicitly.

## Documentation expectations

- Update `README.md` when developer-facing commands, setup, or core terminology changes.
- Update `docs/ENGINEERING-ARCHITECTURE.md` when changing data-model ownership, preload/IPC contracts, or renderer state ownership.
- Update ZBRS docs only when the standard or implementation guidance actually changes.

## Release and versioning notes

- Use `pnpm run version:info` to inspect version state.
- Use the `version:*` scripts for semver changes.
- Use the `zbrs:version:*` scripts when repository-standard versioning needs to move in lockstep.
- Do not change release automation or distribution-channel handling casually; verify workflow and builder impacts together.
