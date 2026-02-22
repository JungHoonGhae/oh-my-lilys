Plan update: switch to using existing Chrome profile directory per platform

- Implemented getChromeProfileDir() in src/utils/browser.ts to derive platform-specific Chrome profile dir:
  - macOS: ~/Library/Application Support/Google/Chrome
  - Windows: %LOCALAPPDATA%\Google\Chrome\User Data
  - Linux: ~/.config/google-chrome
- Updated imports to include platform from os and used path join for cross-platform joins
- Replaced hard-coded PROFILE_DIR with a call to getChromeProfileDir(): PROFILE_DIR = getChromeProfileDir()
- Built with bun run build; build succeeded with no errors
- Potential follow-ups:
  - Consider validating that the Chrome profile exists at the computed path, and fallback if not found
  - Add environment-variable override for testing with alternative profile paths

Files touched:
- src/utils/browser.ts

Notes:
- This change aligns Oh My Lilys with user’s existing Chrome sessions, preventing re-login prompts.
