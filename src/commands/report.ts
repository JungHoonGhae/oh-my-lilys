import { getReport, getNotesForSession, createNote, NOTE_TYPES, type NoteType, listSessions } from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

function htmlToMarkdown(html: string): string {
  // Remove lilys custom tags first
  let result = html.replace(/<\/?(lilys-[^>]*)>/g, "");
  
  // Decode HTML entities (order matters: decode specific entities before &amp;)
  result = result
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
  
  // Convert structural HTML to markdown-like text format
  // Headings
  result = result.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  result = result.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  result = result.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  result = result.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  result = result.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n");
  result = result.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n");
  
  // Bold and italic
  result = result.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  result = result.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  result = result.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  result = result.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  
  // Unordered lists
  result = result.replace(/<ul[^>]*>/gi, "");
  result = result.replace(/<\/ul>/gi, "\n");
  result = result.replace(/<li[^>]*>/gi, "\n• ");
  result = result.replace(/<\/li>/gi, "");
  
  // Ordered lists
  result = result.replace(/<ol[^>]*>/gi, "");
  result = result.replace(/<\/ol>/gi, "\n");
  // Note: numbered lists need sequential processing
  
  // Paragraphs and breaks
  result = result.replace(/<p[^>]*>/gi, "\n");
  result = result.replace(/<\/p>/gi, "\n\n");
  result = result.replace(/<br\s*\/?>/gi, "\n");
  
  // Remove all remaining HTML tags
  result = result.replace(/<[^>]+>/g, "");
  
  // Clean up whitespace
  result = result
    .replace(/\n{3,}/g, "\n\n")  // Max 2 consecutive newlines
    .replace(/^\n+/, "")      // Remove leading newlines
    .replace(/\n+$/, "")      // Remove trailing newlines
    .trim();
  return result;
}
function stripHtml(html: string): string {
  // Legacy function kept for backward compatibility
  return htmlToMarkdown(html);
}
function extractTextContent(html: string): string {
  return htmlToMarkdown(html);
}

export interface ReportOptions {
  noteType?: string;
  watch?: boolean;
  timeout?: number;
  export?: string;
}

export async function report(sessionId: string, options: ReportOptions = {}) {
  const { noteType, watch = false, timeout = 120, export: exportFormat } = options;

  if (!isAuthenticated()) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }

  if (noteType) {
    const validTypes = NOTE_TYPES.map((n) => n.type);
    const exact = NOTE_TYPES.find((n) => n.type === noteType);
    if (!exact) {
      logger.error(`Invalid note type: ${noteType}`);
      logger.info(`Valid: ${validTypes.join(", ")}`);
      process.exit(1);
    }
  }

  logger.info(`Fetching report for session: ${styles.key(sessionId)}`);

  try {
    if (noteType) {
      const exact = NOTE_TYPES.find((n) => n.type === noteType);
      if (!exact) {
        logger.error(`Invalid note type: ${noteType}`);
        logger.info(`Valid: ${NOTE_TYPES.map((n) => n.type).join(", ")}`);
        process.exit(1);
      }

      const parsedNoteType: NoteType = exact.type;
      logger.info(`Generating ${styles.value(noteType)} note...`);
      const result = await createNote(sessionId, parsedNoteType);
      logger.success(`Note created: ${styles.value(result.noteId)}`);
      
      if (watch) {
        logger.info(`Watching for completion (timeout: ${timeout}s)...`);
        await watchForReport(sessionId, timeout);
      } else {
        logger.dim("Waiting for generation...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
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
    
    const textContent = extractTextContent(reportData.content);
    
    if (exportFormat === "markdown") {
      await exportAsMarkdown(sessionId, textContent);
      return;
    }
    
    logger.break();
    logger.log(logger.bold("=== REPORT ==="));
    logger.break();
    logger.log(textContent || "No content available");
    logger.break();
    logger.log(`View online: ${styles.url(`https://lilys.ai/digest/${sessionId}/main`)}`);
  } catch (error) {
    logger.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function watchForReport(sessionId: string, timeoutSeconds: number): Promise<void> {
  const startTime = Date.now();
  const interval = 5000;
  const maxAttempts = Math.floor((timeoutSeconds * 1000) / interval);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    logger.dim(`[${elapsed}s] Checking for report...`);
    
    const notes = await getNotesForSession(sessionId);
    
    if (notes.length > 0) {
      const latestNote = notes[0];
      const noteId = String(latestNote.sid || latestNote.noteId);
      
      logger.info(`[${elapsed}s] Note found: ${noteId}, fetching content...`);
      
      const reportData = await getReport(sessionId, noteId);
      
      if (reportData.content && reportData.content !== "No notes found for this session") {
        logger.success(`[${elapsed}s] Report ready!`);
        return;
      }
    }
    
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  logger.warn(`Timeout after ${timeoutSeconds}s. Report may still be generating.`);
  logger.log(`Check manually: ${styles.url(`https://lilys.ai/digest/${sessionId}/main`)}`);
}

async function exportAsMarkdown(sessionId: string, content: string): Promise<void> {
  const sessions = await listSessions();
  const session = sessions.find(s => s.id === sessionId);
  const title = session?.title || `Session ${sessionId}`;
  
  const markdown = `# ${title}

${content}

---

*Exported from oh-my-lilys*
*Session: ${sessionId}*
*URL: https://lilys.ai/digest/${sessionId}/main*
`;

  logger.break();
  logger.log(logger.bold("=== MARKDOWN OUTPUT ==="));
  logger.break();
  console.log(markdown);
  
  const { writeFileSync } = await import("fs");
  const filename = `${sessionId}-${title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}.md`;
  writeFileSync(filename, markdown);
  logger.success(`Saved to: ${filename}`);
}
