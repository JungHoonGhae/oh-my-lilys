import { getToken } from "../utils/config.js";

const API_BASE = "https://api.lilys.ai/backend";
const AWS_API_BASE = "https://wp8tovrz8a.execute-api.ap-northeast-2.amazonaws.com/release";
const METADATA_API = "https://5wjqcmluif.execute-api.ap-northeast-2.amazonaws.com/release";

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
  options: RequestInit & { isAWS?: boolean; queryParams?: Record<string, string> } = {}
): Promise<T> {
  const token = getToken();
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
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  return response.json() as T;
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

export async function getReport(
  sessionId: string,
  noteId?: string
): Promise<{ content: string; note?: any }> {
  if (!noteId) {
    const notes = await getNotesForSession(sessionId);
    if (notes.length === 0) {
      return { content: "No notes found for this session" };
    }
    const firstNote = notes[0];
    noteId = String(firstNote.sid || firstNote.noteId);
  }
  
  const response = await makeRequest<any>(`${AWS_API_BASE}/notes/${sessionId}/${noteId}`, {
    method: "GET",
    isAWS: true,
    queryParams: { provider: "google" },
  });
  
  const content = response.note?.content || response.content || "";
  return { content, note: response.note };
}

export async function getNotesForSession(sessionId: string): Promise<any[]> {
  try {
    const response = await makeRequest<{ notes: any[] }>(`${AWS_API_BASE}/notes/${sessionId}`, {
      method: "GET",
      isAWS: true,
      queryParams: { provider: "google" },
    });
    return response.notes || [];
  } catch {
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

export const NOTE_TYPES: { type: NoteType; name: string }[] = [
  { type: "detailed", name: "Detailed report" },
  { type: "key_points", name: "Key report" },
  { type: "easy", name: "Easy report" },
  { type: "script", name: "Script" },
  { type: "animation", name: "Animation" },
  { type: "infographic", name: "Infographic" },
  { type: "background", name: "Background" },
  { type: "deep_dive", name: "Deep Dive" },
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
    console.warn("Could not fetch sessions list");
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
