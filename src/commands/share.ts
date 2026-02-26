import { shareNote, unshareNote, getSharedNotes, AuthError } from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

export async function share(sessionId: string, options: { noteId?: string; json?: boolean } = {}) {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }

  logger.info(`Sharing session: ${styles.key(sessionId)}`);

  try {
    const result = await shareNote(sessionId, options.noteId);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    logger.success("Note shared!");
    if (result.shareUrl) {
      logger.log(`${styles.label("Share URL:")} ${styles.url(result.shareUrl)}`);
    } else if (result.shareId) {
      logger.log(`${styles.label("Share ID:")} ${styles.value(result.shareId)}`);
    } else {
      logger.dim("Share created. Check lilys.ai for the share link.");
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

export async function unshare(sessionId: string) {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }

  logger.info(`Unsharing session: ${styles.key(sessionId)}`);

  try {
    await unshareNote(sessionId);
    logger.success("Note unshared.");
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
