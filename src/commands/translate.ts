import {
  getReport,
  translateText,
  AuthError,
} from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

export interface TranslateOptions {
  to: string;
  noteId?: string;
  json?: boolean;
}

export async function translate(sessionId: string, options: TranslateOptions) {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys auth' first.");
    process.exit(1);
  }

  const { to, noteId, json = false } = options;

  if (!to) {
    logger.error("Target language required. Usage: lilys translate <sessionId> --to en");
    process.exit(1);
  }

  try {
    // 1. Get report content
    logger.info(`Fetching report for session: ${styles.key(sessionId)}`);
    const reportData = await getReport(sessionId, noteId);

    if (!reportData.content || reportData.content === "No notes found for this session") {
      logger.error("No report content found. Generate a report first.");
      logger.dim(`  lilys report ${sessionId} --note-type detailed`);
      process.exit(1);
    }

    const content = reportData.content;
    logger.info(`Translating to ${styles.value(to)} (${content.length} chars)...`);

    // 2. Translate (chunk if content is large)
    const MAX_CHUNK = 4000;
    let translated: string;

    if (content.length <= MAX_CHUNK) {
      translated = await translateText(content, to);
    } else {
      const paragraphs = content.split(/\n\n+/);
      const chunks: string[] = [];
      let currentChunk = "";

      for (const para of paragraphs) {
        if ((currentChunk + "\n\n" + para).length > MAX_CHUNK && currentChunk) {
          chunks.push(currentChunk);
          currentChunk = para;
        } else {
          currentChunk = currentChunk ? currentChunk + "\n\n" + para : para;
        }
      }
      if (currentChunk) chunks.push(currentChunk);

      logger.dim(`  Translating ${chunks.length} chunk(s)...`);
      const translatedChunks: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        logger.dim(`  Chunk ${i + 1}/${chunks.length}...`);
        translatedChunks.push(await translateText(chunks[i]!, to));
      }
      translated = translatedChunks.join("\n\n");
    }

    if (json) {
      console.log(JSON.stringify({
        sessionId,
        targetLanguage: to,
        originalLength: content.length,
        translatedLength: translated.length,
        content: translated,
      }, null, 2));
      return;
    }

    logger.break();
    logger.log(logger.bold("=== TRANSLATED REPORT ==="));
    logger.break();
    logger.log(translated);
    logger.break();
    logger.success(`Translated to ${to} (${translated.length} chars)`);
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error(error.message);
      logger.dim("Run 'lilys auth' to re-authenticate.");
      process.exit(1);
    }
    logger.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
