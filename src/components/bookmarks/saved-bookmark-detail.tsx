"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Link2 } from "lucide-react";
import { BookmarkDetailView } from "./bookmark-detail-view";
import {
  getBookmarksSnapshot,
  getServerBookmarksSnapshot,
  loadSavedBookmarks,
  subscribeToBookmarks,
} from "../../lib/bookmarks";

export function SavedBookmarkDetail({ bookmarkId }: { bookmarkId: string }) {
  const bookmarksSnapshot = useSyncExternalStore(
    subscribeToBookmarks,
    getBookmarksSnapshot,
    getServerBookmarksSnapshot,
  );
  const { bookmark, message } = useMemo(() => {
    if (bookmarksSnapshot === null) {
      return {
        bookmark: null,
        message:
          "We couldn't read this saved link. Check your browser storage permissions.",
      };
    }

    try {
      const bookmark =
        loadSavedBookmarks(bookmarksSnapshot).find(
          (item) => item.id === bookmarkId,
        ) ?? null;
      return {
        bookmark,
        message: bookmark ? "" : "This saved link isn't available in this browser.",
      };
    } catch {
      return {
        bookmark: null,
        message:
          "We couldn't read this saved link. Check your browser storage permissions.",
      };
    }
  }, [bookmarksSnapshot, bookmarkId]);

  if (bookmark) {
    return (
      <BookmarkDetailView
        bookmark={{
          id: bookmark.id,
          title: bookmark.title,
          description: bookmark.description,
          topic: bookmark.collection,
          subtopic: bookmark.intent ?? "Saved link",
          tags: bookmark.tags,
          domain: bookmark.domain,
          url: bookmark.url,
          savedAt: bookmark.savedAt,
          savedDate: bookmark.savedAt.slice(0, 10),
          icon: Link2,
          artwork: "from-primary/15 via-sky-500/10 to-transparent",
          contentType: /github\.com$/i.test(bookmark.domain)
            ? "repository"
            : /youtube\.com$|youtu\.be$/i.test(bookmark.domain)
              ? "video"
              : /amazon\.|etsy\.|shop/i.test(bookmark.domain)
                ? "product"
                : "article",
          intent: bookmark.intent,
          favorite: bookmark.favorite ?? false,
          unread: bookmark.unread ?? false,
          archived: bookmark.archived ?? false,
          notes: bookmark.notes,
        }}
        collection={bookmark.collection}
      />
    );
  }

  return (
    <main className="min-h-svh bg-background px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <p className="mt-8 rounded-2xl border border-border/60 bg-surface-elevated p-5 text-sm text-text-muted">
          {message || "Loading saved link..."}
        </p>
      </div>
    </main>
  );
}
