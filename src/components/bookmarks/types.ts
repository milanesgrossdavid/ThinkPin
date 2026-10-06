import type { LucideIcon } from "lucide-react";

export type { BookmarkView } from "../../types/library";

export type Bookmark = {
  id: string;
  title: string;
  description?: string;
  topic: string;
  subtopic: string;
  tags?: string[];
  domain: string;
  url: string;
  savedAt: string;
  icon: LucideIcon;
  artwork: string;
  thumbnailUrl?: string;
  contentType?:
    | "article"
    | "video"
    | "repository"
    | "product"
    | "tool"
    | "social"
    | "document"
    | "other";
  favorite?: boolean;
  unread?: boolean;
  archived?: boolean;
  notes?: string;
  intent?: string;
  savedDate?: string;
};

export type LibraryBookmark = Omit<
  Bookmark,
  "icon" | "artwork" | "contentType"
> & {
  icon: LucideIcon;
  artwork: string;
  contentType: NonNullable<Bookmark["contentType"]>;
  favorite: boolean;
  unread: boolean;
  savedDate: string;
  searchTerms: string[];
  archived?: boolean;
  deleted?: boolean;
};
