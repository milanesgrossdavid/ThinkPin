export type ContentDocument = {
  id: string;
  bookmarkId: string;
  content: string;
  contentHash?: string;
  mimeType?: string;
  language?: string;
  wordCount?: number;
  readingTimeMinutes?: number;
  createdAt: string;
  updatedAt: string;
};

export type ContentChunk = {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount?: number;
  createdAt: string;
};
