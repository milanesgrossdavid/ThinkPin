export type AIEmbeddingInput = {
  input: string[];
};

export type AIEmbeddingResult = {
  provider: string;
  model: string;
  dimensions: number;
  embeddings: number[][];
  inputTokens: number;
  requestId?: string;
};

export type BookmarkEnrichment = {
  title: string;
  description: string;
  savedReason: string;
  tags: string[];
  suggestedCollection: string | null;
  contentType:
    | "article"
    | "video"
    | "repository"
    | "product"
    | "tool"
    | "social"
    | "document"
    | "image"
    | "other";
  intent:
    | "research"
    | "learn"
    | "reference"
    | "inspiration"
    | "buy"
    | "project"
    | "read-later"
    | "watch-later"
    | "other";
};

export type BookmarkEnrichmentInput = {
  url: string;
  title: string;
  description: string | null;
  content: string | null;
  collections: string[];
};

export type AIAnswerInput = {
  question: string;
  context: string;
};

export type AIAnswerResult = {
  provider: string;
  model: string;
  answer: string;
  inputTokens: number;
  outputTokens: number;
};

export type AITask = "embedding" | "bookmark-enrichment" | "answer";

export class AIProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderUnavailableError";
  }
}

export interface AIProvider {
  readonly id: string;
  generateEmbedding(input: AIEmbeddingInput): Promise<AIEmbeddingResult>;
}

export interface AITextProvider {
  readonly id: string;
  enrichBookmark(input: BookmarkEnrichmentInput): Promise<BookmarkEnrichment>;
}

export interface AIAnswerProvider {
  readonly id: string;
  answerQuestion(input: AIAnswerInput): Promise<AIAnswerResult>;
}
