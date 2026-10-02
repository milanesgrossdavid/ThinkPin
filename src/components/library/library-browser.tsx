"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Globe2,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { BookmarkGrid } from "../bookmarks/BookmarkGrid";
import { BookmarkList } from "../bookmarks/BookmarkList";
import { mockBookmarks, type LibraryBookmark } from "../bookmarks/mock-bookmarks";
import type { BookmarkView } from "../bookmarks/types";
import {
  getBookmarksSnapshot,
  getServerBookmarksSnapshot,
  loadSavedBookmarks,
  subscribeToBookmarks,
} from "../../lib/bookmarks";
import {
  isLibraryFilter,
  type LibraryFilter,
} from "./library-types";

const tabs = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "unread", label: "Unread" },
  { id: "videos", label: "Videos" },
  { id: "articles", label: "Articles" },
  { id: "repositories", label: "Repositories" },
  { id: "products", label: "Products" },
] as const;

type DateFilter = "any-time" | "today" | "this-week" | "this-month";

const topics = ["Development", "AI", "Design", "Research", "Inspiration"];
const dateOptions = [
  ["any-time", "Any time"],
  ["today", "Today"],
  ["this-week", "This week"],
  ["this-month", "This month"],
] as const;
const ignoredSearchTerms = new Set([
  "a",
  "an",
  "and",
  "for",
  "i",
  "in",
  "last",
  "me",
  "my",
  "of",
  "on",
  "the",
  "this",
  "to",
  "what",
  "when",
  "where",
  "year",
  "saved",
]);

function matchesDate(date: string, filter: DateFilter) {
  if (filter === "any-time") {
    return true;
  }

  const saved = new Date(`${date}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const savedDay = new Date(saved);
  savedDay.setHours(0, 0, 0, 0);
  const daysAgo = Math.floor(
    (today.getTime() - savedDay.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (filter === "today") {
    return daysAgo === 0;
  }
  if (filter === "this-week") {
    return daysAgo >= 0 && daysAgo < 7;
  }

  return (
    saved.getFullYear() === today.getFullYear() &&
    saved.getMonth() === today.getMonth()
  );
}

export function LibraryBrowser({
  initialFilter,
}: {
  initialFilter: LibraryFilter;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const bookmarksSnapshot = useSyncExternalStore(
    subscribeToBookmarks,
    getBookmarksSnapshot,
    getServerBookmarksSnapshot,
  );
  const [filter, setFilter] = useState<LibraryFilter>(initialFilter);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("any-time");
  const [view, setView] = useState<BookmarkView>("grid");
  const [favoriteOverrides, setFavoriteOverrides] = useState<
    Record<string, boolean>
  >({});
  const [unreadOverrides, setUnreadOverrides] = useState<
    Record<string, boolean>
  >({});

  const { savedBookmarks, storageMessage } = useMemo(() => {
    if (bookmarksSnapshot === null) {
      return {
        savedBookmarks: [],
        storageMessage:
          "We couldn't read saved links from this browser. Check your browser storage permissions.",
      };
    }

    try {
      const savedItems = loadSavedBookmarks(bookmarksSnapshot);
      const savedBookmarks = savedItems.map(
        (bookmark): LibraryBookmark => {
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
            topic:
              bookmark.collection === "Unsorted"
                ? "Saved links"
                : bookmark.collection,
            subtopic: bookmark.intent ?? "Saved",
            icon: Globe2,
            artwork: "from-primary/15 via-sky-500/10 to-transparent",
            contentType,
            favorite: false,
            unread: true,
            savedDate: bookmark.savedAt.slice(0, 10),
            searchTerms: [
              bookmark.collection,
              bookmark.intent ?? "",
              bookmark.url,
            ],
          };
        },
      );
      return { savedBookmarks, storageMessage: "" };
    } catch {
      return {
        savedBookmarks: [],
        storageMessage:
          "We couldn't read saved links from this browser. Check your browser storage permissions.",
      };
    }
  }, [bookmarksSnapshot]);

  useEffect(() => {
    function handlePopState() {
      const currentFilter = new URLSearchParams(window.location.search).get(
        "filter",
      );
      setFilter(
        currentFilter !== null && isLibraryFilter(currentFilter)
          ? currentFilter
          : "all",
      );
    }

    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleShortcut);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  function selectFilter(nextFilter: LibraryFilter) {
    setFilter(nextFilter);
    const url = new URL(window.location.href);
    if (nextFilter === "all") {
      url.searchParams.delete("filter");
    } else {
      url.searchParams.set("filter", nextFilter);
    }
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const filteredBookmarks = useMemo(() => {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 1 && !ignoredSearchTerms.has(term))
      .map((term) => (term.endsWith("s") ? term.slice(0, -1) : term));

    return [...savedBookmarks, ...mockBookmarks].filter((bookmark) => {
      const matchesTab =
        filter === "all" ||
        (filter === "favorites" &&
          (favoriteOverrides[bookmark.id] ?? bookmark.favorite)) ||
        (filter === "unread" &&
          (unreadOverrides[bookmark.id] ?? bookmark.unread)) ||
        bookmark.contentType ===
          (filter === "videos"
            ? "video"
            : filter === "articles"
              ? "article"
              : filter === "repositories"
                ? "repository"
                : filter === "products"
                  ? "product"
                  : "");
      const searchable = [
        bookmark.title,
        bookmark.description,
        bookmark.topic,
        bookmark.subtopic,
        bookmark.domain,
        ...bookmark.searchTerms,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = terms.every((term) => searchable.includes(term));
      const matchesTopics =
        selectedTopics.length === 0 || selectedTopics.includes(bookmark.topic);
      return (
        matchesTab &&
        matchesQuery &&
        matchesTopics &&
        matchesDate(bookmark.savedDate, dateFilter)
      );
    });
  }, [
    dateFilter,
    favoriteOverrides,
    filter,
    query,
    savedBookmarks,
    selectedTopics,
    unreadOverrides,
  ]);

  return (
    <section
      aria-label="Search and filter your library"
      className="px-5 py-6 sm:px-8 sm:py-8 lg:px-12"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-muted"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your memory..."
            aria-label="Search your memory"
            className="h-14 w-full rounded-2xl border border-border/70 bg-surface-elevated pl-12 pr-20 text-sm text-text shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10 sm:h-16 sm:rounded-3xl sm:pl-14 sm:text-base"
          />
          <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-text-muted sm:inline-flex">
            ⌘ K
          </kbd>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-text-muted hover:bg-background sm:hidden"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Search titles, topics, domains, or describe what you remember.
        </p>
        {storageMessage && (
          <p className="mt-3 text-xs text-error" role="alert">
            {storageMessage}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Filter library by type or state"
              className="flex min-w-0 snap-x snap-mandatory gap-1 overflow-x-auto rounded-full bg-surface p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={filter === tab.id}
                  onClick={() => selectFilter(tab.id)}
                  className={`shrink-0 snap-start rounded-full px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4 sm:text-sm ${
                    filter === tab.id
                      ? "bg-surface-elevated text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="library-secondary-filters"
                onClick={() => setFiltersOpen((open) => !open)}
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4 sm:text-sm ${
                  filtersOpen || selectedTopics.length || dateFilter !== "any-time"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 bg-surface-elevated text-text hover:bg-surface"
                }`}
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Filters</span>
                {(selectedTopics.length > 0 || dateFilter !== "any-time") && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {selectedTopics.length + (dateFilter !== "any-time" ? 1 : 0)}
                  </span>
                )}
              </button>

              {filtersOpen && (
                <div
                  id="library-secondary-filters"
                  className="absolute right-0 top-12 z-30 w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-surface-elevated p-4 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text">Filters</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopics([]);
                        setDateFilter("any-time");
                      }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Clear
                    </button>
                  </div>

                  <fieldset className="mt-4">
                    <legend className="text-xs font-semibold text-text">
                      Topics
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {topics.map((topic) => {
                        const checked = selectedTopics.includes(topic);
                        return (
                          <label
                            key={topic}
                            className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs transition-colors ${
                              checked
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border bg-background text-text-muted"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setSelectedTopics((current) =>
                                  checked
                                    ? current.filter((item) => item !== topic)
                                    : [...current, topic],
                                )
                              }
                              className="sr-only"
                            />
                            {topic}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="mt-4 border-t border-border/60 pt-4">
                    <legend className="text-xs font-semibold text-text">
                      Date saved
                    </legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {dateOptions.map(([value, label]) => (
                        <label
                          key={value}
                          className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl px-2.5 text-xs ${
                            dateFilter === value
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-text-muted hover:bg-background"
                          }`}
                        >
                          <input
                            type="radio"
                            name="date-filter"
                            value={value}
                            checked={dateFilter === value}
                            onChange={() => setDateFilter(value)}
                            className="accent-primary"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-text-muted" role="status" aria-live="polite">
              {filteredBookmarks.length}{" "}
              {filteredBookmarks.length === 1 ? "item" : "items"}
            </p>
            <div
              role="group"
              aria-label="Bookmark view"
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface-elevated p-1"
            >
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
                className={`inline-flex h-[32px] items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  view === "grid"
                    ? "bg-background text-text shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <LayoutGrid aria-hidden="true" className="size-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                className={`inline-flex h-[32px] items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  view === "list"
                    ? "bg-background text-text shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <List aria-hidden="true" className="size-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        <h2 id="library-results-heading" className="sr-only">
          Library results
        </h2>
        {filteredBookmarks.length > 0 ? (
          <div className="mt-5">
            {view === "grid" ? (
              <BookmarkGrid
                labelledBy="library-results-heading"
                bookmarks={filteredBookmarks}
                onFavoriteChange={(id, favorite) =>
                  setFavoriteOverrides((current) => ({
                    ...current,
                    [id]: favorite,
                  }))
                }
                onUnreadChange={(id, unread) =>
                  setUnreadOverrides((current) => ({
                    ...current,
                    [id]: unread,
                  }))
                }
              />
            ) : (
              <BookmarkList
                labelledBy="library-results-heading"
                bookmarks={filteredBookmarks}
                onFavoriteChange={(id, favorite) =>
                  setFavoriteOverrides((current) => ({
                    ...current,
                    [id]: favorite,
                  }))
                }
                onUnreadChange={(id, unread) =>
                  setUnreadOverrides((current) => ({
                    ...current,
                    [id]: unread,
                  }))
                }
              />
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-dashed border-border bg-surface-elevated px-5 py-14 text-center">
            <h2
              className="text-base font-semibold text-text"
            >
              No saved items match those filters.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
              Try a different search, topic, or content type.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
