import type { Collection } from "./collection";
import type { Note } from "./note";
import type { Tag } from "./tag";

export type ContentType =
  | "article"
  | "video"
  | "repository"
  | "product"
  | "tool"
  | "social"
  | "document"
  | "image"
  | "other";

export type BookmarkIntent =
  | "research"
  | "learn"
  | "reference"
  | "inspiration"
  | "buy"
  | "project"
  | "read-later"
  | "watch-later"
  | "other";

export type Bookmark = {
  id: string;
  url: string;
  canonicalUrl?: string;
  title: string;
  description?: string;
  domain: string;
  faviconUrl?: string;
  imageUrl?: string;
  contentType: ContentType;
  intent?: BookmarkIntent;
  savedReason?: string;
  isFavorite: boolean;
  isArchived: boolean;
  isRead?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type BookmarkWithRelations = Bookmark & {
  tags: Tag[];
  collections: Collection[];
};

export type BookmarkDetail = Bookmark & {
  tags: Tag[];
  collections: Collection[];
  notes: Note[];
  aiSummary?: string;
  relatedBookmarks: Bookmark[];
};
