export type BookmarkFilter =
  | "all"
  | "favorites"
  | "unread"
  | "videos"
  | "articles"
  | "repositories"
  | "products";

export type BookmarkSort =
  | "recent"
  | "oldest"
  | "updated"
  | "alphabetical";

export type BookmarkView = "grid" | "list" | "compact";

export type LibraryState = {
  filter: BookmarkFilter;
  sort: BookmarkSort;
  view: BookmarkView;
  searchQuery: string;
};
