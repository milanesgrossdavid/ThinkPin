"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  Check,
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
import { requestSmartSave } from "../../lib/save-dialog";
import { ErrorState } from "../feedback/ErrorState";
import {
  getBookmarksSnapshot,
  getBookmarkDetailsSnapshot,
  getServerBookmarkDetailsSnapshot,
  getServerBookmarksSnapshot,
  loadSavedBookmarks,
  subscribeToBookmarkDetails,
  subscribeToBookmarks,
  readBookmarkDetailState,
  type BookmarkDetailState,
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
type LibrarySort = "recent" | "oldest" | "updated" | "alphabetical";

const topics = ["Development", "AI", "Design", "Research", "Inspiration"];
const dateOptions = [
  ["any-time", "Any time"],
  ["today", "Today"],
  ["this-week", "This week"],
  ["this-month", "This month"],
] as const;
const sortOptions: Array<{ value: LibrarySort; label: string }> = [
  { value: "recent", label: "Recently saved" },
  { value: "oldest", label: "Oldest saved" },
  { value: "updated", label: "Recently updated" },
  { value: "alphabetical", label: "Alphabetical" },
];
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

function isBookmarkDetailEntry(value: unknown): value is [string, string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "string"
  );
}

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

function savedTimestamp(bookmark: LibraryBookmark) {
  const date = bookmark.savedDate ?? bookmark.savedAt;
  const timestamp = Date.parse(date.length === 10 ? `${date}T12:00:00` : date);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function updatedTimestamp(
  detail: BookmarkDetailState | Record<string, unknown> | undefined,
  fallback: number,
) {
  const activity = detail?.activity;
  if (!Array.isArray(activity)) {
    return fallback;
  }
  const latest = activity[0];
  if (
    typeof latest !== "object" ||
    latest === null ||
    !("at" in latest) ||
    typeof latest.at !== "string"
  ) {
    return fallback;
  }
  const timestamp = Date.parse(latest.at);
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

export function LibraryBrowser({
  initialFilter,
  initialTag,
  initialCollection,
}: {
  initialFilter: LibraryFilter;
  initialTag: string;
  initialCollection: string;
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
  const [filter, setFilter] = useState<LibraryFilter>(initialFilter);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("any-time");
  const [contentTypeFilter, setContentTypeFilter] = useState<LibraryFilter>(
    initialFilter === "videos" ||
      initialFilter === "articles" ||
      initialFilter === "repositories" ||
      initialFilter === "products"
      ? initialFilter
      : "all",
  );
  const [draftContentType, setDraftContentType] =
    useState<LibraryFilter>("all");
  const [draftCollections, setDraftCollections] = useState<string[]>([]);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftDateFilter, setDraftDateFilter] =
    useState<DateFilter>("any-time");
  const [view, setView] = useState<BookmarkView>("grid");
  const [sort, setSort] = useState<LibrarySort>("recent");

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
            favorite: bookmark.favorite ?? false,
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
  const { detailStates, detailStorageMessage } = useMemo(() => {
    if (detailsSnapshot === null) {
      return {
        detailStates: new Map<string, Record<string, unknown>>(),
        detailStorageMessage:
          "We couldn't read bookmark details from this browser.",
      };
    }

    try {
      const parsed: unknown = JSON.parse(detailsSnapshot);
      if (!Array.isArray(parsed) || !parsed.every(isBookmarkDetailEntry)) {
        throw new Error("Saved bookmark details are invalid.");
      }
      return {
        detailStates: new Map<string, BookmarkDetailState>(
          parsed.map(([id, value]) => [
            id,
            readBookmarkDetailState(value),
          ]),
        ),
        detailStorageMessage: "",
      };
    } catch {
      return {
        detailStates: new Map<string, Record<string, unknown>>(),
        detailStorageMessage:
          "Some saved bookmark details are invalid. They may not appear correctly.",
      };
    }
  }, [detailsSnapshot]);
  const availableCollections = useMemo(
    () =>
      [
        ...new Set(
          [...savedBookmarks, ...mockBookmarks]
            .map((bookmark) => {
              const collection = detailStates.get(bookmark.id)?.collection;
              return typeof collection === "string"
                ? collection
                : bookmark.topic;
            })
            .filter(Boolean),
        ),
      ].sort((first, second) => first.localeCompare(second)),
    [detailStates, savedBookmarks],
  );
  const availableTags = useMemo(
    () =>
      [
        ...new Set(
          [...savedBookmarks, ...mockBookmarks].flatMap((bookmark) => {
            const tags = detailStates.get(bookmark.id)?.tags;
            return Array.isArray(tags)
              ? tags.filter((tag): tag is string => typeof tag === "string")
              : (bookmark.tags ?? []);
          }),
        ),
      ].sort((first, second) => first.localeCompare(second)),
    [detailStates, savedBookmarks],
  );

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
      setContentTypeFilter(
        currentFilter === "videos" ||
          currentFilter === "articles" ||
          currentFilter === "repositories" ||
          currentFilter === "products"
          ? currentFilter
          : "all",
      );
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function selectFilter(nextFilter: LibraryFilter) {
    setFilter(nextFilter);
    if (
      nextFilter === "all" ||
      nextFilter === "videos" ||
      nextFilter === "articles" ||
      nextFilter === "repositories" ||
      nextFilter === "products"
    ) {
      setContentTypeFilter(nextFilter);
    } else {
      setContentTypeFilter("all");
    }
    const url = new URL(window.location.href);
    if (nextFilter === "all") {
      url.searchParams.delete("filter");
    } else {
      url.searchParams.set("filter", nextFilter);
    }

    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function openFilters() {
    setDraftContentType(contentTypeFilter);
    setDraftCollections(selectedCollections);
    setDraftTags(selectedTags);
    setDraftDateFilter(dateFilter);
    setFiltersOpen(true);
  }

  function applyMobileFilters() {
    setContentTypeFilter(draftContentType);
    if (filter !== "favorites" && filter !== "unread") {
      setFilter(draftContentType);
      const url = new URL(window.location.href);
      if (draftContentType === "all") {
        url.searchParams.delete("filter");
      } else {
        url.searchParams.set("filter", draftContentType);
      }
      window.history.pushState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
    setSelectedCollections(draftCollections);
    setSelectedTags(draftTags);
    setDateFilter(draftDateFilter);
    setFiltersOpen(false);
  }

  function resetMobileFilters() {
    setDraftContentType("all");
    setDraftCollections([]);
    setDraftTags([]);
    setDraftDateFilter("any-time");
  }

  const filteredBookmarks = useMemo(() => {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 1 && !ignoredSearchTerms.has(term))
      .map((term) => (term.endsWith("s") ? term.slice(0, -1) : term));

    const filtered = [...savedBookmarks, ...mockBookmarks]
      .map((bookmark) => {
        const detailState = detailStates.get(bookmark.id);
        return {
          ...bookmark,
          ...(typeof detailState?.title === "string"
            ? { title: detailState.title }
            : {}),
          ...(typeof detailState?.description === "string"
            ? { description: detailState.description }
            : {}),
          ...(typeof detailState?.intent === "string"
            ? { intent: detailState.intent }
            : {}),
          ...(typeof detailState?.favorite === "boolean"
            ? { favorite: detailState.favorite }
            : {}),
          ...(typeof detailState?.archived === "boolean"
            ? { archived: detailState.archived }
            : {}),
          ...(typeof detailState?.unread === "boolean"
            ? { unread: detailState.unread }
            : {}),
          ...(typeof detailState?.deleted === "boolean"
            ? { deleted: detailState.deleted }
            : {}),
          ...(typeof detailState?.collection === "string"
            ? { topic: detailState.collection }
            : {}),
          ...(Array.isArray(detailState?.tags)
            ? {
                tags: detailState.tags.filter(
                  (tag): tag is string => typeof tag === "string",
                ),
              }
            : {}),
        };
      })
      .filter((bookmark) => {
        if (bookmark.archived || bookmark.deleted) {
          return false;
        }

        const matchesTab =
          (filter !== "favorites" || bookmark.favorite) &&
          (filter !== "unread" || bookmark.unread);
        const matchesContentType =
          contentTypeFilter === "all" ||
          bookmark.contentType ===
            (contentTypeFilter === "videos"
              ? "video"
              : contentTypeFilter === "articles"
                ? "article"
                : contentTypeFilter === "repositories"
                  ? "repository"
                  : contentTypeFilter === "products"
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
          selectedTopics.length === 0 ||
          selectedTopics.includes(bookmark.topic);
        const matchesSelectedCollections =
          selectedCollections.length === 0 ||
          selectedCollections.some(
            (collection) =>
              collection.toLowerCase() === bookmark.topic.toLowerCase(),
          );
        const matchesSelectedTags =
          selectedTags.length === 0 ||
          selectedTags.some((tag) =>
            (bookmark.tags ?? []).some(
              (bookmarkTag) =>
                bookmarkTag.toLowerCase() === tag.toLowerCase(),
            ),
          );
        const matchesTag =
          !initialTag ||
          (bookmark.tags ?? []).some(
            (tag) => tag.toLowerCase() === initialTag.toLowerCase(),
          );
        const matchesCollection =
          !initialCollection ||
          bookmark.topic.toLowerCase() === initialCollection.toLowerCase();
        return (
          matchesTab &&
          matchesContentType &&
          matchesQuery &&
          matchesTopics &&
          matchesSelectedCollections &&
          matchesSelectedTags &&
          matchesTag &&
          matchesCollection &&
          matchesDate(bookmark.savedDate, dateFilter)
        );
      });
    return filtered.sort((first, second) => {
      if (sort === "alphabetical") {
        return first.title.localeCompare(second.title);
      }

      const firstSaved = savedTimestamp(first);
      const secondSaved = savedTimestamp(second);
      if (sort === "oldest") {
        return firstSaved - secondSaved;
      }
      if (sort === "updated") {
        const firstUpdated = updatedTimestamp(
          detailStates.get(first.id),
          firstSaved,
        );
        const secondUpdated = updatedTimestamp(
          detailStates.get(second.id),
          secondSaved,
        );
        return secondUpdated - firstUpdated;
      }
      return secondSaved - firstSaved;
    });
  }, [
    dateFilter,
    contentTypeFilter,
    detailStates,
    filter,
    initialCollection,
    initialTag,
    query,
    sort,
    savedBookmarks,
    selectedCollections,
    selectedTags,
    selectedTopics,
  ]);
  const hasNoLibraryItems =
    savedBookmarks.length + mockBookmarks.length === 0 &&
    !query.trim() &&
    filter === "all" &&
    selectedTopics.length === 0 &&
    dateFilter === "any-time" &&
    !initialTag &&
    !initialCollection;
  const hasNoFavorites =
    filter === "favorites" &&
    !query.trim() &&
    selectedTopics.length === 0 &&
    dateFilter === "any-time" &&
    !initialTag &&
    !initialCollection &&
    filteredBookmarks.length === 0;

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
        {(initialTag || initialCollection) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {initialTag && (
              <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                Tag: #{initialTag}
              </span>
            )}
            {initialCollection && (
              <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                Collection: {initialCollection}
              </span>
            )}
            <Link
              href="/library"
              className="text-xs font-medium text-text-muted hover:text-primary"
            >
              Clear filters
            </Link>
          </div>
        )}
        {(storageMessage || detailStorageMessage) && (
          <div className="mt-5">
            <ErrorState
              description={`We couldn't load your bookmarks. ${storageMessage || detailStorageMessage}`}
              onRetry={() => window.location.reload()}
            />
          </div>
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
                onClick={() => {
                  if (filtersOpen) {
                    setFiltersOpen(false);
                  } else {
                    openFilters();
                  }
                }}
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4 sm:text-sm ${
                  filtersOpen ||
                  selectedTopics.length ||
                  selectedCollections.length ||
                  selectedTags.length ||
                  dateFilter !== "any-time" ||
                  contentTypeFilter !== "all"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 bg-surface-elevated text-text hover:bg-surface"
                }`}
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Filters</span>
                {(selectedTopics.length > 0 ||
                  selectedCollections.length > 0 ||
                  selectedTags.length > 0 ||
                  contentTypeFilter !== "all" ||
                  dateFilter !== "any-time") && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {selectedTopics.length +
                      selectedCollections.length +
                      selectedTags.length +
                      (contentTypeFilter !== "all" ? 1 : 0) +
                      (dateFilter !== "any-time" ? 1 : 0)}
                  </span>
                )}
              </button>

              {filtersOpen && (
                <div
                  id="library-secondary-filters"
                  className="absolute right-0 top-12 z-30 hidden w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-surface-elevated p-4 shadow-xl sm:block"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text">Filters</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopics([]);
                        setSelectedCollections([]);
                        setSelectedTags([]);
                        if (filter === "favorites" || filter === "unread") {
                          setContentTypeFilter("all");
                        } else {
                          selectFilter("all");
                        }
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

          {filtersOpen && (
            <div
              className="fixed inset-0 z-[90] flex items-end bg-black/40 sm:hidden"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setFiltersOpen(false);
                }
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="library-mobile-filters-title"
                className="flex max-h-[90dvh] w-full flex-col rounded-t-3xl border border-border/70 bg-surface-elevated shadow-xl"
              >
                <header className="shrink-0 border-b border-border/60 px-5 pb-4 pt-3">
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
                  <h2 id="library-mobile-filters-title" className="text-base font-semibold text-text">
                    Filters
                  </h2>
                </header>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                  <fieldset>
                    <legend className="text-xs font-semibold text-text">Content type</legend>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {[
                        ["all", "All"],
                        ["articles", "Articles"],
                        ["videos", "Videos"],
                        ["repositories", "Repositories"],
                        ["products", "Products"],
                      ].map(([value, label]) => (
                        <label
                          key={value}
                          className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm ${
                            draftContentType === value
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-text hover:bg-background"
                          }`}
                        >
                          <input
                            type="radio"
                            name="mobile-content-type"
                            value={value}
                            checked={draftContentType === value}
                            onChange={() =>
                              setDraftContentType(value as LibraryFilter)
                            }
                            className="size-4 accent-primary"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="border-t border-border/60 pt-4">
                    <legend className="text-xs font-semibold text-text">Collections</legend>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {availableCollections.map((collection) => (
                        <label
                          key={collection}
                          className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm text-text hover:bg-background"
                        >
                          <input
                            type="checkbox"
                            checked={draftCollections.includes(collection)}
                            onChange={() =>
                              setDraftCollections((current) =>
                                current.includes(collection)
                                  ? current.filter((item) => item !== collection)
                                  : [...current, collection],
                              )
                            }
                            className="size-4 accent-primary"
                          />
                          <span className="truncate">{collection}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="border-t border-border/60 pt-4">
                    <legend className="text-xs font-semibold text-text">Tags</legend>
                    {availableTags.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <label
                            key={tag}
                            className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs ${
                              draftTags.includes(tag)
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border bg-background text-text-muted"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={draftTags.includes(tag)}
                              onChange={() =>
                                setDraftTags((current) =>
                                  current.includes(tag)
                                    ? current.filter((item) => item !== tag)
                                    : [...current, tag],
                                )
                              }
                              className="sr-only"
                            />
                            #{tag.replace(/^#/, "")}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-text-muted">No tags available.</p>
                    )}
                  </fieldset>

                  <fieldset className="border-t border-border/60 pt-4">
                    <legend className="text-xs font-semibold text-text">Date</legend>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {dateOptions.map(([value, label]) => (
                        <label
                          key={value}
                          className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm ${
                            draftDateFilter === value
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-text hover:bg-background"
                          }`}
                        >
                          <input
                            type="radio"
                            name="mobile-date-filter"
                            value={value}
                            checked={draftDateFilter === value}
                            onChange={() => setDraftDateFilter(value)}
                            className="size-4 accent-primary"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <footer className="flex shrink-0 gap-3 border-t border-border/60 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                  <button
                    type="button"
                    onClick={resetMobileFilters}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-text"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={applyMobileFilters}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Apply filters
                  </button>
                </footer>
              </section>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <p className="shrink-0 text-xs text-text-muted" role="status" aria-live="polite">
                {filteredBookmarks.length}{" "}
                {filteredBookmarks.length === 1 ? "item" : "items"}
              </p>
              <label className="hidden min-w-0 items-center gap-2 text-xs text-text-muted sm:flex">
                <span>Sort</span>
                <select
                  aria-label="Sort bookmarks"
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as LibrarySort)
                  }
                  className="h-9 min-w-0 rounded-full border border-border/70 bg-surface-elevated px-3 text-xs font-medium text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-label={`Sort bookmarks: ${sortOptions.find((option) => option.value === sort)?.label}`}
                aria-expanded={sortOpen}
                onClick={() => setSortOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border/70 bg-surface-elevated px-3 text-xs font-medium text-text sm:hidden"
              >
                Sort
                <span className="max-w-24 truncate text-text-muted">
                  {sortOptions.find((option) => option.value === sort)?.label}
                </span>
              </button>
            </div>
            <div
              role="group"
              aria-label="Bookmark view"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-surface-elevated p-1"
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

            {sortOpen && (
              <div
                className="fixed inset-0 z-[90] flex items-end bg-black/40 sm:hidden"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setSortOpen(false);
                  }
                }}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="library-mobile-sort-title"
                  className="w-full rounded-t-3xl border border-border/70 bg-surface-elevated p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-xl"
                >
                  <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
                  <h2 id="library-mobile-sort-title" className="mb-3 text-base font-semibold text-text">Sort by</h2>
                  <div role="radiogroup" aria-labelledby="library-mobile-sort-title" className="space-y-1">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={sort === option.value}
                        onClick={() => {
                          setSort(option.value);
                          setSortOpen(false);
                        }}
                        className={`flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-sm ${
                          sort === option.value
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-text hover:bg-background"
                        }`}
                      >
                        {option.label}
                        {sort === option.value && <Check aria-hidden="true" className="size-4" />}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
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
              />
            ) : (
              <BookmarkList
                labelledBy="library-results-heading"
                bookmarks={filteredBookmarks}
              />
            )}
          </div>
        ) : hasNoLibraryItems ? (
          <div className="mt-5 rounded-3xl border border-dashed border-border bg-surface-elevated px-5 py-14 text-center sm:py-16">
            <h2 className="text-base font-semibold text-text">
              Your library is empty
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
              Save your first link and start building your Internet Memory.
            </p>
            <button
              type="button"
              onClick={() => requestSmartSave()}
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span aria-hidden="true">+</span>
              Save bookmark
            </button>
          </div>
        ) : hasNoFavorites ? (
          <div className="mt-5 rounded-3xl border border-dashed border-border bg-surface-elevated px-5 py-14 text-center sm:py-16">
            <h2 className="text-base font-semibold text-text">
              No favorites yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
              Save the things you want to find quickly.
            </p>
            <button
              type="button"
              onClick={() => selectFilter("all")}
              className="mt-5 inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Explore your library
            </button>
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
