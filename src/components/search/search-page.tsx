"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  Command,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Globe2,
} from "lucide-react";
import { BookmarkGrid } from "../bookmarks/BookmarkGrid";
import { BookmarkList } from "../bookmarks/BookmarkList";
import { mockBookmarks, type LibraryBookmark } from "../bookmarks/mock-bookmarks";
import type { BookmarkView } from "../bookmarks/types";
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
import {
  relatedTopics,
  searchBookmarks,
  type SearchMode,
  type SearchState,
} from "../../lib/search";

const searchSuggestions = [
  "Next.js authentication",
  "AI tools I saved recently",
  "Things I wanted to buy",
  "Articles about design systems",
];

const modes: Array<{ id: SearchMode; label: string }> = [
  { id: "keyword", label: "Keyword" },
  { id: "full-text", label: "Full-text" },
  { id: "semantic", label: "Semantic" },
  { id: "ai", label: "AI" },
];

function toSavedLibraryBookmark(
  bookmark: ReturnType<typeof loadSavedBookmarks>[number],
): LibraryBookmark {
  let contentType: LibraryBookmark["contentType"] = "article";
  if (/github\.com$/i.test(bookmark.domain)) {
    contentType = "repository";
  } else if (/youtube\.com$|youtu\.be$/i.test(bookmark.domain)) {
    contentType = "video";
  } else if (/amazon\.|etsy\.|shop/i.test(bookmark.domain)) {
    contentType = "product";
  }

  return {
    ...bookmark,
    topic: bookmark.collection === "Unsorted" ? "Saved links" : bookmark.collection,
    subtopic: bookmark.intent ?? "Saved",
    icon: Globe2,
    artwork: "from-primary/15 via-sky-500/10 to-transparent",
    contentType,
    favorite: bookmark.favorite ?? false,
    unread: true,
    savedDate: bookmark.savedAt.slice(0, 10),
    searchTerms: [bookmark.collection, bookmark.intent ?? "", bookmark.url],
  };
}

function loadSearchData(
  bookmarksSnapshot: string | null,
  detailsSnapshot: string | null,
) {
  if (bookmarksSnapshot === null || detailsSnapshot === null) {
    throw new Error("Browser storage is unavailable.");
  }

  const parsedDetails: unknown = JSON.parse(detailsSnapshot);
  if (
    !Array.isArray(parsedDetails) ||
    !parsedDetails.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        typeof entry[1] === "string",
    )
  ) {
    throw new Error("Saved bookmark details are invalid.");
  }

  const details = new Map(
    parsedDetails.map(([id, raw]: [string, string]) => [
      id,
      readBookmarkDetailState(raw),
    ]),
  );
  const notesByBookmark: Record<string, string> = {};
  details.forEach((detail, id) => {
    if (detail.notes) {
      notesByBookmark[id] = detail.notes;
    }
  });

  const savedBookmarks = loadSavedBookmarks(bookmarksSnapshot).map(
    toSavedLibraryBookmark,
  );
  const bookmarks = [...savedBookmarks, ...mockBookmarks]
    .map((bookmark) => {
      const detail = details.get(bookmark.id);
      return {
        ...bookmark,
        topic: detail?.collection ?? bookmark.topic,
        tags: detail?.tags ?? bookmark.tags,
        favorite: detail?.favorite ?? bookmark.favorite,
        archived: detail?.archived ?? bookmark.archived,
      };
    })
    .filter((bookmark) => !bookmark.archived);

  return { bookmarks, notesByBookmark };
}

export function SearchPage({
  initialQuery = "",
  initialMode = "keyword",
}: {
  initialQuery?: string;
  initialMode?: SearchMode;
}) {
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
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [view, setView] = useState<BookmarkView>("list");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const { bookmarks, notesByBookmark, storageError } = useMemo(() => {
    try {
      const { bookmarks, notesByBookmark } = loadSearchData(
        bookmarksSnapshot,
        detailsSnapshot,
      );
      return { bookmarks, notesByBookmark, storageError: "" };
    } catch {
      return {
        bookmarks: mockBookmarks,
        notesByBookmark: {},
        storageError:
          bookmarksSnapshot === null || detailsSnapshot === null
            ? "We couldn't access locally saved items. Showing sample bookmarks instead."
            : "Some saved search data is invalid. Showing sample bookmarks instead.",
      };
    }
  }, [bookmarksSnapshot, detailsSnapshot]);

  const searchState: SearchState = useMemo(() => {
    if (!debouncedQuery.trim() || mode === "ai") {
      return { query: debouncedQuery, results: [], topics: [], mode };
    }

    const results = searchBookmarks(
      bookmarks,
      debouncedQuery,
      mode,
      notesByBookmark,
    );
    return {
      query: debouncedQuery,
      results,
      topics: relatedTopics(results, debouncedQuery, mode),
      mode,
    };
  }, [bookmarks, debouncedQuery, mode, notesByBookmark]);

  const isSearching = query !== debouncedQuery;
  const hasQuery = Boolean(query.trim());

  return (
    <main className="min-h-svh bg-background px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:px-12">
      <div className="mx-auto max-w-container-xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Your Internet Memory
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-4xl">
                Search
              </h1>
              <p className="mt-2 text-sm text-text-muted sm:text-base">
                Find anything you&apos;ve saved.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new Event("thinkpin:open-command-menu"))
              }
              className="hidden min-h-9 items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 text-xs font-medium text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:inline-flex"
            >
              <Command aria-hidden="true" className="size-3.5" />
              <span>Commands</span>
              <kbd className="rounded-md bg-background px-1.5 py-0.5 text-[10px]">
                ⌘ K / Ctrl K
              </kbd>
            </button>
          </div>
        </header>

        <section aria-label="Search your memory" className="mt-7 sm:mt-9">
          <label className="relative block">
            <span className="sr-only">Search your memory</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-muted sm:left-5"
            />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 150)}
              placeholder="Search your memory..."
              className="h-14 w-full rounded-2xl border border-border/70 bg-surface-elevated pl-12 pr-4 text-sm text-text shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10 sm:h-16 sm:rounded-3xl sm:pl-14 sm:pr-24 sm:text-base"
            />
            <kbd className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-text-muted sm:inline-flex">
              ⌘ K
            </kbd>
          </label>

          {focused && !hasQuery && (
            <div className="mt-3 rounded-2xl border border-border/60 bg-surface-elevated p-4 shadow-sm sm:p-5">
              <p className="text-xs font-semibold text-text">
                Try a natural language search
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Ask about what you saved, not just a title or URL.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setQuery(suggestion);
                      setFocused(false);
                    }}
                    className="min-h-8 rounded-full border border-border/70 bg-background px-3 text-xs text-text-muted transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    “{suggestion}”
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Search mode"
            className="flex flex-wrap gap-1 rounded-full bg-surface p-1"
          >
            {modes.map((searchMode) => (
              <button
                key={searchMode.id}
                type="button"
                aria-pressed={mode === searchMode.id}
                onClick={() => setMode(searchMode.id)}
                className={`min-h-8 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  mode === searchMode.id
                    ? "bg-surface-elevated text-text shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {searchMode.id === "ai" && (
                  <Sparkles aria-hidden="true" className="mr-1 inline size-3" />
                )}
                {searchMode.label}
                {searchMode.id === "ai" && (
                  <span className="ml-1 text-[9px] text-text-muted">
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
          {hasQuery && (
            <div
              role="group"
              aria-label="Search result view"
              className="flex items-center gap-1 rounded-full bg-surface p-1"
            >
              {[
                ["grid", "Grid", LayoutGrid],
                ["list", "List", List],
              ].map(([value, label, Icon]) => {
                const ViewIcon = Icon as typeof LayoutGrid;
                return (
                  <button
                    key={value as string}
                    type="button"
                    aria-label={`${label} view`}
                    aria-pressed={view === value}
                    onClick={() => setView(value as BookmarkView)}
                    className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      view === value
                        ? "bg-surface-elevated text-text shadow-sm"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    <ViewIcon aria-hidden="true" className="size-3.5" />
                    {label as string}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {storageError && (
          <p className="mt-4 text-xs text-warning" role="status">
            {storageError}
          </p>
        )}

        {!hasQuery ? (
          <section className="mt-10 max-w-3xl sm:mt-14">
            <h2 className="text-sm font-semibold text-text">
              Try searching for
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="group flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface-elevated px-4 text-left text-sm text-text-muted transition-colors hover:border-primary/30 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span>“{suggestion}”</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-text-muted transition-colors group-hover:text-primary"
                  />
                </button>
              ))}
            </div>
          </section>
        ) : mode === "ai" ? (
          <section className="mt-8 rounded-3xl border border-border/60 bg-surface-elevated p-5 sm:p-7">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles aria-hidden="true" className="size-4" />
              <h2 className="text-sm font-semibold">AI Search</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              AI answers with cited sources are coming soon. Your bookmarks
              remain searchable in Keyword, Full-text, and Semantic modes.
            </p>
            <button
              type="button"
              onClick={() => setMode("semantic")}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Search semantically instead
            </button>
          </section>
        ) : isSearching ? (
          <p className="mt-8 text-sm text-text-muted" role="status" aria-live="polite">
            Searching your memory...
          </p>
        ) : (
          <section className="mt-8" aria-labelledby="search-results-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2
                  id="search-results-title"
                  className="text-lg font-semibold tracking-[-0.03em] text-text"
                >
                  {searchState.results.length}{" "}
                  {searchState.results.length === 1 ? "result" : "results"}
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  {mode === "semantic"
                    ? "Related by meaning and saved context"
                    : mode === "full-text"
                      ? "Matched titles, descriptions, tags, and notes"
                      : "Matched bookmark titles and domains"}
                </p>
              </div>
            </div>

            {searchState.topics.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold text-text">
                  Related topics
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {searchState.topics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setQuery(topic)}
                      className="min-h-8 rounded-full bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              {searchState.results.length > 0 ? (
                view === "grid" ? (
                  <BookmarkGrid bookmarks={searchState.results} />
                ) : (
                  <BookmarkList bookmarks={searchState.results} />
                )
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-surface-elevated px-5 py-12 text-center sm:py-16">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Search aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-text">
                    Nothing found
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-text-muted">
                    Try another search or switch to semantic search to explore
                    related ideas.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode("semantic")}
                    className="mt-4 text-sm font-medium text-primary hover:underline"
                  >
                    Search semantically
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
