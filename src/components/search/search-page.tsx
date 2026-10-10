"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  Command,
  LayoutGrid,
  List,
  LoaderCircle,
  Search,
  Send,
  Sparkles,
  Globe2,
} from "lucide-react";
import { BookmarkGrid } from "../bookmarks/BookmarkGrid";
import { BookmarkList } from "../bookmarks/BookmarkList";
import type { BookmarkView, LibraryBookmark } from "../bookmarks/types";
import {
  type SearchMode,
  type SearchState,
} from "../../lib/search";
import type { SearchBookmark } from "../../lib/search/types";
import { useAppToast } from "../feedback/AppToaster";
import { ErrorState } from "../feedback/ErrorState";
import { BookmarkGridSkeleton, BookmarkSkeleton } from "../skeletons/app-skeletons";
import { reindexMissingBookmarksAction } from "../../app/actions/search";
import type { AskResponse } from "../../lib/ask/types";
import { AskSourcesList } from "../ask/ask-sources-list";
import {
  trackProductEvent,
  trackProductEventOnce,
} from "../../lib/analytics";

function isAskResponse(value: unknown): value is AskResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "answer" in value &&
    typeof value.answer === "string" &&
    "query" in value &&
    typeof value.query === "string" &&
    "sources" in value &&
    Array.isArray(value.sources) &&
    value.sources.every(
      (source) =>
        typeof source === "object" &&
        source !== null &&
        "bookmarkId" in source &&
        typeof source.bookmarkId === "string" &&
        "title" in source &&
        typeof source.title === "string" &&
        "url" in source &&
        typeof source.url === "string" &&
        "domain" in source &&
        typeof source.domain === "string" &&
        "relevanceScore" in source &&
        typeof source.relevanceScore === "number",
    )
  );
}

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

function toLibraryBookmark(bookmark: SearchBookmark): LibraryBookmark {
  let contentType: LibraryBookmark["contentType"] = "other";
  switch (bookmark.contentType) {
    case "article":
    case "video":
    case "repository":
    case "product":
    case "tool":
    case "social":
    case "document":
    case "other":
      contentType = bookmark.contentType;
      break;
  }

  return {
    id: bookmark.id,
    title: bookmark.title,
    description: bookmark.description ?? undefined,
    topic: bookmark.collection ?? "Saved links",
    subtopic: bookmark.intent ?? "Saved",
    tags: bookmark.tags,
    domain: bookmark.domain,
    url: bookmark.url,
    savedAt: bookmark.createdAt,
    icon: Globe2,
    artwork: "from-primary/15 via-sky-500/10 to-transparent",
    thumbnailUrl: bookmark.imageUrl ?? undefined,
    contentType,
    favorite: bookmark.isFavorite,
    unread: !bookmark.isRead,
    archived: bookmark.isArchived,
    notes: bookmark.notes ?? undefined,
    intent: bookmark.intent ?? undefined,
    savedDate: bookmark.createdAt.slice(0, 10),
    searchTerms: bookmark.matchedFields,
  };
}

export function SearchPage({
  initialQuery = "",
  initialMode = "keyword",
}: {
  initialQuery?: string;
  initialMode?: SearchMode;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [view, setView] = useState<BookmarkView>("list");
  const [focused, setFocused] = useState(false);
  const [searchState, setSearchState] = useState<SearchState<LibraryBookmark>>({
    query: initialQuery.trim() && initialMode !== "ai" ? "" : initialQuery,
    results: [],
    topics: [],
    mode: initialMode,
  });
  const [searchError, setSearchError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [reindexPending, startReindex] = useTransition();
  const [aiResponse, setAiResponse] = useState<AskResponse | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const aiRequestId = useRef(0);
  const toast = useAppToast();

  async function askWithAI() {
    const question = query.trim();
    if (!question || aiPending) return;

    const requestId = ++aiRequestId.current;
    setAiResponse(null);
    setSearchError("");
    setAiPending(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ question }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        if (
          typeof payload === "object" &&
          payload !== null &&
          "code" in payload &&
          payload.code === "CREDITS_EXHAUSTED"
        ) {
          trackProductEvent("ai_limit_reached");
        }
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Your library could not be queried right now.";
        throw new Error(message);
      }
      if (!isAskResponse(payload)) {
        throw new Error("The answer response was invalid.");
      }
      if (requestId === aiRequestId.current) {
        setAiResponse(payload);
        trackProductEvent("ai_used");
      }
    } catch (error) {
      if (requestId === aiRequestId.current) {
        setSearchError(
          error instanceof Error
            ? error.message
            : "Your library could not be queried right now.",
        );
      }
    } finally {
      if (requestId === aiRequestId.current) {
        setAiPending(false);
      }
    }
  }

  function queueMissingEmbeddings() {
    startReindex(async () => {
      const result = await reindexMissingBookmarksAction();
      if (!result.ok) {
        toast.error("Semantic indexing unavailable", result.error);
        return;
      }
      toast.success(
        result.queued > 0
          ? `Queued ${result.queued} bookmarks for local indexing`
          : "All bookmarks are already indexed",
      );
      if (result.queued > 0) {
        setRetryCount((count) => count + 1);
      }
    });
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    let active = true;
    if (!debouncedQuery.trim() || mode === "ai") {
      return () => {
        active = false;
      };
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      q: debouncedQuery,
      mode,
    });
    fetch(`/api/search?${params}`, {
      signal: controller.signal,
      headers:
        mode === "semantic"
          ? { "idempotency-key": crypto.randomUUID() }
          : undefined,
    })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          if (
            mode === "semantic" &&
            typeof payload === "object" &&
            payload !== null &&
            "code" in payload &&
            payload.code === "CREDITS_EXHAUSTED"
          ) {
            trackProductEvent("ai_limit_reached");
          }
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Search could not be completed.";
          throw new Error(message);
        }
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("results" in payload) ||
          !Array.isArray(payload.results) ||
          !("relatedTopics" in payload) ||
          !Array.isArray(payload.relatedTopics)
        ) {
          throw new Error("Search returned an invalid response.");
        }
        return payload as {
          results: SearchBookmark[];
          relatedTopics: string[];
        };
      })
      .then((result) => {
        if (active) {
          setSearchError("");
          setSearchState({
            query: debouncedQuery,
            results: result.results.map(toLibraryBookmark),
            topics: result.relatedTopics,
            mode,
          });
          trackProductEvent("search_used", {
            mode,
            result_count: result.results.length,
            has_results: result.results.length > 0,
          });
          trackProductEventOnce("first_search", "first-search");
        }
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setSearchState({
            query: debouncedQuery,
            results: [],
            topics: [],
            mode,
          });
          setSearchError(
            error instanceof Error ? error.message : "Try again in a moment.",
          );
          toast.error(
            "Something went wrong",
            "We couldn't search your library.",
          );
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedQuery, mode, retryCount, toast]);

  const hasQuery = Boolean(query.trim());
  const isSearching =
    hasQuery &&
    mode !== "ai" &&
    query === debouncedQuery &&
    (searchState.query !== debouncedQuery ||
      searchState.mode !== mode);
  const isDebouncing = hasQuery && query !== debouncedQuery;

  return (
    <main className="min-h-svh bg-background px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:px-12">
      <div className="mx-auto max-w-container-xl">
        <header>
          <p data-page-eyebrow className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Your Internet Memory
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 data-page-title className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-4xl">
                Search
              </h1>
              <p data-page-summary className="mt-2 text-sm text-text-muted sm:text-base">
                For your saved links: search titles, domains, and notes to find the right source again.
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
              maxLength={1_000}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (mode === "ai") {
                  aiRequestId.current += 1;
                  setAiPending(false);
                  setAiResponse(null);
                  setSearchError("");
                }
              }}
              onKeyDown={(event) => {
                if (mode === "ai" && event.key === "Enter") {
                  event.preventDefault();
                  void askWithAI();
                }
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 150)}
              placeholder="Search your memory..."
              className="h-14 w-full rounded-2xl border border-border/70 bg-surface-elevated pl-12 pr-4 text-sm text-text shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10 sm:h-16 sm:rounded-3xl sm:pl-14 sm:pr-24 sm:text-base"
            />
            <kbd className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-text-muted sm:inline-flex">
              ⌘ K
            </kbd>
          </label>

          {mode === "ai" && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={!query.trim() || aiPending}
                onClick={() => void askWithAI()}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiPending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : (
                  <Send aria-hidden="true" className="size-4" />
                )}
                Ask AI
              </button>
            </div>
          )}

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
                onClick={() => {
                  setSearchState((current) => ({ ...current, query: "" }));
                  aiRequestId.current += 1;
                  setAiPending(false);
                  setAiResponse(null);
                  setSearchError("");
                  setMode(searchMode.id);
                }}
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

        {mode === "semantic" && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={reindexPending}
              onClick={queueMissingEmbeddings}
              className="min-h-9 rounded-full border border-border bg-surface-elevated px-4 text-xs font-medium text-text-muted transition-colors hover:text-primary disabled:cursor-wait disabled:opacity-60"
            >
              {reindexPending ? "Queueing local indexing…" : "Index saved bookmarks"}
            </button>
            <p className="text-xs text-text-muted">
              Queues bookmarks without embeddings for processing by your configured provider.
            </p>
          </div>
        )}

        {!hasQuery ? (
          <section className="mx-auto mt-8 w-full max-w-3xl sm:mt-10">
            <h2 className="text-center text-xl font-semibold tracking-[-0.03em] text-text">
              Search your memory
            </h2>
            <p className="mt-1 text-center text-sm text-text-muted">
              Find anything you&apos;ve saved.
            </p>
            <h3 className="mt-6 text-center text-sm font-semibold text-text">
              Try searching for
            </h3>
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
          <section className="mt-8" aria-labelledby="ai-search-title">
            {searchError ? (
              <p
                role="alert"
                className="mt-5 rounded-2xl border border-error/30 bg-error/5 p-4 text-sm leading-6 text-text"
              >
                {searchError}
              </p>
            ) : aiPending ? (
              <div
                role="status"
                aria-busy="true"
                className="mt-8 flex items-center justify-center gap-3 text-sm text-text-muted"
              >
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin text-primary"
                />
                Searching your saved library…
              </div>
            ) : aiResponse ? (
              <AskSourcesList sources={aiResponse.sources} />
            ) : (
              <p className="mt-6 text-center text-sm text-text-muted">
                Enter a question above and choose “Ask AI” to find matching
                bookmarks.
              </p>
            )}
          </section>
        ) : searchError && !isSearching ? (
          <div className="mt-8">
            <ErrorState
              title="Something went wrong"
              description={searchError || "We couldn't search your library."}
              onRetry={() => {
                setSearchError("");
                setSearchState((current) => ({ ...current, query: "" }));
                setRetryCount((count) => count + 1);
              }}
            />
          </div>
        ) : isDebouncing ? (
          <section className="mt-10 max-w-3xl sm:mt-14">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-text">
              Search your memory
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Find anything you&apos;ve saved.
            </p>
          </section>
        ) : isSearching ? (
          <section
            className="mt-8"
            aria-label="Searching your memory"
            aria-busy="true"
            role="status"
          >
            <p className="mb-4 text-sm font-medium text-text-muted">
              Searching your memory...
            </p>
            {view === "grid" ? (
              <BookmarkGridSkeleton count={3} />
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <BookmarkSkeleton key={index} variant="list" />
                ))}
              </div>
            )}
          </section>
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
                    No results found
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-text-muted">
                    We couldn&apos;t find anything matching:
                  </p>
                  <p className="mt-2 wrap-break-word text-sm font-medium text-text">
                    &quot;{searchState.query}&quot;
                  </p>
                  <p className="mt-2 text-sm text-text-muted">
                    {mode === "semantic"
                      ? "Semantic search only finds bookmarks with embeddings. Use “Index saved bookmarks” above if this is your first search, or try different terms."
                      : "Try another search."}
                  </p>
                  {mode !== "semantic" && (
                    <button
                      type="button"
                      onClick={() => setMode("semantic")}
                      className="mt-4 text-sm font-medium text-primary hover:underline"
                    >
                      Search semantically
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
