import { exportPdf, AuthError } from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

export interface ExportPdfOptions {
  output?: string;
  noteId?: string;
}

export async function exportPdfCommand(sessionId: string, options: ExportPdfOptions = {}) {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }

  const filename = options.output || `${sessionId}.pdf`;
  logger.info(`Exporting PDF for session: ${styles.key(sessionId)}`);

  try {
    const data = await exportPdf(sessionId, options.noteId);
    await Bun.write(filename, data);
    logger.success(`PDF saved to: ${styles.value(filename)}`);
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
