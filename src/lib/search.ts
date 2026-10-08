export type SearchMode = "keyword" | "full-text" | "semantic" | "ai";

export type SearchableBookmark = {
  id: string;
  title: string;
  description?: string;
  domain: string;
  topic: string;
  subtopic: string;
  tags?: string[];
  searchTerms: string[];
};

export type SearchState<T extends SearchableBookmark = SearchableBookmark> = {
  query: string;
  results: T[];
  topics: string[];
  mode: SearchMode;
};
