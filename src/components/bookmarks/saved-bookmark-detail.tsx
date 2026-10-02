"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Link2 } from "lucide-react";
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

  return (
    <main className="min-h-svh bg-background px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/library"
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Your Library
        </Link>

        {bookmark ? (
          <article className="mt-5 overflow-hidden rounded-3xl border border-border/60 bg-surface-elevated shadow-sm sm:mt-7">
            <div className="flex aspect-[16/9] max-h-80 items-center justify-center bg-gradient-to-br from-primary/15 via-surface to-surface-elevated">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-surface-elevated text-primary shadow-sm">
                <Link2 aria-hidden="true" className="size-6" />
              </span>
            </div>
            <div className="p-5 sm:p-8">
              <p className="text-xs font-medium text-primary">
                {bookmark.collection}
              </p>
              <h1 className="mt-2 break-words text-2xl font-semibold leading-tight tracking-[-0.04em] text-text sm:text-4xl">
                {bookmark.title}
              </h1>
              {bookmark.description && (
                <p className="mt-4 text-sm leading-7 text-text-muted sm:text-base">
                  {bookmark.description}
                </p>
              )}
              <a
                href={bookmark.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex max-w-full items-center gap-2 truncate text-sm font-medium text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="truncate">{bookmark.domain}</span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
              </a>
              {bookmark.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {bookmark.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-text-muted"
                    >
                      #{tag.replace(/^#/, "")}
                    </span>
                  ))}
                </div>
              )}
              {bookmark.intent && (
                <p className="mt-5 text-xs text-text-muted">
                  Saved for:{" "}
                  <span className="font-medium text-text">
                    {bookmark.intent}
                  </span>
                </p>
              )}
              <p className="mt-7 border-t border-border/60 pt-5 text-xs text-text-muted">
                Saved {new Date(bookmark.savedAt).toLocaleDateString()}
              </p>
            </div>
          </article>
        ) : (
          <p className="mt-8 rounded-2xl border border-border/60 bg-surface-elevated p-5 text-sm text-text-muted">
            {message || "Loading saved link..."}
          </p>
        )}
      </div>
    </main>
  );
}
