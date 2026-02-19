# oh-my-lilys

[![npm version](https://img.shields.io/npm/v/oh-my-lilys.svg)](https://www.npmjs.com/package/oh-my-lilys)
[![npm downloads](https://img.shields.io/npm/dw/oh-my-lilys.svg)](https://www.npmjs.com/package/oh-my-lilys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/JungHoonGhae/oh-my-lilys/blob/main/LICENSE)

| [<img alt="GitHub Follow" src="https://img.shields.io/github/followers/JungHoonGhae?style=flat-square&logo=github&labelColor=black&color=24292f" width="156px" />](https://github.com/JungHoonGhae) | Follow [@JungHoonGhae](https://github.com/JungHoonGhae) on GitHub for more projects. |
| :-----| :----- |
| [<img alt="X link" src="https://img.shields.io/badge/Follow-%40lucas_ghae-000000?style=flat-square&logo=x&labelColor=black" width="156px" />](https://x.com/lucas_ghae) | Follow [@lucas_ghae](https://x.com/lucas_ghae) on X for updates. |

CLI tool for lilys.ai - Summarize YouTube, PDF, websites, and audio directly from your terminal.

> **Disclaimer**: This is an independent CLI tool. It is not affiliated with, endorsed by, or sponsored by lilys.ai. lilys.ai™ is a trademark of its respective owners.

> **⚠️ Beta Notice**: This tool is currently in beta. Login methods (Naver, Email) are not yet fully implemented. Use at your own risk.

> This project reverse-engineers the lilys.ai API. Similar approach to steipete's bird project.

## Support

If this tool helps you, consider supporting its maintenance:

<a href="https://www.buymeacoffee.com/lucas.ghae">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50">
</a>

## Installation

### npm

```bash
npm install -g oh-my-lilys
```

### pnpm

```bash
pnpm add -g oh-my-lilys
```

### Bun

```bash
bun install
bun run src/index.ts <command>

# or global
bun add -g oh-my-lilys
```

### Run Directly

```bash
# Clone
git clone https://github.com/JungHoonGhae/oh-my-lilys.git
cd oh-my-lilys

# Build
bun install
bun run build

# Run
node dist/index.js <command>
```

## Usage

```
 █▀█ █ █ ▄▄ █▀▄▀█ █▄█ ▄▄ █   █ █   █▄█ █▀▀
 █▄█ █▀█    █ ▀ █  █     █▄▄ █ █▄▄  █  ▄▄█

  lilys.ai CLI - AI Summarizer
```

### Help

```bash
lilys help
lilys --help
lilys -h
```

### Version

```bash
lilys --version
lilys -v
```

### Login

```bash
lilys login <token>
```

To get a token:

1. Open https://lilys.ai in your browser
2. Log in with Google
3. Open DevTools (F12)
4. Application → Local Storage → lilys.ai
5. Copy the `access_token` value
6. Run: `lilys login <token>`

### Check Status

```bash
lilys whoami
```

### Doctor (Diagnostics)

```bash
lilys doctor
```

Automatically checks token validity, API connection, settings, and version.

### Upgrade

```bash
lilys upgrade
```

Check for new versions.

### Set AI Result Language

```bash
# Show current language
lilys lang

# Set AI result language (en, ko, ja, zh, etc.)
lilys lang ko
```

Sets the language for AI-generated summaries.

### Summarize URL

```bash
lilys summarize <url>
```

**Supported URL types:**

- YouTube: `https://www.youtube.com/watch?v=...`
- PDF: `https://.../file.pdf`
- Website: `https://example.com`

**Example:**

```bash
lilys summarize "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### List Sessions

```bash
lilys sessions
```

Shows all your Digest sessions.

### Get Report

```bash
lilys report <sessionId> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--note-type <type>` | Note type to generate |
| `--watch` | Wait for report completion |
| `--timeout <seconds>` | Wait timeout (default: 120) |
| `--export markdown` | Export as markdown |

**Note Types:**

| Type | Name | Description |
|------|------|-------------|
| `detailed` | Detailed report | Full detailed summary |
| `key_points` | Key report | Key points |
| `easy` | Easy report | Easy summary |
| `script` | Script | Script |
| `animation` | Animation | Animation |
| `infographic` | Infographic | Infographic |
| `background` | Background | Background |
| `deep_dive` | Deep Dive | Deep analysis |

**Examples:**

```bash
# Get default report
lilys report 8211090

# Generate specific type
lilys report 8211949 --note-type key_points
lilys report 8211949 --note-type detailed

# Wait for generation
lilys report 8211949 --note-type key_points --watch

# Export as markdown
lilys report 8211949 --export markdown
```

### Logout

```bash
lilys logout
```

Clears stored token.

## Project Structure

```
oh-my-lilys/
├── src/
│   ├── index.ts           # CLI entrypoint
│   ├── api/
│   │   └── client.ts     # API client
│   ├── commands/
│   │   ├── login.ts      # OAuth login
│   │   ├── summarize.ts  # URL summarization
│   │   ├── sessions.ts   # List sessions
│   │   ├── report.ts     # Get report
│   │   ├── doctor.ts     # Diagnostics
│   │   ├── upgrade.ts   # Check updates
│   │   └── language.ts   # Language settings
│   └── utils/
│       ├── config.ts     # Config/token management
│       └── logger.ts    # Logging/output
├── README.md
├── package.json
└── tsconfig.json
```

## Development

```bash
# Run
lilys <command>

# or with bun
bun run src/index.ts <command>

# Type check
bun run tsc

# Build
bun run build
```

## Troubleshooting

### "notProperUrl" Error

- The `process-input-link` API rejects some URLs
- Use `getSourceMetadata` for YouTube

### 502 Error

- `digest-session-resources-add` requires sessionId as a **number** (not string)

### 504 Error (Timeout)

- lilys.ai server is slow
- CLI works fine, try again later

### Token Errors

```bash
lilys doctor
```

Use doctor command to diagnose issues.

## License

MIT

## Links

- **lilys.ai**: [lilys.ai](https://lilys.ai) - Official website
- **GitHub**: [github.com/JungHoonGhae/oh-my-lilys](https://github.com/JungHoonGhae/oh-my-lilys) - Source code
- **npm Package**: [npmjs.com/package/oh-my-lilys](https://www.npmjs.com/package/oh-my-lilys)

## Contributing

Contributions are welcome! Feel free to submit a Pull Request at [github.com/JungHoonGhae/oh-my-lilys](https://github.com/JungHoonGhae/oh-my-lilys).

## Legal Notice

This project is provided "as is" without warranty of any kind. The use of lilys.ai API is subject to lilys.ai's terms of service. Users are responsible for complying with all applicable terms and conditions when using this CLI tool. Automated usage may violate lilys.ai's Terms of Service - use at your own risk and responsibility.
