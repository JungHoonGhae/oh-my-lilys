import { getSourceMetadata, createDigestSession, addResourceToSession } from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

export async function summarize(url: string) {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }

  logger.info(`Processing: ${styles.url(url)}`);

  try {
    const sourceResult = await getSourceMetadata(url);
    const sourceType = sourceResult.sourceType || detectSourceType(url);
    
    logger.log(`  Source: ${styles.key(sourceType)} ${logger.dim(`(id: ${sourceResult.sourceId})`)}`);
    logger.log(`  Title: ${styles.value(sourceResult.title)}`);

    const sessionResult = await createDigestSession(
      sourceResult.sourceId,
      sourceType
    );
    logger.success(`Session created: ${styles.value(sessionResult.sessionId)}`);
    
    try {
      await addResourceToSession(
        sessionResult.sessionId,
        sourceResult.sourceId,
        sourceType
      );
      logger.success("Resource added to session");
    } catch {
      logger.warn("Resource linking may require browser verification");
    }

    logger.break();
    logger.log(`${logger.bold("View in browser:")}`);
    logger.log(`  ${styles.url(`https://lilys.ai/digest/${sessionResult.sessionId}/main`)}`);
    
  } catch (error) {
    logger.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function detectSourceType(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  }
  if (url.includes("pdf") || url.endsWith(".pdf")) {
    return "pdf";
  }
  if (url.includes("audio") || url.endsWith(".mp3") || url.endsWith(".wav")) {
    return "audio";
  }
  return "website";
}
