import { deleteSessions, AuthError } from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

async function confirm(message: string): Promise<boolean> {
  if (!process.stdin.isTTY) return true;
  process.stdout.write(`${message} [y/N] `);
  for await (const chunk of process.stdin) {
    const input = Buffer.from(chunk).toString().trim().toLowerCase();
    return input === "y" || input === "yes";
  }
  return false;
}

export async function deleteCommand(sids: string[], options: { skipConfirm?: boolean } = {}) {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }

  if (sids.length === 0) {
    logger.error("No session IDs provided.");
    process.exit(1);
  }

  logger.info(`Deleting ${styles.value(String(sids.length))} session(s): ${sids.map(s => styles.key(s)).join(", ")}`);

  if (!options.skipConfirm) {
    const ok = await confirm("Are you sure?");
    if (!ok) {
      logger.dim("Cancelled.");
      return;
    }
  }

  try {
    await deleteSessions(sids);
    logger.success(`Deleted ${sids.length} session(s).`);
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
