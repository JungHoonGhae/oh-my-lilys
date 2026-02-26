import { searchSessions, AuthError } from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

export interface SearchOptions {
  limit?: number;
  cursor?: string;
  json?: boolean;
}

export async function search(query: string, options: SearchOptions = {}) {
  const { limit = 10, cursor, json = false } = options;

  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }

  logger.info(`Searching: ${styles.value(query)}`);

  try {
    const result = await searchSessions(query, cursor, limit);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.sessions.length === 0) {
      logger.warn("No sessions found.");
      return;
    }

    logger.break();
    const totalStr = result.total ? ` (total: ${result.total})` : "";
    logger.log(`${logger.bold("Found")} ${styles.value(String(result.sessions.length))} ${logger.bold("session(s)")}${totalStr}:`);
    logger.break();

    for (const session of result.sessions) {
      logger.log(`${styles.key(session.id)}`);
      logger.dim(`  Title: ${session.title}`);
      logger.dim(`  Type: ${session.sourceType}`);
      logger.dim(`  Created: ${session.createdAt}`);
      logger.log(`  ${styles.url(`https://lilys.ai/digest/${session.id}/main`)}`);
      logger.break();
    }

    if (result.hasMore && result.nextCursor) {
      logger.dim(`More results available. Use --cursor ${result.nextCursor}`);
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
