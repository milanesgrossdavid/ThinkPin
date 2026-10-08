import type { Bookmark } from "./bookmark";

export type SearchMode = "keyword" | "full-text" | "semantic" | "ai";

export type SearchState = "idle" | "searching" | "success" | "empty" | "error";

export type SearchResult = {
  bookmark: Bookmark;
  score?: number;
  matchedFields?: string[];
};

export type SearchResponse = {
  query: string;
  mode: SearchMode;
  results: SearchResult[];
  relatedTopics: string[];
  total: number;
};

export type AISearchAnswer = {
  answer: string;
  sources: Bookmark[];
  relatedTopics?: string[];
};

export type AISearchResponse = {
  answer: AISearchAnswer;
  results: SearchResult[];
  query: string;
};
