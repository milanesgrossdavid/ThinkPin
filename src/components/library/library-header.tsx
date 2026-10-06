"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Folder, Plus } from "lucide-react";
import { requestSmartSave } from "../../lib/save-dialog";
import {
  getBookmarksSnapshot,
  getServerBookmarksSnapshot,
  loadSavedBookmarks,
  subscribeToBookmarks,
} from "../../lib/bookmarks";

type LibraryHeaderProps = {
  title?: string;
};

export function LibraryHeader({
  title = "Your Library",
}: LibraryHeaderProps) {
  const bookmarksSnapshot = useSyncExternalStore(
    subscribeToBookmarks,
    getBookmarksSnapshot,
    getServerBookmarksSnapshot,
  );
  const itemCount = useMemo(() => {
    try {
      const bookmarks = loadSavedBookmarks(bookmarksSnapshot);
      return title === "Favorites"
        ? bookmarks.filter((bookmark) => bookmark.favorite).length
        : bookmarks.length;
    } catch {
      return 0;
    }
  }, [bookmarksSnapshot, title]);

  return (
    <header className="border-b border-border/60 bg-background px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <div className="mx-auto flex max-w-container-xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Your Internet Memory
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-muted sm:text-base">
            <span className="font-medium tabular-nums text-text">
              {itemCount.toLocaleString()}
            </span>{" "}
            things you&apos;ve saved
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/app/collections"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border/70 bg-surface-elevated px-3 text-xs font-medium text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-11 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <Folder aria-hidden="true" className="size-4" />
            <span>Collections</span>
          </Link>
          <button
            type="button"
            onClick={() => requestSmartSave()}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-11 sm:gap-2 sm:px-5"
          >
            <Plus aria-hidden="true" className="size-4 sm:size-5" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </header>
  );
}
