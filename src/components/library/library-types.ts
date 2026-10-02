export const libraryFilters = [
  "all",
  "favorites",
  "unread",
  "videos",
  "articles",
  "repositories",
  "products",
] as const;

export type LibraryFilter = (typeof libraryFilters)[number];

export function isLibraryFilter(value: string | undefined): value is LibraryFilter {
  return libraryFilters.some((filter) => filter === value);
}
