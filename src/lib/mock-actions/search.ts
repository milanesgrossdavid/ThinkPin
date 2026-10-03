import type { LibraryBookmark } from "../../components/bookmarks/mock-bookmarks";
import {
  relatedTopics,
  searchBookmarks,
  type SearchMode,
  type SearchState,
} from "../search";

function simulateRequest() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 300));
}

export async function mockSearchBookmarks(
  bookmarks: LibraryBookmark[],
  query: string,
  mode: Exclude<SearchMode, "ai">,
  notesByBookmark: Record<string, string> = {},
): Promise<SearchState> {
  await simulateRequest();
  const results = searchBookmarks(bookmarks, query, mode, notesByBookmark);
  return {
    query,
    results,
    topics: relatedTopics(results, query, mode),
    mode,
  };
}
