import { logger } from "../utils/logger.js";

const PACKAGE_NAME = "oh-my-lilys";
const NPM_REGISTRY = "https://registry.npmjs.org";

export async function upgrade(currentVersion?: string) {
  const version = currentVersion ?? "unknown";

  logger.info("Checking for updates...");

  try {
    const response = await fetch(`${NPM_REGISTRY}/${PACKAGE_NAME}/latest`);
    const data = await response.json() as { version: string };
    const latestVersion = data.version;

    if (version !== "unknown" && latestVersion === version) {
      logger.success(`You are on the latest version: v${version}`);
      return;
    }

    if (version === "unknown") {
      logger.warn(`Latest version available: v${latestVersion}`);
    } else {
      logger.warn(`Update available: v${version} → v${latestVersion}`);
    }
    logger.info("To update, run:");
    logger.dim(`  npm install -g ${PACKAGE_NAME}`);
    logger.dim(`  pnpm add -g ${PACKAGE_NAME}`);
    logger.dim(`  bun add -g ${PACKAGE_NAME}`);
  } catch (error) {
    logger.error("Failed to check for updates:", error instanceof Error ? error.message : String(error));
  }
}
