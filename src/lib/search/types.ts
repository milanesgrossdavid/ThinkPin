export type SearchMode = "keyword" | "full-text" | "semantic" | "hybrid";

export type SearchFilters = {
  contentType?: string;
  isFavorite?: boolean;
  isRead?: boolean;
  collection?: string;
  tag?: string;
  createdAfter?: string;
  limit?: number;
};

export type SearchBookmark = {
  id: string;
  url: string;
  canonicalUrl: string | null;
  title: string;
  description: string | null;
  domain: string;
  faviconUrl: string | null;
  imageUrl: string | null;
  contentType: string;
  intent: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  isRead: boolean;
  contentStatus: string;
  createdAt: string;
  tags: string[];
  collection: string | null;
  notes: string | null;
  score: number;
  matchedFields: string[];
};

export type RelatedBookmark = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  domain: string;
  imageUrl: string | null;
  contentType: string;
  createdAt: string;
  tags: string[];
  similarity: number;
};
