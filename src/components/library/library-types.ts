import type { BookmarkFilter } from "@/types";

export const libraryFilters: BookmarkFilter[] = [
  "all",
  "favorites",
  "unread",
  "videos",
  "articles",
  "repositories",
  "products",
];

export type LibraryFilter = BookmarkFilter;

export function isLibraryFilter(value: string | undefined): value is LibraryFilter {
  return libraryFilters.some((filter) => filter === value);
}
