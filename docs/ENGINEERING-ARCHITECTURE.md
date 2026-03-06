# Engineering Architecture

This document describes the current implementation boundaries for Zaphnath. It is intentionally short and should be kept in sync with the codebase as the app evolves.

## System shape

Zaphnath is split into three runtime layers:

- `packages/main`: owns Electron integration, SQLite access, repository import/discovery/validation, and IPC registration
- `packages/preload`: exposes the renderer-safe API surface
- `packages/renderer`: owns the React UI, Zustand stores, and view composition

The direction of dependency should stay one-way:

`main` -> `preload contract` -> `renderer`

The renderer should consume explicit capabilities, not low-level internals from the main process.

## Data model

There are two related but different concepts in the app:

- **Parent repository**: the imported ZBRS source package that coordinates one or more translations
- **Translation**: the actual readable Bible text variant selected by the user

Current storage ownership:

- `repositories`: parent repository metadata
- `repository_translations`: translation metadata under a parent repository
- `books` and `verses`: imported readable translation content
- `user_settings`: app preferences

Implementation rule:

- Do not treat a parent repository row and a readable translation row as interchangeable just because they share some fields.

## Boundary rules

### Main process

- Owns database access and repository orchestration.
- Must validate inputs from IPC before they reach the query/import layers.
- Should expose explicit domain operations, not convenience passthroughs.

### Preload

- Must be the strictest public boundary in the app.
- Should translate renderer requests into typed IPC calls.
- Should not expose raw SQL, undeclared globals, or loosely typed helper APIs.

### Renderer stores

- Own normalized application state for views.
- May adapt backend payloads once, close to the boundary.
- Should avoid repeated inline reconstruction of the same entity shape across multiple stores and components.

### Renderer components

- Own rendering, user interaction, and local UI state.
- Should not be the primary place where repository/translation domain normalization happens.
- Should use shared UI primitives unless a native element is specifically required.

## Repository and translation normalization

When adding or changing repository-related features:

1. Normalize backend payloads once.
2. Keep one canonical translation selection shape for the renderer.
3. Persist only the minimum selection state needed to restore the current reading context.
4. Avoid duplicating translation lookup and reconstruction logic in the reader, repository list, and stores.

If a new feature needs both parent and translation information, prefer a mapper or adapter over ad hoc object assembly inside a component.

## IPC contract policy

Follow these rules when adding a new IPC channel:

1. Add an explicit request and response shape.
2. Validate inputs at the IPC boundary.
3. Keep the handler thin and delegate business logic to a service.
4. Reflect the contract in `types/env.d.ts` and `packages/preload/src/index.ts`.
5. Do not introduce `any` at the boundary unless there is a temporary migration plan attached to it.

## UI feature policy

- Do not ship placeholder controls in primary surfaces unless there is a deliberate product reason.
- Gate debug-only screens and diagnostics behind development or explicit product policy.
- Prefer one clear primary action per screen state instead of several competing affordances.

## Hotspots to treat carefully

These areas carry the most coupling today and should be changed in small, reviewed steps:

- `packages/main/src/services/repository/importer.ts`
- `packages/main/src/services/repository/discovery.ts`
- `packages/main/src/services/repository/validator.ts`
- `packages/renderer/src/components/repository/RepositoryImportDialog.tsx`
- `packages/renderer/src/components/reader/Reader.tsx`
- `packages/renderer/src/stores/repositoryStore.ts`

When touching these files, prefer extracting a smaller unit instead of expanding the file further.
