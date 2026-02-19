# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

[unreleased]: https://github.com/JungHoonGhae/oh-my-lilys/compare/v1.0.0-beta.2...HEAD
[1.0.0-beta.2]: https://github.com/JungHoonGhae/oh-my-lilys/compare/v1.0.0-beta.1...v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/JungHoonGhae/oh-my-lilys/releases/tag/v1.0.0-beta.1
