# lilys-cli Plan

## Project Overview
- **Project Name**: lilys-cli
- **Type**: CLI Tool (like steipete's bird project)
- **Purpose**: Reverse-engineered CLI for lilys.ai - multimodal AI summarizer
- **Target Users**: Developers power users who want to summarize YouTube, PDF, audio, websites from terminal

## Discovered API Endpoints

### Authentication
- **Method**: Firebase Google OAuth
- **Required**: Google idToken
- **Flow**: Login via Google → Extract idToken from Firebase → Use in API requests
- **Token Storage**: `~/.lilys/config.json`

### API Bases

| Base URL | Purpose |
|----------|---------|
| `https://api.lilys.ai/backend` | Main API (sessions, resources) |
| `https://wp8tovrz8a.execute-api.ap-northeast-2.amazonaws.com/release` | AWS API (notes, reports) |
| `https://5wjqcmluif.execute-api.ap-northeast-2.amazonaws.com/release` | Metadata API (YouTube sourceId) |

### Core Endpoints

1. **Create Digest Session**
   ```
   POST https://api.lilys.ai/backend/digest-session-v2?provider=google
   Headers: Authorization: Bearer <idToken>
   Body: { "sourceId": "<source_id>", "sourceType": "youtube_video", "resources": [...] }
   Response: { "result": { "sid": 8211090, "name": "..." } }
   ```

2. **Add Resource to Session** (IMPORTANT: sessionId must be NUMBER, not string)
   ```
   POST https://api.lilys.ai/backend/digest-session-resources-add?provider=google
   Headers: Authorization: Bearer <idToken>
   Body: { "sessionId": 8211090, "resources": [{ "sourceId": "...", "sourceType": "youtube_video" }] }
   Response: { "sessionId": 8211090, "addedResources": [...] }
   ```

3. **List Sessions**
   ```
   GET https://api.lilys.ai/backend/digest-sessions?provider=google&limit=50&page=1
   Headers: Authorization: Bearer <idToken>
   Response: { "digestSessions": [...] }
   ```

4. **Get Source Metadata** (for YouTube)
   ```
   GET https://5wjqcmluif.execute-api.ap-northeast-2.amazonaws.com/release/metadata?sourceId=<id>
   Headers: x-api-key: release
   Response: { "sourceId": "...", "sourceType": "...", "title": "..." }
   ```

5. **Generate Note/Report**
   ```
   POST https://wp8tovrz8a.execute-api.ap-northeast-2.amazonaws.com/release/notes?provider=google
   Headers: Authorization: Bearer <idToken>, x-api-key: release
   Body: { "sessionId": "<id>", "noteType": "detailed|key_points|easy|script|..." }
   Response: { "noteId": "9171211" }
   ```

6. **Get Notes List**
   ```
   GET https://wp8tovrz8a.execute-api.ap-northeast-2.amazonaws.com/release/notes/{sessionId}?provider=google
   Headers: Authorization: Bearer <idToken>, x-api-key: release
   Response: { "notes": [{ "sid": 9171211, "noteType": null, ... }] }
   ```

7. **Get Note Content**
   ```
   GET https://wp8tovrz8a.execute-api.ap-northeast-2.amazonaws.com/release/notes/{sessionId}/{noteId}?provider=google
   Headers: Authorization: Bearer <idToken>, x-api-key: release
   Response: { "note": { "content": "<html>..." } }
   ```

### Note Types (Discovered from UI)

| Type | Name | Status |
|------|------|--------|
| `detailed` | Detailed report | ✅ |
| `key_points` | Key report | ✅ |
| `easy` | Easy report | ✅ |
| `script` | Script | ✅ |
| `animation` | Animation | ✅ (New) |
| `infographic` | Infographic | ✅ |
| `background` | Background | ✅ |
| `deep_dive` | Deep Dive | ✅ |

### Source Types

| Type | Description |
|------|-------------|
| `youtube` | YouTube (used in metadata API) |
| `youtube_video` | YouTube (used in session API) |
| `pdf` | PDF files |
| `website` | Web pages |
| `audio` | Audio files |

## Known Issues & Solutions

1. **"notProperUrl" error**: Use `getSourceMetadata` instead of `process-input-link` for YouTube
2. **502 error on addResource**: sessionId must be NUMBER, not string - use `parseInt(sessionId, 10)`
3. **504 timeout**: lilys.ai server is slow, CLI works correctly

## Test Data

- **User**: junghoon0112@gmail.com
- **Session**: 8211090 (Sam Altman - How to Succeed with a Startup)
- **Note**: 9171211
- **YouTube Test**: dQw4w9WgXcQ (Rick Astley)

## Architecture

```
lilys-cli/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── auth/
│   │   └── firebase.ts    # Firebase auth token extraction
│   ├── api/
│   │   ├── client.ts      # API client wrapper
│   │   ├── endpoints.ts   # Endpoint definitions
│   │   └── types.ts      # TypeScript types
│   ├── commands/
│   │   ├── login.ts      # Authenticate
│   │   ├── summarize.ts  # Summarize URL
│   │   ├── session.ts    # List sessions
│   │   └── report.ts     # Get report
│   └── utils/
│       ├── config.ts     # Config management
│       └── output.ts     # Output formatters
├── bin/
│   └── lilys             # Executable
├── package.json
├── tsconfig.json
└── README.md
```

## Commands

### `lilys login`
- Opens browser for Google OAuth
- Extracts Firebase idToken
- Stores token securely (keychain/file)

### `lily summarize <url>`
- Detect URL type (YouTube, PDF, audio, website)
- Process through lilys.ai API
- Return session ID
- Optional: wait for completion and show summary

### `lilys sessions`
- List user's digest sessions

### `lilys report <sessionId>`
- Get full report/notes for session

### `lilys logout`
- Clear stored credentials

## Implementation Steps

1. Initialize Bun + TypeScript project
2. Implement Firebase token extraction (browser-based OAuth)
3. Build API client with all endpoints
4. Create CLI commands
5. Add output formatters (JSON, markdown, plain text)
6. Test with actual API calls
7. Error handling and retry logic

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **CLI Framework**: Commander or just vanilla
- **HTTP Client**: Built-in fetch or Bun's HTTP
- **Auth**: Puppeteer/Playwright for token extraction (like bird project)

## Notes

- Test credentials: junghoon0112@gmail.com
- Test session: 8211090
- Test note: 9171211
- Test video: Sam Altman - How to Succeed with a Startup
