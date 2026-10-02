"use client";

import { BookmarkDetailView } from "./bookmark-detail-view";
import { mockBookmarks } from "./mock-bookmarks";

export function MockBookmarkDetail({ bookmarkId }: { bookmarkId: string }) {
  const bookmark = mockBookmarks.find((item) => item.id === bookmarkId);

  if (!bookmark) {
    return null;
  }

  const intent =
    bookmark.id === "nextjs-authentication"
      ? "Research"
      : bookmark.topic === "AI"
        ? "Learn"
        : "Reference";

  return (
    <BookmarkDetailView
      bookmark={{ ...bookmark, savedDate: bookmark.savedDate, intent }}
      collection={bookmark.topic}
      isMock
    />
  );
}
