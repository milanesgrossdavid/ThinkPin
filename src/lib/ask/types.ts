export type AskRetrievedChunk = {
  chunkId: string | null;
  bookmarkId: string;
  title: string;
  url: string;
  domain: string;
  content: string;
  relevanceScore: number;
};

export type AskSource = {
  bookmarkId: string;
  title: string;
  url: string;
  domain: string;
  relevanceScore: number;
  chunkId?: string;
};

export type AskResponse = {
  answer: string;
  sources: AskSource[];
  query: string;
};

export type AskContext = {
  text: string;
  sources: AskSource[];
};
