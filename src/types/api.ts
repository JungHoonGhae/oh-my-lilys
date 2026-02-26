export interface SourceMetadata {
  sourceId: string;
  sourceType: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface ProcessInputResponse {
  action?: string;
  errorType?: string;
  sourceId?: string;
  sourceType?: string;
  title?: string;
}

export interface Session {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
}

export interface NoteResponse {
  noteId: string;
}

export interface SearchSessionsResponse {
  digestSessions: any[];
  pagination?: { nextCursor: string | null; hasMore: boolean };
  total?: number;
}

export interface UsageInfo {
  plan?: string;
  used?: number;
  limit?: number;
  remaining?: number;
  resetDate?: string;
  [key: string]: any;
}

export interface ShareResponse {
  noteId?: string;
  shareUrl?: string;
  shareId?: string;
  [key: string]: any;
}
