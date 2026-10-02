"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { BookmarkGrid } from "../bookmarks/BookmarkGrid";
import { mockBookmarks } from "../bookmarks/mock-bookmarks";

const savedItems = mockBookmarks.slice(0, 6);

export function RecentlySaved() {
  const [showAll, setShowAll] = useState(false);
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Sample bookmarks
            </p>
            <h2
              id="recently-saved-title"
              className="mt-1.5 text-xl font-semibold tracking-[-0.035em] text-text sm:text-2xl"
            >
              Recently saved
            </h2>
          </div>
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
        </div>

        <BookmarkGrid
          id="recently-saved-grid"
          labelledBy="recently-saved-title"
          bookmarks={visibleItems}
        />
        <p className="sr-only" role="status" aria-live="polite">
          Showing {visibleItems.length} sample bookmarks.
        </p>
      </div>
    </section>
  );
}
