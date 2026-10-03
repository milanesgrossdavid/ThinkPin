export type BookmarkActivityType =
  | "created"
  | "updated"
  | "favorited"
  | "unfavorited"
  | "archived"
  | "unarchived"
  | "tag-added"
  | "tag-removed"
  | "collection-added"
  | "collection-removed"
  | "ai-analyzed";

export type BookmarkActivity = {
  id: string;
  bookmarkId: string;
  type: BookmarkActivityType;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
