# oh-my-lilys

[![skills.sh](https://skills-badge.vercel.app/badge/JungHoonGhae/skills/oh-my-lilys?style=flat-square&label=installs)](https://skills.sh/JungHoonGhae/skills/oh-my-lilys)
[![npm version](https://img.shields.io/npm/v/oh-my-lilys.svg)](https://www.npmjs.com/package/oh-my-lilys)
[![npm downloads](https://img.shields.io/npm/dw/oh-my-lilys.svg)](https://www.npmjs.com/package/oh-my-lilys)
[![GitHub stars](https://img.shields.io/github/stars/JungHoonGhae/oh-my-lilys)](https://github.com/JungHoonGhae/oh-my-lilys/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/JungHoonGhae/oh-my-lilys/blob/main/LICENSE)

| [<img alt="GitHub Follow" src="https://img.shields.io/github/followers/JungHoonGhae?style=flat-square&logo=github&labelColor=black&color=24292f" width="156px" />](https://github.com/JungHoonGhae) | Follow [@JungHoonGhae](https://github.com/JungHoonGhae) on GitHub for more projects. |
| :-----| :----- |
| [<img alt="X link" src="https://img.shields.io/badge/Follow-%40lucas_ghae-000000?style=flat-square&logo=x&labelColor=black" width="156px" />](https://x.com/lucas_ghae) | Follow [@lucas_ghae](https://x.com/lucas_ghae) on X for updates. |

CLI tool for lilys.ai — summarize YouTube, PDFs, websites, and audio. Manage your sessions, generate reports, and export content directly from your terminal.

> **Disclaimer**: This is an independent CLI tool. It is not affiliated with, endorsed by, or sponsored by lilys.ai. lilys.ai™ is a trademark of its respective owners.

## Features

- 📺 **Summarize** — YouTube videos, PDFs, websites, audio files
- 📋 **Reports** — Generate Detailed, Key, Easy, Script and more report types
- 🔍 **Search** — Find sessions by keyword
- 📁 **Collections** — Organize sessions into collections
- 🔗 **Share** — Create public share links for reports
- 📄 **Export** — Download reports as PDF, Markdown
- 📊 **Usage** — Track your plan usage and quota
- 🔐 **Auth** — Auto token extraction from browser (Chrome, Arc, Dia, Brave, Edge)

## Installation

```bash
npm install -g oh-my-lilys
# or
bun add -g oh-my-lilys
```

## Quick Start

```bash
# Authenticate (auto-detects token from your browser)
lilys auth

# Summarize a YouTube video
lilys summarize https://youtube.com/watch?v=...

# List your sessions
lilys sessions

# Search sessions
lilys search "machine learning"

# Generate a report
lilys report <session-id> --note-type detailed --watch
```

## Authentication

```bash
lilys auth
```

Automatically extracts your token from a logged-in browser (Chrome, Arc, Dia, Brave, or Edge). No manual copy-paste needed.

**Manual fallback:**
```bash
# 1. Open https://lilys.ai and log in
# 2. Open DevTools → Application → Local Storage → copy access_token
lilys auth <your-token>
```

## Commands

### Summarize

```bash
lilys summarize <url>
```

### Sessions

```bash
lilys sessions                    # List all sessions
lilys sessions list --json        # JSON output
lilys delete <id>                 # Delete a session
lilys delete <id> --yes           # Skip confirmation
```

### Search

```bash
lilys search "keyword"
lilys search "AI" --limit 5 --json
```

### Reports

```bash
lilys report <id>                             # Fetch latest report
lilys report <id> --note-type detailed        # Generate Detailed report
lilys report <id> --note-type key_points      # Generate Key report
lilys report <id> --note-type easy            # Generate Easy (visual) report
lilys report <id> --note-type detailed --watch  # Wait for completion
lilys report <id> --generate textbook         # SSE streaming generation
lilys report <id> --export markdown           # Export as Markdown
```

**Available note types:** `detailed`, `key_points`, `easy`, `script`, `animation`, `infographic`, `background`, `deep_dive`

### Export PDF

```bash
lilys export-pdf <id>
lilys export-pdf <id> --output report.pdf
lilys export-pdf <id> --note-id <note-id>
```

### Share

```bash
lilys share <id>                  # Create public share link
lilys unshare <id>                # Remove public sharing
```

### Usage

```bash
lilys usage
lilys usage --json
```

### Collections

```bash
lilys collections                             # List collections
lilys col create "My Collection"              # Create collection
lilys col rename <col-id> "New Name"          # Rename collection
lilys col move <col-id> <session-id...>       # Move sessions
lilys col delete <col-id>                     # Delete collection
```

### Utilities

```bash
lilys lang                        # Show current language setting
lilys lang ko                     # Set result language
lilys whoami                      # Check authentication status
lilys doctor                      # Diagnose issues
lilys upgrade                     # Check for updates
```

## Support

If this tool helps you, consider supporting its maintenance:

<a href="https://www.buymeacoffee.com/lucas.ghae">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50">
</a>

## AI Agent Skill

```bash
npx skills add JungHoonGhae/skills@oh-my-lilys
```

## Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | >= 18 |
| lilys.ai account | Required |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

```bash
git clone https://github.com/JungHoonGhae/oh-my-lilys.git
cd oh-my-lilys
bun install
bun test
```

## License

MIT — See [LICENSE](https://github.com/JungHoonGhae/oh-my-lilys/blob/main/LICENSE) for details.
