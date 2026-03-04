import {
  createChatThread,
  listChatThreads,
  sendChatMessage,
  AuthError,
  type SSEEvent,
} from "../api/client.js";
import { isAuthenticated, getResultLanguage } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

export interface ChatOptions {
  thread?: string;
  json?: boolean;
  model?: string;
  thinking?: boolean;
}

export async function chat(
  sessionId: string,
  query: string | undefined,
  options: ChatOptions = {}
) {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys auth' first.");
    process.exit(1);
  }

  const { thread, json = false, model = "free", thinking = false } = options;

  // No query → list threads
  if (!query) {
    try {
      const threads = await listChatThreads(sessionId);

      if (json) {
        console.log(JSON.stringify(threads, null, 2));
        return;
      }

      if (!threads || threads.length === 0) {
        logger.warn("No chat threads found for this session.");
        logger.dim(`Start a chat: lilys chat ${sessionId} "your question here"`);
        return;
      }

      logger.break();
      logger.log(`${logger.bold("Chat Threads")} for session ${styles.key(sessionId)}:`);
      logger.break();

      for (const t of threads) {
        logger.log(`${styles.key(String(t.id))}`);
        if (t.title) logger.dim(`  Title: ${t.title}`);
        if (t.created) logger.dim(`  Created: ${t.created}`);
        logger.break();
      }
    } catch (error) {
      if (error instanceof AuthError) {
        logger.error(error.message);
        process.exit(1);
      }
      logger.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
    return;
  }

  // Send chat message
  try {
    let threadId: number;
    if (thread) {
      threadId = parseInt(thread, 10);
    } else {
      logger.dim("Creating new chat thread...");
      const created = await createChatThread(sessionId);
      threadId = created.id;
      logger.dim(`Thread: ${threadId}`);
    }

    const language = getResultLanguage();
    const modelProfileKey = model === "paid" ? "v1/paid" : "v1/free";

    logger.info(`Asking: ${styles.value(query)}`);

    let lastEvent = "";
    const result = await sendChatMessage(sessionId, threadId, query, {
      language,
      modelProfileKey,
      onEvent: (evt: SSEEvent) => {
        const key = `${evt.event}/${evt.status}`;
        if (key !== lastEvent) {
          if (evt.event === "thinking" && evt.status === "start" && thinking) {
            logger.dim("  [thinking]");
          }
          if (evt.event === "response" && evt.status === "start" && !json) {
            logger.break();
          }
          lastEvent = key;
        }
        // Stream response chunks in real-time
        if (!json && evt.event === "response" && evt.status === "chunk" && evt.payload?.content) {
          process.stdout.write(evt.payload.content);
        }
      },
    });

    if (json) {
      console.log(JSON.stringify({
        sessionId,
        threadId,
        query,
        thinking: thinking ? result.thinking : undefined,
        response: result.response,
      }, null, 2));
      return;
    }

    // Final newline after streamed output
    console.log("");
    logger.break();
    logger.dim(`Thread: ${threadId} | Model: ${modelProfileKey}`);
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
