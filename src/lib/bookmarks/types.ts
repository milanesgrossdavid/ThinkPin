export type BookmarkStatus = "pending" | "processing" | "ready" | "failed";

export type BookmarkListItem = {
  id: string;
  url: string;
  canonicalUrl: string | null;
  title: string;
  description: string | null;
  domain: string;
  faviconUrl: string | null;
  imageUrl: string | null;
  contentType: string | null;
  intent: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  isRead: boolean;
  contentStatus: BookmarkStatus;
  createdAt: string;
  tags: string[];
  collection: string | null;
  notes: string | null;
};

export type BookmarkDetail = Pick<
  BookmarkListItem,
  | "id"
  | "url"
  | "canonicalUrl"
  | "title"
  | "description"
  | "domain"
  | "imageUrl"
  | "faviconUrl"
  | "contentStatus"
  | "createdAt"
  | "tags"
  | "collection"
  | "notes"
>;

export type BookmarkForIngestion = {
  id: string;
  userId: string;
  url: string;
  domain: string;
};

export type CreatedBookmark = Pick<
  BookmarkListItem,
  "id" | "url" | "canonicalUrl" | "domain" | "contentStatus"
>;
