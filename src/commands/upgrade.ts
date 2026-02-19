import { logger } from "../utils/logger.js";

const VERSION = "1.0.0";
const PACKAGE_NAME = "oh-my-lilys";
const NPM_REGISTRY = "https://registry.npmjs.org";

export async function upgrade() {
  logger.info("Checking for updates...");

  try {
    const response = await fetch(`${NPM_REGISTRY}/${PACKAGE_NAME}/latest`);
    const data = await response.json() as { version: string };
    const latestVersion = data.version;

    if (latestVersion === VERSION) {
      logger.success(`You are on the latest version: v${VERSION}`);
      return;
    }

    logger.warn(`Update available: v${VERSION} → v${latestVersion}`);
    logger.info("To update, run:");
    logger.dim(`  npm install -g ${PACKAGE_NAME}`);
    logger.dim(`  pnpm add -g ${PACKAGE_NAME}`);
    logger.dim(`  bun add -g ${PACKAGE_NAME}`);
  } catch (error) {
    logger.error("Failed to check for updates:", error instanceof Error ? error.message : String(error));
  }
}
