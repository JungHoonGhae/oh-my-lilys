# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.2.0] - 2026-02-27

### Added
- `search` command — keyword search across sessions (`--limit`, `--json`)
- `delete` command — delete sessions with confirmation prompt (`--yes`)
- `usage` command — view plan usage and quota (`--json`)
- `share` / `unshare` commands — public sharing of session reports
- `export-pdf` command — export report as PDF file (`--output`, `--note-id`)
- `collections` / `col` command — manage collections (list, create, rename, delete, move)
- `report --note-type` — web-compatible note generation (Detailed/Key/Easy/Script etc.)
- `report --generate` — SSE streaming tailored summary (`--watch`, `--images`, `--export`)
- `report --visual` — trigger visual rendering for Easy reports
- macOS Keychain integration for secure token storage
- Browser token extraction (Chrome, Arc, Dia, Brave, Edge)
- Firebase token auto-refresh
- Retry wrapper for transient API errors
- Test suite (`bun test`) — HTML parsing, CLI, retry, keychain

### Changed
- `auth` now extracts tokens directly from browser IndexedDB (no manual paste needed)
- `report` now fetches from `versions[0].initialMarkdownUnits` for full content
- HTML parsing improved for note content rendering

### Fixed
- Version injected at build time (no longer reads `package.json` at runtime)
- Auth error handling improved with clearer messages
- `note-tabs` registration added to note generation flow

## [1.0.0-beta.2] - 2026-02-19

### Added
- `auth` command (replaces `login`)
- Skill for AI agents (oh-my-lilys)
- `.github/FUNDING.yml` for sponsorship
- GitHub Actions CI workflow
- GitHub Actions publish workflow (npm + GitHub Release)
- Changesets for version management

### Changed
- Login methods display: Google (available), Naver/Email (coming soon)
- Replaced deprecated `actions/create-release@v1` with `softprops/action-gh-release@v2`

### Fixed
- GitHub Release now creates even if npm publish fails
- Proper `contents: write` permission for release creation

### Removed
- `FUNDING.json` (replaced with `.github/FUNDING.yml`)

## [1.0.0-beta.1] - 2026-02-19

### Added
- Initial release
- CLI commands: login, summarize, sessions, report, lang, doctor, upgrade, logout, whoami
- ASCII banner
- npm/pnpm/bun installation support

[unreleased]: https://github.com/JungHoonGhae/oh-my-lilys/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/JungHoonGhae/oh-my-lilys/compare/v1.1.1...v1.2.0
[1.0.0-beta.2]: https://github.com/JungHoonGhae/oh-my-lilys/compare/v1.0.0-beta.1...v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/JungHoonGhae/oh-my-lilys/releases/tag/v1.0.0-beta.1
