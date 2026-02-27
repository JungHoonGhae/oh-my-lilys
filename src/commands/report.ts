import {
  getReport, getNotesForSession, createNote, createNoteWeb, NOTE_TYPES, type NoteType,
  listSessions, AuthError, extractNoteContent,
  generateTailoredSummary, TAILORED_CATEGORIES, type TailoredCategory, type SSEEvent,
  processGenImageTags, processVideoFrames, getSessionResources,
  putVisualNote, getNoteVersionInfo,
} from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

function htmlToMarkdown(html: string): string {
  let result = html.replace(/<\/?(lilys-[^>]*)>/g, "");

  result = result
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");

  result = result.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  result = result.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  result = result.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  result = result.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  result = result.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n");
  result = result.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n");

  result = result.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  result = result.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  result = result.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  result = result.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");

  result = result.replace(/<ul[^>]*>/gi, "");
  result = result.replace(/<\/ul>/gi, "\n");
  result = result.replace(/<li[^>]*>/gi, "\n- ");
  result = result.replace(/<\/li>/gi, "");

  result = result.replace(/<ol[^>]*>/gi, "");
  result = result.replace(/<\/ol>/gi, "\n");

  result = result.replace(/<p[^>]*>/gi, "\n");
  result = result.replace(/<\/p>/gi, "\n\n");
  result = result.replace(/<br\s*\/?>/gi, "\n");

  result = result.replace(/<[^>]+>/g, "");

  result = result
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "")
    .trim();
  return result;
}

export interface ReportOptions {
  noteType?: string;
  generate?: string;  // tailored category
  watch?: boolean;
  timeout?: number;
  export?: string;
  images?: boolean;   // process <gen-image> tags into real images
  frames?: boolean;   // inject video frames from timestamps
  visual?: boolean;   // trigger visual rendering for web display
}

export async function report(sessionId: string, options: ReportOptions = {}) {
  const { noteType, generate, watch = false, timeout = 120, export: exportFormat, images = false, frames = false, visual = false } = options;

  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }

  // Validate note type
  if (noteType) {
    if (!NOTE_TYPES.find((n) => n.type === noteType)) {
      logger.error(`Invalid note type: ${noteType}`);
      logger.info(`Valid: ${NOTE_TYPES.map((n) => n.type).join(", ")}`);
      process.exit(1);
    }
  }

  // Validate generate category
  if (generate) {
    if (!TAILORED_CATEGORIES.find((c) => c.type === generate)) {
      logger.error(`Invalid category: ${generate}`);
      logger.info(`Valid: ${TAILORED_CATEGORIES.map((c) => c.type).join(", ")}`);
      process.exit(1);
    }
  }

  logger.info(`Fetching report for session: ${styles.key(sessionId)}`);

  // Resolve sourceId for frame extraction
  let sourceId: string | null = null;
  let sourceType: string = "youtube_video";
  if (frames) {
    const resources = await getSessionResources(sessionId);
    const resource = resources.find((r: any) => String(r.sessionId) === sessionId) || resources[0];
    if (resource?.sourceId) {
      sourceId = resource.sourceId;
      sourceType = resource.sourceType || "youtube_video";
    }
  }

  try {
    // ─── Generate via tailored-summary (SSE streaming) ───
    if (generate) {
      logger.info(`Generating ${styles.value(generate)} via AI streaming...`);
      logger.log(logger.dim(`  → Terminal-only mode. This note will not appear on lilys.ai web.`));
      logger.log(logger.dim(`  → For web-visible notes: lilys report ${sessionId} --note-type detailed`));
      let lastStatus = "";
      const result = await generateTailoredSummary(sessionId, {
        category: generate as TailoredCategory,
        onEvent: (evt: SSEEvent) => {
          const status = `${evt.event || ""}/${evt.status || ""}`;
          if (status !== lastStatus) {
            if (evt.status === "start") logger.dim(`  [${evt.event}] starting...`);
            if (evt.status === "done") logger.dim(`  [${evt.event}] done`);
            lastStatus = status;
          }
        },
      });
      logger.success(`Note created: ${styles.value(result.noteId)}`);

      // Trigger visual rendering for web display
      if (visual && result.noteId) {
        await renderVisual(sessionId, result.noteId);
      }

      let content = result.content;
      if (content) {
        // Process <gen-image> tags if --images flag or auto-detect
        if (images || content.includes("<gen-image")) {
          const hasImages = content.includes("<gen-image");
          if (hasImages) {
            logger.info("Generating images from <gen-image> tags...");
            content = await processGenImageTags(content, (current, total) => {
              logger.dim(`  Image ${current}/${total} generating...`);
            });
            logger.success("Image generation complete.");
          }
        }
        // Inject video frames if --frames flag
        if (frames && sourceId) {
          content = await processVideoFrames(content, sourceId, sessionId, sourceType, (msg) => logger.dim(`  ${msg}`));
        }
        if (exportFormat === "markdown") {
          await exportAsMarkdown(sessionId, content);
          return;
        }
        printReport(content, sessionId, true);
      } else {
        logger.warn("Generation completed but no content received.");
        logger.log(`View online: ${styles.url(`https://lilys.ai/digest/${sessionId}/main`)}`);
      }
      return;
    }

    // ─── Generate via regular note API (web-compatible) ───
    if (noteType) {
      const parsedNoteType: NoteType = noteType as NoteType;
      logger.info(`Generating ${styles.value(noteType)} note (web-compatible)...`);
      const result = await createNoteWeb(sessionId, parsedNoteType);
      logger.success(`Note created: ${styles.value(result.noteId)}`);
      if (result.noteTabId) logger.dim(`  Tab registered: ${result.noteTabId}`);

      if (watch) {
        logger.info(`Watching for completion (timeout: ${timeout}s)...`);
        await watchForReport(sessionId, timeout);
      } else {
        logger.dim("Waiting for generation...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Trigger visual rendering for web display
      if (visual) {
        await renderVisual(sessionId);
      }
    }

    // Trigger visual rendering for existing notes (no noteType/generate)
    if (visual && !noteType) {
      await renderVisual(sessionId);
    }

    // ─── Fetch existing report ───
    const reportData = await getReport(sessionId);

    if (!reportData.content || reportData.content === "No notes found for this session") {
      logger.break();
      logger.log(logger.bold("=== REPORT ==="));
      logger.break();
      logger.warn(reportData.content || "No content available");
      logger.break();
      logger.log(`View online: ${styles.url(`https://lilys.ai/digest/${sessionId}/main`)}`);
      return;
    }

    // Content is already markdown if from initialMarkdownUnits
    let textContent = reportData.isMarkdown
      ? reportData.content
      : htmlToMarkdown(reportData.content);

    // Process <gen-image> tags if --images flag or auto-detect
    if (images || textContent.includes("<gen-image")) {
      const hasImages = textContent.includes("<gen-image");
      if (hasImages) {
        logger.info("Generating images from <gen-image> tags...");
        textContent = await processGenImageTags(textContent, (current, total) => {
          logger.dim(`  Image ${current}/${total} generating...`);
        });
        logger.success("Image generation complete.");
      }
    }

    // Inject video frames if --frames flag
    if (frames && sourceId) {
      textContent = await processVideoFrames(textContent, sourceId, sessionId, sourceType, (msg) => logger.dim(`  ${msg}`));
    }

    if (exportFormat === "markdown") {
      await exportAsMarkdown(sessionId, textContent);
      return;
    }

    printReport(textContent, sessionId, reportData.isMarkdown);
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

function printReport(content: string, sessionId: string, isMarkdown: boolean) {
  logger.break();
  logger.log(logger.bold("=== REPORT ==="));
  logger.break();
  logger.log(content || "No content available");
  logger.break();
  logger.log(`View online: ${styles.url(`https://lilys.ai/digest/${sessionId}/main`)}`);
}

async function watchForReport(sessionId: string, timeoutSeconds: number): Promise<void> {
  const startTime = Date.now();
  const interval = 3000;
  const maxAttempts = Math.floor((timeoutSeconds * 1000) / interval);

  logger.info("Waiting for note generation (this may take a few minutes)...");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    try {
      const notes = await getNotesForSession(sessionId);

      if (notes.length > 0) {
        const latestNote = notes[0];
        const noteId = String(latestNote.sid || latestNote.noteId);
        const reportData = await getReport(sessionId, noteId);

        if (reportData.content && reportData.content !== "No notes found for this session") {
          logger.success(`[${elapsed}s] Report ready!`);
          return;
        } else {
          logger.dim(`[${elapsed}s] Note found (${noteId}), generating...`);
        }
      } else {
        logger.dim(`[${elapsed}s] Waiting for note generation...`);
      }
    } catch {
      logger.dim(`[${elapsed}s] Checking... (will retry)`);
    }

    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  logger.warn(`Timeout after ${timeoutSeconds}s. Report may still be generating.`);
  logger.log(`Check manually: ${styles.url(`https://lilys.ai/digest/${sessionId}/main`)}`);
}

async function renderVisual(sessionId: string, targetNoteId?: string): Promise<void> {
  logger.info("Triggering visual rendering for web display...");
  const info = await getNoteVersionInfo(sessionId, targetNoteId);
  if (!info) {
    logger.warn("No note version found for visual rendering.");
    return;
  }

  let lastStatus = "";
  await putVisualNote(info.noteId, info.versionId, sessionId, {
    noteTabId: info.noteTabId,
    onEvent: (evt: SSEEvent) => {
      const status = `${evt.event || ""}/${evt.status || ""}`;
      if (status !== lastStatus) {
        if (evt.status === "start") logger.dim(`  [visual] starting...`);
        if (evt.status === "done") logger.dim(`  [visual] done`);
        if (evt.status === "chunk") process.stderr.write(".");
        lastStatus = status;
      }
    },
  });
  logger.success("Visual rendering complete. Note is now visible on web.");
}

async function exportAsMarkdown(sessionId: string, content: string): Promise<void> {
  const sessions = await listSessions();
  const session = sessions.find(s => s.id === sessionId);
  const title = session?.title || `Session ${sessionId}`;

  const markdown = `# ${title}\n\n${content}\n\n---\n\n*Exported from oh-my-lilys*\n*Session: ${sessionId}*\n*URL: https://lilys.ai/digest/${sessionId}/main*\n`;

  const filename = `${sessionId}-${title.slice(0, 30).replace(/[^a-zA-Z0-9가-힣]/g, "_")}.md`;
  await Bun.write(filename, markdown);

  logger.break();
  logger.log(logger.bold("=== MARKDOWN OUTPUT ==="));
  logger.break();
  console.log(markdown);
  logger.success(`Saved to: ${filename}`);
}
