import { listSessions, AuthError } from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

export async function sessions(options: { json?: boolean } = {}) {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }

  logger.info("Fetching sessions...");

  try {
    const sessionsList = await listSessions();

    if (options.json) {
      console.log(JSON.stringify(sessionsList, null, 2));
      return;
    }

    if (sessionsList.length === 0) {
      logger.warn("No sessions found.");
      return;
    }

    logger.break();
    logger.log(`${logger.bold("Found")} ${styles.value(String(sessionsList.length))} ${logger.bold("session(s):")}`);
    logger.break();

    for (const session of sessionsList.slice(0, 10)) {
      logger.log(`${styles.key(String(session.id))}`);
      logger.dim(`  Title: ${session.title}`);
      logger.dim(`  Type: ${session.sourceType}`);
      logger.dim(`  Created: ${session.createdAt}`);
      logger.log(`  ${styles.url(`https://lilys.ai/digest/${session.id}/main`)}`);
      logger.break();
    }

    if (sessionsList.length > 10) {
      logger.dim(`... and ${sessionsList.length - 10} more`);
    }
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error(error.message);
      logger.dim("Run 'lilys login' to re-authenticate.");
      process.exit(1);
    }
    logger.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
