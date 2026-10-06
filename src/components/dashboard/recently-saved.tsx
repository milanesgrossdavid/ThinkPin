"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowDownRight, ArrowUpRight, Globe2 } from "lucide-react";
import { BookmarkGrid } from "../bookmarks/BookmarkGrid";
import type { LibraryBookmark } from "../bookmarks/types";
import {
  getBookmarkDetailsSnapshot,
  getBookmarksSnapshot,
  getServerBookmarkDetailsSnapshot,
  getServerBookmarksSnapshot,
  loadSavedBookmarks,
  readBookmarkDetailState,
  subscribeToBookmarkDetails,
  subscribeToBookmarks,
} from "../../lib/bookmarks";

export function RecentlySaved() {
  const bookmarksSnapshot = useSyncExternalStore(
    subscribeToBookmarks,
    getBookmarksSnapshot,
    getServerBookmarksSnapshot,
  );
  const detailsSnapshot = useSyncExternalStore(
    subscribeToBookmarkDetails,
    getBookmarkDetailsSnapshot,
    getServerBookmarkDetailsSnapshot,
  );
  const [showAll, setShowAll] = useState(false);
  const savedItems = useMemo(() => {
    try {
      const details: unknown = JSON.parse(detailsSnapshot || "[]");
      if (!Array.isArray(details)) return [];
      const detailById = new Map<string, ReturnType<typeof readBookmarkDetailState>>();
      for (const entry of details) {
        if (
          Array.isArray(entry) &&
          entry.length === 2 &&
          typeof entry[0] === "string" &&
          typeof entry[1] === "string"
        ) {
          detailById.set(entry[0], readBookmarkDetailState(entry[1]));
        }
      }

      return loadSavedBookmarks(bookmarksSnapshot)
        .map((bookmark) => {
          const detail = detailById.get(bookmark.id);
          return {
            ...bookmark,
            title: detail?.title ?? bookmark.title,
            description: detail?.description ?? bookmark.description,
            collection: detail?.collection ?? bookmark.collection,
            tags: detail?.tags ?? bookmark.tags,
            favorite: detail?.favorite ?? bookmark.favorite ?? false,
            archived: detail?.archived ?? bookmark.archived ?? false,
            deleted: detail?.deleted ?? false,
          };
        })
        .filter((bookmark) => !bookmark.archived && !bookmark.deleted)
        .slice(0, 6)
        .map(
          (bookmark): LibraryBookmark => ({
            ...bookmark,
            topic: bookmark.collection,
            subtopic: bookmark.intent ?? "Saved",
            icon: Globe2,
            artwork: "from-primary/15 via-sky-500/10 to-transparent",
            contentType: "article",
            favorite: bookmark.favorite ?? false,
            unread: bookmark.unread ?? false,
            savedDate: bookmark.savedAt.slice(0, 10),
            searchTerms: [bookmark.title, bookmark.domain, bookmark.url],
          }),
        );
    } catch {
      return [];
    }
  }, [bookmarksSnapshot, detailsSnapshot]);
  const visibleItems = showAll ? savedItems : savedItems.slice(0, 3);

  return (
    <section
      id="recently-saved"
      aria-labelledby="recently-saved-title"
      className="px-5 pb-10 pt-2 sm:px-8 sm:pb-14 lg:px-12"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
          <div>
            <h2
              id="recently-saved-title"
              className="text-xl font-semibold tracking-[-0.035em] text-text sm:text-2xl"
            >
              Recently saved
            </h2>
          </div>
          {savedItems.length > 3 && (
            <button
              type="button"
              aria-expanded={showAll}
              aria-controls="recently-saved-grid"
              onClick={() => setShowAll((current) => !current)}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
            >
              {showAll ? "Show recent" : "View all"}
              {showAll ? (
                <ArrowDownRight
                  aria-hidden="true"
                  className="size-4 rotate-180"
                />
              ) : (
                <ArrowUpRight aria-hidden="true" className="size-4" />
              )}
            </button>
          )}
        </div>

        {visibleItems.length ? (
          <BookmarkGrid
            id="recently-saved-grid"
            labelledBy="recently-saved-title"
            bookmarks={visibleItems}
          />
        ) : (
          <p className="rounded-2xl border border-border/60 bg-surface-elevated p-5 text-sm text-text-muted">
            Your saved bookmarks will appear here.
          </p>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          Showing {visibleItems.length} saved bookmarks.
        </p>
      </div>
    </section>
  );
}
