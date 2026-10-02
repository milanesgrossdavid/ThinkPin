import type { LucideIcon } from "lucide-react";

export type BookmarkView = "grid" | "list" | "compact";

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
  intent?: string;
  savedDate?: string;
};
