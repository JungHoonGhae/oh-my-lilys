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
