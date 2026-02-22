import { setToken } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { fetchTokenFromBrowser, closeBrowser } from "../utils/browser.js";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_DURATION_MS = 120000;

async function pollForToken(): Promise<string | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
    const token = await fetchTokenFromBrowser(false);
    if (token) {
      return token;
    }
    logger.dim(`Waiting for login... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  return null;
}

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

  logger.info("Attempting to retrieve token automatically...");

  let token = await fetchTokenFromBrowser(true);

  if (token) {
    setToken(token);
    logger.success("Successfully retrieved token from existing browser session!");
    return;
  }

  logger.warn("No existing login session found.");
  logger.info("Opening browser for manual login...");
  logger.dim("Please login with Google at https://lilys.ai");
  logger.dim("Waiting for login (2 minutes timeout)...");

  try {
    token = await pollForToken();

    if (token) {
      setToken(token);
      logger.success("Token retrieved successfully!");
      logger.dim("Closing browser...");
      await closeBrowser();
      logger.success("Done!");
    } else {
      logger.error("Login timeout. Please try again.");
      logger.dim("Your session was not detected within 2 minutes.");
    }
  } catch (error) {
    logger.error("Error during login process:", error);
  } finally {
    try {
      await closeBrowser();
    } catch {}
  }
}
