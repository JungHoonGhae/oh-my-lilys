import { getToken, getTokenAsync, getValidToken, refreshFirebaseToken, isTokenExpired } from "../utils/config.js";

const API_BASE = "https://api.lilys.ai/backend";
const AWS_API_BASE = "https://wp8tovrz8a.execute-api.ap-northeast-2.amazonaws.com/release";
const METADATA_API = "https://5wjqcmluif.execute-api.ap-northeast-2.amazonaws.com/release";
const SEARCH_API = "https://dmdxvjdpm6.execute-api.ap-northeast-2.amazonaws.com/release";
const PAYMENT_API = "https://payment.lilys.ai";
const TASK_RUNNER_API = "https://task-runner.lilys.ai";
const PDF_EXPORT_API = "https://p3ooksadah.execute-api.ap-northeast-2.amazonaws.com/release";
const SUMMARY_API = "https://lm-api.lilys.ai";
const AGENT_API = "https://agent-release.lilys.ai";
const RAG_API = "https://rag.lilys.ai";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

interface SourceMetadata {
  sourceId: string;
  sourceType: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
}

interface ProcessInputResponse {
  action?: string;
  errorType?: string;
  sourceId?: string;
  sourceType?: string;
  title?: string;
}

interface Session {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
}

interface NoteResponse {
  noteId: string;
}

async function makeRequest<T>(
  url: string,
  options: RequestInit & { isAWS?: boolean; queryParams?: Record<string, string>; _retried?: boolean } = {}
): Promise<T> {
  const token = await getValidToken();
  if (!token) {
    throw new Error("Not authenticated. Run 'lilys login' first.");
  }

  let finalUrl = url;
  if (options.queryParams) {
    const params = new URLSearchParams(options.queryParams).toString();
    finalUrl = `${url}?${params}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.isAWS) {
    headers["x-api-key"] = "release";
  }

  const response = await fetch(finalUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    // Auto-refresh on auth errors (once)
    if (!options._retried && (response.status === 401 || response.status === 403 ||
        (response.status === 400 && (error.includes("invalid_token") || error.includes("Unauthorized"))))) {
      const newToken = await refreshFirebaseToken();
      if (newToken) {
        return makeRequest<T>(url, { ...options, _retried: true });
      }
      throw new AuthError('Authentication failed. Please run "lilys auth" to re-authenticate.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new AuthError('Authentication failed. Please run "lilys auth" to re-authenticate.');
    }
    if (response.status === 400 && (error.includes("invalid_token") || error.includes("Unauthorized"))) {
      throw new AuthError('Authentication failed. Please run "lilys auth" to re-authenticate.');
    }
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  return response.json() as T;
}

async function makeRequestRaw(
  url: string,
  options: RequestInit & { isAWS?: boolean; queryParams?: Record<string, string>; _retried?: boolean } = {}
): Promise<Response> {
  const token = await getValidToken();
  if (!token) {
    throw new Error("Not authenticated. Run 'lilys login' first.");
  }

  let finalUrl = url;
  if (options.queryParams) {
    const params = new URLSearchParams(options.queryParams).toString();
    finalUrl = `${url}?${params}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.isAWS) {
    headers["x-api-key"] = "release";
  }

  const response = await fetch(finalUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    if (!options._retried && (response.status === 401 || response.status === 403 ||
        (response.status === 400 && (error.includes("invalid_token") || error.includes("Unauthorized"))))) {
      const newToken = await refreshFirebaseToken();
      if (newToken) {
        return makeRequestRaw(url, { ...options, _retried: true });
      }
      throw new AuthError('Authentication failed. Please run "lilys auth" to re-authenticate.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new AuthError('Authentication failed. Please run "lilys auth" to re-authenticate.');
    }
    if (response.status === 400 && (error.includes("invalid_token") || error.includes("Unauthorized"))) {
      throw new AuthError('Authentication failed. Please run "lilys auth" to re-authenticate.');
    }
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  return response;
}

export async function processInputLink(link: string): Promise<ProcessInputResponse> {
  const sourceType = detectSourceType(link);
  
  return makeRequest<ProcessInputResponse>(`${API_BASE}/process-input-link`, {
    method: "POST",
    queryParams: { provider: "google" },
    body: JSON.stringify({
      link,
      type: sourceType,
    }),
  });
}

export async function createDigestSession(
  sourceId: string,
  sourceType: string
): Promise<{ sessionId: string }> {
  const apiSourceType = sourceType === "youtube" ? "youtube_video" : sourceType;
  
  const response = await makeRequest<any>(`${API_BASE}/digest-session-v2`, {
    method: "POST",
    queryParams: { provider: "google" },
    body: JSON.stringify({
      sourceId,
      sourceType: apiSourceType,
      resources: [{ sourceId, sourceType: apiSourceType }],
    }),
  });
  
  const sid = response.result?.sid;
  if (!sid) {
    throw new Error("Failed to create session: no session ID returned");
  }
  return { sessionId: String(sid) };
}

export async function getSourceMetadata(link: string): Promise<SourceMetadata> {
  const sourceType = detectSourceType(link);
  const sourceId = extractSourceId(link, sourceType);
  
  try {
    const response = await makeRequest<any>(`${METADATA_API}/metadata`, {
      method: "GET",
      isAWS: true,
      queryParams: { sourceId },
    });
    
    return {
      sourceId: response.sourceId || sourceId,
      sourceType: response.sourceType || sourceType,
      title: response.title || "Untitled",
      description: response.description,
      thumbnailUrl: response.thumbnailUrl,
    };
  } catch {
    return {
      sourceId,
      sourceType,
      title: "Untitled",
    };
  }
}

function extractSourceId(link: string, sourceType: string): string {
  if (sourceType === "youtube" || sourceType === "youtube_video") {
    const match = link.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? link;
  }
  return link;
}

export async function addResourceToSession(
  sessionId: string,
  sourceId: string,
  sourceType: string
): Promise<void> {
  const apiSourceType = sourceType === "youtube" ? "youtube_video" : sourceType;
  
  await makeRequest<any>(`${API_BASE}/digest-session-resources-add`, {
    method: "POST",
    queryParams: { provider: "google" },
    body: JSON.stringify({
      sessionId: parseInt(sessionId, 10),
      resources: [{ sourceId, sourceType: apiSourceType }],
    }),
  });
}

export function extractNoteContent(note: any): string {
  // 1. versions의 마크다운 유닛 (가장 신뢰할 수 있음)
  const version = note?.versions?.[0];
  if (version?.initialMarkdownUnits?.data?.length) {
    return version.initialMarkdownUnits.data
      .map((u: any) => u.content || "")
      .join("\n\n");
  }
  // 2. HTML content (versions)
  if (version?.htmlContent) {
    return version.htmlContent;
  }
  // 3. note.content (fallback)
  return note?.content || "";
}

export async function getReport(
  sessionId: string,
  noteId?: string
): Promise<{ content: string; note?: any; isMarkdown: boolean }> {
  if (!noteId) {
    const notes = await getNotesForSession(sessionId);
    if (notes.length === 0) {
      return { content: "No notes found for this session", isMarkdown: false };
    }
    const firstNote = notes[0];
    noteId = String(firstNote.sid || firstNote.noteId);
  }

  const response = await makeRequest<any>(`${AWS_API_BASE}/notes/${sessionId}/${noteId}`, {
    method: "GET",
    isAWS: true,
    queryParams: { provider: "google" },
  });

  const note = response.note;
  const content = extractNoteContent(note);
  const isMarkdown = !!note?.versions?.[0]?.initialMarkdownUnits?.data?.length;
  return { content, note, isMarkdown };
}

export async function getNotesForSession(sessionId: string): Promise<any[]> {
  try {
    const response = await makeRequest<{ notes: any[] }>(`${AWS_API_BASE}/notes/${sessionId}`, {
      method: "GET",
      isAWS: true,
      queryParams: { provider: "google" },
    });
    return response.notes || [];
  } catch (error) {
    // Re-throw AuthError for proper handling by caller
    if (error instanceof AuthError) {
      throw error;
    }
    return [];
  }
}

export type NoteType = 
  | "detailed" 
  | "key_points" 
  | "easy" 
  | "script"
  | "animation"
  | "infographic"
  | "background"
  | "deep_dive";

export const NOTE_TYPES: { type: NoteType; name: string; webType: string }[] = [
  { type: "detailed", name: "Detailed report", webType: "summaryNote" },
  { type: "key_points", name: "Key report", webType: "subjectSummary" },
  { type: "easy", name: "Easy report", webType: "visualNote" },
  { type: "script", name: "Script", webType: "script" },
  { type: "animation", name: "Animation", webType: "animation" },
  { type: "infographic", name: "Infographic", webType: "infographic" },
  { type: "background", name: "Background", webType: "background" },
  { type: "deep_dive", name: "Deep Dive", webType: "deep_dive" },
];

export async function generateNote(
  sessionId: string,
  noteType: string = "detailed"
): Promise<NoteResponse> {
  return createNote(sessionId, noteType as NoteType);
}

export async function createNote(
  sessionId: string,
  noteType: NoteType
): Promise<{ noteId: string }> {
  try {
    const response = await makeRequest<{ noteId: string }>(`${AWS_API_BASE}/notes`, {
      method: "POST",
      isAWS: true,
      queryParams: { provider: "google" },
      body: JSON.stringify({
        sessionId,
        noteType,
      }),
    });
    
    if (!response.noteId) {
      throw new Error("Note creation failed: no noteId returned");
    }
    
    return response;
  } catch (error) {
    // 504 timeout - note generation may still be in progress
    if (error instanceof Error && error.message.includes("504")) {
      console.log("Note generation started (timeout received, but generation may continue in background)");
      return { noteId: "pending" };
    }
    throw error;
  }
}

/**
 * Create a note using the same flow as the web UI.
 * This ensures the note shows up correctly on the website.
 * Flow: POST /notes → POST /note-tabs → note appears in web UI
 */
export async function createNoteWeb(
  sessionId: string,
  noteType: NoteType
): Promise<{ noteId: string; noteTabId: string }> {
  // 1. Resolve resource requestId
  const resources = await getSessionResources(sessionId);
  const resource = resources.find((r: any) => String(r.sessionId) === sessionId) || resources[0];
  const requestId = resource?.requestId || crypto.randomUUID();
  const isMultisource = resources.filter((r: any) => String(r.sessionId) === sessionId).length >= 2;

  // 2. Map CLI noteType to web type
  const noteInfo = NOTE_TYPES.find(n => n.type === noteType);
  const webType = noteInfo?.webType || "summaryNote";
  const title = noteInfo?.name || "Report";

  // 3. Create note (same endpoint as web)
  const noteResponse = await makeRequest<any>(`${AWS_API_BASE}/notes`, {
    method: "POST",
    isAWS: true,
    queryParams: { provider: "google" },
    body: JSON.stringify({
      digestId: parseInt(sessionId, 10),
      title,
      type: webType,
      content: "",
      forceWhisper: false,
      isDefaultNote: true,
      requestId,
      model: "free",
      boostWaitTimeMin: 1,
    }),
  });

  const note = noteResponse.note || noteResponse;
  const noteId = String(note.sid || note.noteId || note.id || "");
  if (!noteId) throw new Error("Note creation failed: no noteId returned");

  // 4. Note tab - may already be created by the server (noteTabId in response)
  let noteTabId = String(note.noteTabId || "");

  // If no tab from response, create one explicitly (like the web does)
  if (!noteTabId) {
    try {
      const tabResponse = await makeRequest<any>(`${AWS_API_BASE}/note-tabs`, {
        method: "POST",
        isAWS: true,
        queryParams: { provider: "google" },
        body: JSON.stringify({
          sessionId: parseInt(sessionId, 10),
          requestId,
          isMultisource,
        }),
      });
      noteTabId = String(tabResponse.noteTabId || tabResponse.id || "");
    } catch {
      // Tab creation may fail but note is still created
    }
  }

  return { noteId, noteTabId };
}

export async function getSessionMetadata(sessionId: string): Promise<any> {
  return makeRequest<any>(`${API_BASE}/session-metadata/${sessionId}`, {
    method: "GET",
    queryParams: { provider: "google", password: "" },
  });
}

export async function listSessions(): Promise<Session[]> {
  try {
    const response = await makeRequest<{ digestSessions: any[] }>(
      `${API_BASE}/digest-sessions`,
      {
        method: "GET",
        queryParams: { provider: "google", limit: "50", page: "1" },
      }
    );
    return (response.digestSessions || []).map(s => ({
      id: String(s.sid),
      title: s.name || "Untitled",
      sourceType: s.sourceTypes?.[0] || "unknown",
      createdAt: s.created,
    }));
  } catch (error) {
    console.error("Could not fetch sessions list:", error);
    // Re-throw AuthError for proper handling by caller
    if (error instanceof AuthError) {
      throw error;
    }
    return [];
  }
}

export async function getUserPreferences(): Promise<any> {
  return makeRequest<any>(`${API_BASE}/user`, {
    method: "GET",
    queryParams: { provider: "google" },
  });
}

export async function updateUserPreferences(preferences: {
  resultLanguage?: string;
  uiLanguage?: string;
}): Promise<any> {
  const endpoints = [
    `${API_BASE}/v2/user`,
    `${API_BASE}/v2/user/preferences`,
    `${API_BASE}/user`,
    `${API_BASE}/user/preferences`,
    `${API_BASE}/user/settings`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest<any>(endpoint, {
        method: "PUT",
        queryParams: { provider: "google" },
        body: JSON.stringify({
          userPreference: preferences,
        }),
      });
      return response;
    } catch (error: any) {
      console.log(`Trying ${endpoint}: ${error.message}`);
    }
  }

  throw new Error("Could not update user preferences - no valid endpoint found");
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

// Note-Tabs API (Optional - for enhanced note organization)
// These endpoints provide tabbed view and recommended notes for sessions
// Reference: Discovered via reverse engineering

export interface NoteTab {
  tabId: string;
  tabName: string;
  notes: any[];
}

/**
 * Get recommended note tabs for a session
 * Returns organized tabs with notes grouped by type/category
 * 
 * @param sessionId - Session identifier
 * @returns Promise<NoteTab[]> - Array of note tabs with their notes
 */
export async function getRecommendedNoteTabs(sessionId: string): Promise<NoteTab[]> {
  try {
    const response = await makeRequest<{ tabs: NoteTab[] }>(
      `${AWS_API_BASE}/recommend/note-tabs/${sessionId}`,
      {
        method: "GET",
        isAWS: true,
        queryParams: { provider: "google" },
      }
    );
    return response.tabs || [];
  } catch {
    return [];
  }
}

/**
 * Create a custom note tab
 * Allows creating custom tab organization for notes
 * 
 * @param sessionId - Session identifier
 * @param tabName - Name for the new tab
 * @param noteIds - Array of note IDs to include in the tab
 * @returns Promise<{ tabId: string }>
 */
export async function createNoteTab(
  sessionId: string,
  tabName: string,
  noteIds: string[]
): Promise<{ tabId: string }> {
  const response = await makeRequest<{ tabId: string }>(
    `${AWS_API_BASE}/note-tabs`,
    {
      method: "POST",
      isAWS: true,
      queryParams: { provider: "google" },
      body: JSON.stringify({
        sessionId,
        tabName,
        noteIds,
      }),
    }
  );
  
  if (!response.tabId) {
    throw new Error("Note tab creation failed: no tabId returned");
  }
  
  return response;
}

/**
 * Get note templates available for creating notes
 * Returns list of templates with their types and descriptions
 * 
 * @returns Promise<any[]> - Array of note templates
 */
export async function getNoteTemplates(): Promise<any[]> {
  try {
    const response = await makeRequest<{ templates: any[] }>(
      `${AWS_API_BASE}/note-templates`,
      {
        method: "GET",
        isAWS: true,
        queryParams: { provider: "google" },
      }
    );
    return response.templates || [];
  } catch {
    return [];
  }
}

// ─── Search ───

export async function searchSessions(
  query: string,
  cursor?: string,
  limit: number = 10
): Promise<{ sessions: Session[]; nextCursor?: string; hasMore: boolean; total?: number }> {
  const params: Record<string, string> = {
    provider: "google",
    limit: String(limit),
  };
  if (query.trim()) params.query = query.trim();
  if (cursor) params.cursor = cursor;

  const response = await makeRequest<any>(`${SEARCH_API}/digest-sessions-search`, {
    method: "GET",
    isAWS: true,
    queryParams: params,
  });

  const sessions: Session[] = (response.digestSessions || []).map((s: any) => ({
    id: String(s.sid),
    title: s.name || "Untitled",
    sourceType: s.sourceTypes?.[0] || "unknown",
    createdAt: s.created,
  }));

  return {
    sessions,
    nextCursor: response.pagination?.nextCursor ?? undefined,
    hasMore: response.pagination?.hasMore ?? false,
    total: response.total,
  };
}

// ─── Delete ───

export async function deleteSessions(sids: string[]): Promise<void> {
  await makeRequest<any>(`${API_BASE}/digest-session`, {
    method: "DELETE",
    queryParams: { provider: "google" },
    body: JSON.stringify({
      sids: sids.map(s => parseInt(s, 10)),
      provider: "google",
    }),
  });
}

// ─── Usage ───

export async function getUsageInfo(): Promise<any> {
  return makeRequest<any>(`${PAYMENT_API}/usage`, {
    method: "POST",
    queryParams: { provider: "google" },
    body: JSON.stringify({ provider: "google" }),
  });
}

export async function getPaymentInfo(): Promise<any> {
  return makeRequest<any>(`${PAYMENT_API}/payment-info`, {
    method: "GET",
    queryParams: { provider: "google" },
  });
}

// ─── Share ───

export async function shareNote(
  sessionId: string,
  noteId?: string
): Promise<any> {
  const body: any = { sessionId, provider: "google" };
  if (noteId) body.noteId = noteId;

  return makeRequest<any>(`${TASK_RUNNER_API}/note-share`, {
    method: "POST",
    queryParams: { provider: "google" },
    body: JSON.stringify(body),
  });
}

export async function unshareNote(sessionId: string): Promise<void> {
  await makeRequest<any>(`${TASK_RUNNER_API}/note-share/by-session/${sessionId}`, {
    method: "DELETE",
    queryParams: { provider: "google" },
  });
}

export async function getSharedNotes(sessionId: string): Promise<any> {
  try {
    return await makeRequest<any>(`${TASK_RUNNER_API}/shared-notes/by-session/${sessionId}`, {
      method: "GET",
      queryParams: { provider: "google" },
    });
  } catch {
    return null;
  }
}

// ─── Export PDF ───

export async function exportPdf(
  sessionId: string,
  noteId?: string
): Promise<ArrayBuffer> {
  // 1. Get note data to build HTML
  const reportData = await getReport(sessionId, noteId);
  const note = reportData.note;
  if (!note) throw new Error("No note found for this session");

  const versionId = note.versions?.[0]?.id;
  if (!versionId) throw new Error("No note version found");

  const title = note.title || `Session ${sessionId}`;

  // 2. Build HTML from content
  let html: string;
  if (reportData.isMarkdown) {
    html = markdownToBasicHtml(reportData.content, title);
  } else if (reportData.content.includes("<")) {
    html = `<html><body>${reportData.content}</body></html>`;
  } else {
    html = markdownToBasicHtml(reportData.content, title);
  }

  // 3. Call export-pdf API with correct params
  const response = await makeRequest<any>(`${PDF_EXPORT_API}/export-pdf`, {
    method: "POST",
    isAWS: true,
    body: JSON.stringify({
      noteVersionId: versionId,
      html,
      css: "",
      title,
      lang: "ko",
    }),
  });

  // 4. Parse double-wrapped JSON response → presignedUrl
  const body = typeof response.body === "string" ? JSON.parse(response.body) : response;
  const presignedUrl = body.presignedUrl || response.presignedUrl;
  if (!presignedUrl) throw new Error("PDF generation failed: no presignedUrl returned");

  // 5. Download PDF from S3
  const pdfResponse = await fetch(presignedUrl);
  if (!pdfResponse.ok) throw new Error(`PDF download failed: ${pdfResponse.status}`);
  return pdfResponse.arrayBuffer();
}

function markdownToBasicHtml(md: string, title: string): string {
  let html = md
    .replace(/^#### (.*$)/gm, "<h4>$1</h4>")
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^\* (.*$)/gm, "<li>$1</li>")
    .replace(/^- (.*$)/gm, "<li>$1</li>")
    .replace(/```[\s\S]*?```/g, (m) => `<pre>${m.slice(3, -3)}</pre>`)
    .replace(/\|.*\|/g, (row) => {
      const cells = row.split("|").filter(Boolean).map(c => `<td>${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .replace(/<<\d+[-,\d]*>>/g, "")  // Remove timestamp references
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
  return `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6}h1,h2,h3,h4{margin-top:1.5em}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}pre{background:#f5f5f5;padding:12px;overflow-x:auto}li{margin:4px 0}</style></head><body><h1>${title}</h1><p>${html}</p></body></html>`;
}

// ─── Session Detail ───

export async function getSessionResources(sessionId: string): Promise<any[]> {
  try {
    const response = await makeRequest<any>(`${API_BASE}/digest-session-resources`, {
      method: "GET",
      queryParams: { provider: "google", sessionId },
    });
    return response.availableResources || response.resources || response.data || [];
  } catch {
    return [];
  }
}

export async function getSessionDetail(sessionId: string): Promise<any> {
  return makeRequest<any>(`${API_BASE}/digest-session/${sessionId}`, {
    method: "GET",
    queryParams: { provider: "google" },
  });
}

// ─── Tailored Summary Generate (SSE) ───

export type TailoredCategory = "report" | "textbook" | "quiz" | "flashcard" | "meeting" | "blog" | "newsletter";

export const TAILORED_CATEGORIES: { type: TailoredCategory; name: string }[] = [
  { type: "report", name: "Report" },
  { type: "textbook", name: "Textbook" },
  { type: "quiz", name: "Quiz" },
  { type: "flashcard", name: "Flashcard" },
  { type: "meeting", name: "Meeting notes" },
  { type: "blog", name: "Blog post" },
  { type: "newsletter", name: "Newsletter" },
];

export interface SSEEvent {
  event?: string;
  status?: string;
  payload?: any;
}

export async function generateTailoredSummary(
  sessionId: string,
  options: {
    category?: TailoredCategory;
    language?: string;
    onEvent?: (event: SSEEvent) => void;
  } = {}
): Promise<{ noteId: string; content: string }> {
  const { category = "report", language = "ko", onEvent } = options;

  // 1. Get session resources for sourceIds and requestIds
  const resources = await getSessionResources(sessionId);
  const sessionResources = resources.filter(
    (r: any) => String(r.sessionId) === sessionId || !r.sessionId
  );
  const resource = sessionResources[0] || resources[0];
  if (!resource) throw new Error("No resources found for this session");

  const sourceIds = [resource.sourceId];
  const resourceRequestIds = [resource.requestId];
  const title = resource.name || "Untitled";

  // 2. SSE request
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${AGENT_API}/tailored-summary-generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Lilys-Provider": "google",
    },
    body: JSON.stringify({
      sessionId: parseInt(sessionId, 10),
      sourceIds,
      resourceRequestIds,
      title,
      requestId: crypto.randomUUID(),
      category,
      language,
      shouldNotConsumeUsage: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Generation failed: ${response.status} - ${err.slice(0, 300)}`);
  }

  // 3. Parse SSE stream
  let noteId = "";
  let chunks: string[] = [];

  if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data: SSEEvent = JSON.parse(line.slice(6));
            if (data.payload?.note?.sid) noteId = String(data.payload.note.sid);
            if (data.payload?.note?.noteId) noteId = String(data.payload.note.noteId);
            if (data.status === "chunk" && data.payload?.content) {
              chunks.push(data.payload.content);
            }
            onEvent?.(data);
          } catch { /* non-JSON data line */ }
        }
      }
    }
  }

  // 4. If no noteId from stream, fetch from notes list
  if (!noteId) {
    const notes = await getNotesForSession(sessionId);
    if (notes.length > 0) noteId = String(notes[0].sid || notes[0].noteId);
  }

  // 5. Get final content from API (more reliable than chunks)
  let content = chunks.join("");
  if (noteId && !content) {
    const report = await getReport(sessionId, noteId);
    content = report.content;
  }

  return { noteId, content };
}

// ─── Translate ───

export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  const response = await makeRequest<any>(`${SUMMARY_API}/translate-text`, {
    method: "POST",
    body: JSON.stringify({ text, targetLanguage }),
  });
  return response.translatedText || response.text || response.result || "";
}

// ─── Image Generation ───

export async function generateImage(description: string): Promise<string | null> {
  try {
    const response = await makeRequest<{ urls: string[] }>(`${RAG_API}/text-to-image`, {
      method: "POST",
      headers: { "Lilys-Provider": "google" } as any,
      body: JSON.stringify({
        text: description,
        needToGenerateImagePrompt: false,
      }),
    });
    return response.urls?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Process <gen-image description="..."/> tags in markdown content,
 * generating actual images and replacing tags with markdown image syntax.
 */
export async function processGenImageTags(
  content: string,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  const tagPattern = /<gen-image\s+description="([^"]+)"\s*\/?>/g;
  const matches = [...content.matchAll(tagPattern)];
  if (matches.length === 0) return content;

  let result = content;
  for (let i = 0; i < matches.length; i++) {
    const [fullMatch, description] = matches[i];
    onProgress?.(i + 1, matches.length);
    const imageUrl = await generateImage(description);
    if (imageUrl) {
      result = result.replace(fullMatch, `![${description}](${imageUrl})`);
    } else {
      result = result.replace(fullMatch, `> *[Image: ${description}]*`);
    }
  }
  return result;
}

// ─── Video Frame Extraction (Thumbnail) ───

const THUMBNAIL_S3_BASE = "https://resource-release.s3.ap-northeast-2.amazonaws.com/thumbnails";

/**
 * Trigger frame extraction for a video at specific timestamps.
 * Frames are stored on S3 and accessible via getThumbnailUrl().
 */
export async function requestThumbnail(
  sourceId: string,
  times: number[],
  sourceType: string = "youtube_video",
): Promise<any> {
  return makeRequest<any>(`${API_BASE}/thumbnail`, {
    method: "POST",
    queryParams: { provider: "google" },
    body: JSON.stringify({
      sourceId,
      times,
      sourceType,
      provider: "google",
    }),
  });
}

/**
 * Get the S3 URL for a video frame at a specific timestamp.
 * Pattern: https://resource-release.s3.../thumbnails/{sourceId}/{timestamp}.jpg
 */
export function getThumbnailUrl(sourceId: string, timestamp: number): string {
  return `${THUMBNAIL_S3_BASE}/${sourceId}/${timestamp}.jpg`;
}

/**
 * Fetch resource data including sentenceTimestamps mapping.
 * GET api.lilys.ai/backend/resource-data?sessionId=...
 */
export async function getResourceData(sessionId: string): Promise<any> {
  return makeRequest<any>(`${API_BASE}/resource-data`, {
    method: "GET",
    queryParams: { sessionId, provider: "google", is_public: "false" },
  });
}

/**
 * Extract sentence indices from <<N>>, <<N-N>>, <<A-N>> patterns.
 */
export function extractSentenceIndices(content: string): number[] {
  const indices = new Set<number>();
  const pattern = /<<([^>]+)>>/g;
  for (const match of content.matchAll(pattern)) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      // "N-N" → range of indices (e.g., 10-12 → 10, 11, 12)
      const range = trimmed.match(/^(\d+)-(\d+)$/);
      if (range) {
        const start = parseInt(range[1]);
        const end = parseInt(range[2]);
        for (let i = start; i <= end; i++) indices.add(i);
        continue;
      }
      // "A-N" or "1-N" with letter prefix → single index
      const prefixed = trimmed.match(/^[A-Za-z]-(\d+)$/);
      if (prefixed) {
        indices.add(parseInt(prefixed[1]));
        continue;
      }
      // Plain number
      const plain = trimmed.match(/^(\d+)$/);
      if (plain) {
        indices.add(parseInt(plain[1]));
      }
    }
  }
  return [...indices].sort((a, b) => a - b);
}

/**
 * Fetch sentenceTimestamps, resolve indices to real seconds,
 * trigger frame extraction, and inject frame images into content.
 */
export async function processVideoFrames(
  content: string,
  sourceId: string,
  sessionId: string,
  sourceType: string = "youtube_video",
  onProgress?: (msg: string) => void,
): Promise<string> {
  // 1. Get sentenceTimestamps mapping
  onProgress?.("Fetching sentence timestamps...");
  const resourceData = await getResourceData(sessionId);
  const resource = (resourceData.resources || []).find((r: any) => r.sourceId === sourceId);
  const sentenceTimestamps: number[] = resource?.refinedScriptData?.data?.sentenceTimestamps || [];

  if (sentenceTimestamps.length === 0) {
    onProgress?.("No sentence timestamps available, skipping frames.");
    return content;
  }

  // 2. Extract sentence indices from content
  const indices = extractSentenceIndices(content);
  if (indices.length === 0) return content;

  // 3. Map indices to real seconds
  const realTimestamps = [...new Set(
    indices
      .filter(i => i < sentenceTimestamps.length)
      .map(i => Math.floor(sentenceTimestamps[i]))
  )].sort((a, b) => a - b);

  if (realTimestamps.length === 0) {
    onProgress?.("No valid timestamps found.");
    return content;
  }

  // 4. Trigger frame extraction on S3
  onProgress?.(`Requesting ${realTimestamps.length} video frames...`);
  await requestThumbnail(sourceId, realTimestamps, sourceType);

  // Wait for S3 processing with retry
  let framesReady = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise(r => setTimeout(r, 3000));
    const check = await fetch(getThumbnailUrl(sourceId, realTimestamps[0]), { method: "HEAD" });
    if (check.ok) { framesReady = true; break; }
    onProgress?.(`Waiting for frames... (attempt ${attempt + 2})`);
  }
  if (!framesReady) {
    onProgress?.("Frames not available yet, skipping.");
    return content;
  }

  // 6. Insert frame images after section headings
  let result = content;
  const lines = result.split("\n");
  const insertions: { lineIndex: number; img: string }[] = [];
  const usedTimestamps = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].match(/^#{1,3}\s+/)) continue;

    // Collect content until next heading
    let sectionContent = lines[i];
    for (let j = i + 1; j < lines.length && !lines[j].match(/^#{1,3}\s+/); j++) {
      sectionContent += "\n" + lines[j];
    }

    const sectionIndices = extractSentenceIndices(sectionContent);
    const firstValid = sectionIndices.find(idx =>
      idx < sentenceTimestamps.length && !usedTimestamps.has(Math.floor(sentenceTimestamps[idx]))
    );

    if (firstValid !== undefined) {
      const ts = Math.floor(sentenceTimestamps[firstValid]);
      if (usedTimestamps.has(ts)) continue;
      usedTimestamps.add(ts);
      const url = getThumbnailUrl(sourceId, ts);
      // Verify frame exists before inserting
      const frameCheck = await fetch(url, { method: "HEAD" });
      if (frameCheck.ok) {
        const min = Math.floor(ts / 60);
        const sec = ts % 60;
        const timeStr = `${min}:${String(sec).padStart(2, "0")}`;
        insertions.push({ lineIndex: i + 1, img: `![Frame at ${timeStr}](${url})` });
      }
    }
  }

  // Apply from end to preserve line numbers
  for (const ins of insertions.reverse()) {
    lines.splice(ins.lineIndex, 0, "", ins.img, "");
  }

  onProgress?.(`Injected ${insertions.length} video frames.`);
  return lines.join("\n");
}

// ─── Visual Note Rendering (putVisualNote) ───

/**
 * Trigger visual (HTML) rendering for a note version.
 * This populates the `htmlContent` field so the web UI can display the note.
 * PUT agent-release.lilys.ai/notes/{noteId}/versions/{versionId}/visual/v2
 */
export async function putVisualNote(
  noteId: string,
  versionId: string,
  sessionId: string,
  options: {
    language?: string;
    resourceRequestIds?: string[];
    noteTabId?: string;
    shouldNotConsumeUsage?: boolean;
    onEvent?: (event: SSEEvent) => void;
  } = {}
): Promise<{ success: boolean }> {
  const { language = "ko", noteTabId, shouldNotConsumeUsage = true, onEvent } = options;

  // Auto-resolve resourceRequestIds if not provided
  let resourceRequestIds = options.resourceRequestIds || [];
  if (resourceRequestIds.length === 0) {
    const resources = await getSessionResources(sessionId);
    const sessionResource = resources.find((r: any) => String(r.sessionId) === sessionId) || resources[0];
    if (sessionResource?.requestId) {
      resourceRequestIds = [sessionResource.requestId];
    }
  }

  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(
    `${AGENT_API}/notes/${noteId}/versions/${versionId}/visual/v2`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Lilys-Provider": "google",
      },
      body: JSON.stringify({
        sessionId: parseInt(sessionId, 10),
        language,
        resourceRequestIds,
        noteTabId,
        shouldNotConsumeUsage,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Visual rendering failed: ${response.status} - ${err.slice(0, 300)}`);
  }

  // Parse SSE stream
  if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data: SSEEvent = JSON.parse(line.slice(6));
            onEvent?.(data);
          } catch { /* non-JSON data line */ }
        }
      }
    }
  }

  return { success: true };
}

/**
 * Get note details needed for putVisualNote (noteId, versionId, noteTabId).
 * Returns the default note or the most recently created one.
 */
export async function getNoteVersionInfo(sessionId: string, targetNoteId?: string): Promise<{
  noteId: string;
  versionId: string;
  noteTabId: string;
} | null> {
  const notes = await getNotesForSession(sessionId);
  if (notes.length === 0) return null;

  let note: any;
  if (targetNoteId) {
    note = notes.find((n: any) => String(n.noteId || n.sid) === targetNoteId);
  }
  if (!note) {
    // Prefer default note, otherwise latest
    note = notes.find((n: any) => n.isDefaultNote) || notes[0];
  }

  const noteId = String(note.noteId || note.sid);
  const versionId = String(note.versions?.[0]?.id || "");
  const noteTabId = String(note.noteTabId || "");

  if (!versionId) return null;
  return { noteId, versionId, noteTabId };
}

// ─── Collections ───

export interface Collection {
  collectionId: string;
  name: string;
  parentCollectionId?: string;
  updated: string;
  created: string;
  collectionData?: { version?: number; desc?: string; shareType?: string };
  views?: number;
}

export async function listCollections(sortType?: string): Promise<Collection[]> {
  const response = await makeRequest<any>(`${API_BASE}/collections`, {
    method: "GET",
    queryParams: { provider: "google", ...(sortType ? { sortType } : {}) },
  });
  return response.collections || [];
}

export async function createCollection(
  name: string,
  parentCollectionId?: string
): Promise<any> {
  const body: any = { collectionName: name, provider: "google" };
  if (parentCollectionId) body.parentCollectionId = parentCollectionId;

  return makeRequest<any>(`${API_BASE}/collections`, {
    method: "POST",
    queryParams: { provider: "google" },
    body: JSON.stringify(body),
  });
}

export async function updateCollection(
  collectionId: string,
  name: string,
  collectionData?: any,
  parentCollectionId?: string
): Promise<any> {
  const item: any = { collectionId, collectionName: name };
  if (collectionData) item.collectionData = collectionData;
  if (parentCollectionId) item.parentCollectionId = parentCollectionId;

  return makeRequest<any>(`${API_BASE}/collections`, {
    method: "PUT",
    queryParams: { provider: "google" },
    body: JSON.stringify({
      collections: [item],
      provider: "google",
    }),
  });
}

export async function deleteCollection(collectionId: string): Promise<any> {
  return makeRequest<any>(`${API_BASE}/collections`, {
    method: "DELETE",
    queryParams: { provider: "google" },
    body: JSON.stringify({
      collectionId,
      provider: "google",
    }),
  });
}

export async function moveSessionsToCollection(
  collectionId: string,
  sids: string[]
): Promise<any> {
  return makeRequest<any>(`${API_BASE}/digest-session`, {
    method: "PUT",
    queryParams: { provider: "google" },
    body: JSON.stringify({
      collectionId,
      sids: sids.map(s => parseInt(s, 10)),
      provider: "google",
    }),
  });
}

// ─── Security Audit (Owner Testing) ───

export async function checkUsageServer(
  usageType: string,
  requestAmount: number
): Promise<{ amount: number; isAvailable: boolean; quotaLeft: number }> {
  return makeRequest<{ amount: number; isAvailable: boolean; quotaLeft: number }>(
    `${PAYMENT_API}/usage`,
    {
      method: "POST",
      queryParams: { provider: "google" },
      body: JSON.stringify({ usageType, provider: "google", requestAmount }),
    }
  );
}

export async function consumeUsageServer(
  usageType: string,
  usageAmount: number,
  sourceId: string,
  trigger: string
): Promise<any> {
  return makeRequest<any>(`${PAYMENT_API}/usage`, {
    method: "PUT",
    queryParams: { provider: "google" },
    body: JSON.stringify({
      usageType,
      provider: "google",
      usageAmount,
      sourceId,
      trigger,
    }),
  });
}

export async function getModelProfileInfo(): Promise<any> {
  return makeRequest<any>(`${AGENT_API}/v1/model-profile-info`, {
    method: "GET",
    headers: { "Lilys-Provider": "google" } as any,
  });
}

export async function incrementTrialCount(): Promise<any> {
  return makeRequest<any>(`${AGENT_API}/v1/increment-trial-count`, {
    method: "POST",
    headers: { "Lilys-Provider": "google" } as any,
  });
}

export const USAGE_TYPES = [
  "num_boost",
  "youtube_whisper_sec",
  "uploaded_video_sec",
  "pdf_pages",
  "num_translated_chars",
  "num_storage_mb",
  "num_text_chars",
  "long_video_analysis",
  "content_suggestion",
  "num_understanding_tools",
  "num_pdf_translation_page",
  "num_premium_template",
  "premium_animation_trial",
] as const;

export const QUOTA_PER_PLAN: Record<string, Record<string, number>> = {
  free: {
    num_boost: 10, youtube_whisper_sec: 3600, uploaded_video_sec: 3600,
    pdf_pages: 100, num_translated_chars: 50000, num_storage_mb: 500,
    num_text_chars: 50000, long_video_analysis: 0, content_suggestion: 3,
    num_understanding_tools: 5, num_pdf_translation_page: 100,
    num_premium_template: 3, premium_animation_trial: 6,
  },
  starter: {
    num_boost: 50, youtube_whisper_sec: 10800, uploaded_video_sec: 10800,
    pdf_pages: 300, num_translated_chars: 300000, num_storage_mb: 3000,
    num_text_chars: 200000, long_video_analysis: 0, content_suggestion: Infinity,
    num_understanding_tools: 100, num_pdf_translation_page: 300,
    num_premium_template: 20, premium_animation_trial: Infinity,
  },
  basic: {
    num_boost: 1000, youtube_whisper_sec: 36000, uploaded_video_sec: 72000,
    pdf_pages: 3000, num_translated_chars: 1000000, num_storage_mb: 30000,
    num_text_chars: 500000, long_video_analysis: 0, content_suggestion: Infinity,
    num_understanding_tools: 1000, num_pdf_translation_page: 1000,
    num_premium_template: 60, premium_animation_trial: Infinity,
  },
  pro: {
    num_boost: Infinity, youtube_whisper_sec: 180000, uploaded_video_sec: 360000,
    pdf_pages: 10000, num_translated_chars: 3000000, num_storage_mb: 100000,
    num_text_chars: 3000000, long_video_analysis: 10, content_suggestion: Infinity,
    num_understanding_tools: 5000, num_pdf_translation_page: 5000,
    num_premium_template: 200, premium_animation_trial: Infinity,
  },
};
