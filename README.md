# Zaphnath Bible Reader

Zaphnath is a cross-platform desktop Bible reader built with Electron, React, and TypeScript. It imports Bible content using ZBRS (Zaphnath Bible Repository Standard), stores data in SQLite, and provides an offline-first reading experience.

## Status

Pre-release project. The app is actively evolving and schema/data internals may change before public release.

## What Works Today

- Import ZBRS repositories from remote URLs (parent repositories with translations)
- Discover repositories from the official registry
- Read by repository, book, chapter, and verse
- Search verses locally
- Create bookmarks, notes, and highlights
- Manage appearance and reading settings

## Requirements

- Node.js `24.x` (see `.nvmrc`)
- pnpm `10+`

## Quick Start

```bash
pnpm install
pnpm start
```

## Common Commands

| Command | Purpose |
| --- | --- |
| `pnpm start` | Run app in development mode |
| `pnpm run build` | Build all workspaces |
| `pnpm run compile` | Build distributable app packages |
| `pnpm run typecheck` | Run TypeScript checks across workspaces |
| `pnpm run lint` | Run ESLint |
| `pnpm run lint:fix` | Run ESLint with autofix |
| `pnpm run rebuild` | Rebuild native modules |

## Versioning

### App version

- Show version info: `pnpm run version:info`
- Bump semver: `pnpm run version:patch` / `pnpm run version:minor` / `pnpm run version:major`
- Set explicit version: `pnpm run version:set -- 0.1.2`
- Tag current version: `pnpm run version:tag`
- Tag and push: `pnpm run version:tag -- --push`

### ZBRS version

- Show detected ZBRS versions: `pnpm run zbrs:version:show`
- Bump ZBRS version across related repos: `pnpm run zbrs:version:set -- 1.1`

## Repository Layout

- `packages/main`: Electron main process, database, repository import/validation
- `packages/preload`: secure IPC bridge exposed to renderer
- `packages/renderer`: React UI, state stores, reader/search/settings views
- `docs`: ZBRS standards, implementation guide, and JSON schemas
- `tools`: versioning and ZBRS utility scripts

## ZBRS Docs

- Implementation guide: `docs/ZBRS-IMPLEMENTATION-GUIDE.md`
- Standard v1.1: `docs/standards/zbrs-v1.1.md`
- Schemas:
  - `docs/schemas/manifest.schema.json`
  - `docs/schemas/book.schema.json`

Related repositories:

- Official translations: `https://github.com/beabzk/zbrs-official`
- Official registry: `https://github.com/beabzk/zbrs-registry`

## Data Model (Current)

- `repositories` stores parent repositories
- `repository_translations` stores translation metadata under each parent
- `books` and `verses` store imported translation content
- `user_settings` stores app-level preferences

## License

MIT. See `LICENSE`.
