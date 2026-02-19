import { setToken } from "../utils/config.js";
import { logger } from "../utils/logger.js";

export async function login(tokenFromArg?: string) {
  logger.warn("=".repeat(50));
  logger.warn("⚠️  oh-my-lilys is currently in BETA");
  logger.warn("=".repeat(50));
  logger.dim("");
  logger.dim("This tool reverse-engineers the lilys.ai API.");
  logger.dim("Login methods (Naver, Email) are not yet fully implemented.");
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

  logger.info("Available login methods:");
  logger.dim("");
  logger.dim("  1. Continue with Naver");
  logger.dim("  2. Continue with Email");
  logger.dim("  3. Manual token input (advanced)");
  logger.dim("");

  logger.warn("Note: Naver and Email login methods are not yet implemented.");
  logger.info("Currently, you must provide a token manually.");
  logger.dim("");
  logger.info("To get a token manually:");
  logger.dim("  1. Open https://lilys.ai in your browser");
  logger.dim("  2. Log in with Google or other provider");
  logger.dim("  3. Open DevTools (F12) → Application → Local Storage");
  logger.dim("  4. Copy the 'access_token' value");
  logger.dim("  5. Run: lilys login <token>");
}
