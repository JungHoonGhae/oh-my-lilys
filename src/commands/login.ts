import { setToken } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

export async function auth(tokenFromArg?: string) {
  logger.warn("=".repeat(50));
  logger.warn("⚠️  oh-my-lilys is currently in BETA");
  logger.warn("=".repeat(50));
  logger.dim("");
  logger.dim("This tool reverse-engineers the lilys.ai API.");
  logger.dim("Use at your own risk.");
  logger.dim("");
  logger.warn("⚠️  DISCLAIMER:");
  logger.dim("  - This tool may violate lilys.ai Terms of Service");
  logger.dim("  - Use at your own risk and responsibility");
  logger.dim("  - Your account may be suspended if lilys.ai detects automated usage");
  logger.dim("");
  logger.warn("=".repeat(50));
  logger.dim("");

  if (tokenFromArg) {
    setToken(tokenFromArg);
    logger.success("Token saved from argument!");
    return;
  }

  // Try auto-retrieval for macOS Chrome
  if (process.platform === "darwin") {
    try {
      logger.info("Attempting to automatically retrieve token from Chrome...");
      const chromePath = join(homedir(), "Library/Application Support/Google/Chrome/Default/Local Storage/leveldb");
      
      if (existsSync(chromePath)) {
        // Use a simple grep-like approach to find the token in the leveldb files
        // This is a bit hacky but often works for local storage strings
        const cmd = `grep -aohE 'access_token":"[^"]+"' "${chromePath}"/*.ldb "${chromePath}"/*.log 2>/dev/null | head -n 1 | sed 's/access_token":"//;s/"//'`;
        const token = execSync(cmd).toString().trim();
        
        if (token && token.length > 20) {
          setToken(token);
          logger.success("Successfully retrieved token from Chrome automatically!");
          return;
        }
      }
    } catch (e) {
      logger.dim("Auto-retrieval failed, falling back to manual instructions.");
    }
  }

  logger.info("Available login methods:");
  logger.dim("");
  logger.dim("  1. Google     - Sign in with Google (available)");
  logger.dim("  2. Naver      - Sign in with Naver (coming soon)");
  logger.dim("  3. Email      - Sign in with Email (coming soon)");
  logger.dim("  4. Manual     - Enter token manually");
  logger.dim("");

  logger.info("To authenticate with Google:");
  logger.dim("  1. Open https://lilys.ai in your browser");
  logger.dim("  2. Log in with Google");
  logger.dim("  3. Open DevTools (F12) → Application → Local Storage");
  logger.dim("  4. Copy the 'access_token' value");
  logger.dim("  5. Run: lilys auth <token>");
  logger.dim("");
  logger.warn("Note: Naver and Email login are not yet implemented.");
}
