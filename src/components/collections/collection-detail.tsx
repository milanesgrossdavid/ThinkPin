"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Folder,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
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
  bookmarkIdsForCollection,
  defaultCollectionId,
  getCollectionsSnapshot,
  getMembershipsSnapshot,
  getServerCollectionsSnapshot,
  getServerMembershipsSnapshot,
  loadCollections,
  loadMemberships,
  setCollectionBookmarkIds,
  subscribeToCollections,
  subscribeToMemberships,
} from "../../lib/collections";
import { mockCollections } from "../../lib/mock/collections";

type CollectionModel = {
  id: string;
  name: string;
  description: string;
  bookmarks: LibraryBookmark[];
  allBookmarks: LibraryBookmark[];
  memberIds: Set<string>;
};

const typeLabels: Record<string, string> = {
  video: "Videos",
  article: "Articles",
  repository: "Repositories",
  product: "Products",
  tool: "Tools",
};

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
    topic: bookmark.collection,
    subtopic: bookmark.intent ?? "Saved",
    icon: Folder,
    artwork: "from-primary/15 via-sky-500/10 to-transparent",
    contentType,
    favorite: bookmark.favorite ?? false,
    unread: true,
    savedDate: bookmark.savedAt.slice(0, 10),
    searchTerms: [bookmark.collection, bookmark.intent ?? "", bookmark.url],
  };
}

function isDetailEntry(value: unknown): value is [string, string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "string"
  );
}

function createCollectionModel(
  collectionId: string,
  bookmarksSnapshot: string | null,
  detailsSnapshot: string | null,
  collectionsSnapshot: string | null,
  membershipsSnapshot: string | null,
): CollectionModel | null {
  if (
    bookmarksSnapshot === null ||
    detailsSnapshot === null ||
    collectionsSnapshot === null ||
    membershipsSnapshot === null
  ) {
    throw new Error("Browser storage is unavailable.");
  }

  const customCollections = loadCollections(collectionsSnapshot);
  const bookmarks = [
    ...loadSavedBookmarks(bookmarksSnapshot).map(toSavedLibraryBookmark),
    ...mockBookmarks,
  ];
  const rawDetails: unknown = JSON.parse(detailsSnapshot);
  if (!Array.isArray(rawDetails) || !rawDetails.every(isDetailEntry)) {
    throw new Error("Saved bookmark details are invalid.");
  }
  const detailStates = new Map(
    rawDetails.map(([id, value]) => [id, readBookmarkDetailState(value)]),
  );
  const allBookmarks = bookmarks
    .map((bookmark) => {
      const detail = detailStates.get(bookmark.id);
      return {
        ...bookmark,
        topic: detail?.collection ?? bookmark.topic,
        tags: detail?.tags ?? bookmark.tags,
        favorite: detail?.favorite ?? bookmark.favorite,
        archived: detail?.archived ?? bookmark.archived,
      };
    })
    .filter((bookmark) => !bookmark.archived);

  const customCollection = customCollections.find(
    (item) => item.id === collectionId,
  );
  const mockCollection = mockCollections.find(
    (item) => defaultCollectionId(item.name) === collectionId,
  );
  const collectionName =
    customCollection?.name ??
    mockCollection?.name ??
    allBookmarks.find((item) => defaultCollectionId(item.topic) === collectionId)
      ?.topic;
  if (!collectionName) {
    return null;
  }

  const memberships = loadMemberships(membershipsSnapshot);
  const memberIds = bookmarkIdsForCollection(
    collectionId,
    collectionName,
    allBookmarks,
    memberships,
  );

  return {
    id: collectionId,
    name: collectionName,
    description:
      mockCollection?.description ??
      "A thoughtful collection of things you want to remember.",
    allBookmarks,
    memberIds,
    bookmarks: allBookmarks.filter((bookmark) => memberIds.has(bookmark.id)),
  };
}

export function CollectionDetail({ collectionId }: { collectionId: string }) {
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
  const collectionsSnapshot = useSyncExternalStore(
    subscribeToCollections,
    getCollectionsSnapshot,
    getServerCollectionsSnapshot,
  );
  const membershipsSnapshot = useSyncExternalStore(
    subscribeToMemberships,
    getMembershipsSnapshot,
    getServerMembershipsSnapshot,
  );
  const { collection, storageError } = useMemo(() => {
    try {
      return {
        collection: createCollectionModel(
          collectionId,
          bookmarksSnapshot,
          detailsSnapshot,
          collectionsSnapshot,
          membershipsSnapshot,
        ),
        storageError: "",
      };
    } catch {
      return {
        collection: null,
        storageError:
          "We couldn't load this collection from your browser. Check storage permissions and refresh.",
      };
    }
  }, [
    bookmarksSnapshot,
    collectionId,
    collectionsSnapshot,
    detailsSnapshot,
    membershipsSnapshot,
  ]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<BookmarkView>("grid");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");

  const availableTypes = useMemo(() => {
    const types = new Set(
      (collection?.bookmarks ?? [])
        .filter((bookmark) => bookmark.contentType)
        .map((bookmark) => bookmark.contentType as string),
    );
    return [
      ["all", "All"],
      ...Object.entries(typeLabels).filter(([type]) => types.has(type)),
    ];
  }, [collection]);

  const filteredBookmarks = useMemo(() => {
    if (!collection) {
      return [];
    }
    const search = query.trim().toLowerCase();
    return collection.bookmarks.filter((bookmark) => {
      const matchesSearch = search
        ? [
            bookmark.title,
            bookmark.description,
            bookmark.domain,
            bookmark.topic,
            bookmark.subtopic,
            ...(bookmark.tags ?? []),
          ]
            .join(" ")
            .toLowerCase()
            .includes(search)
        : true;
      return (
        matchesSearch &&
        (filter === "all" || bookmark.contentType === filter)
      );
    });
  }, [collection, filter, query]);

  const addableBookmarks = useMemo(() => {
    if (!collection) {
      return [];
    }
    const search = addQuery.trim().toLowerCase();
    return collection.allBookmarks.filter((bookmark) =>
      search
        ? [bookmark.title, bookmark.domain, ...(bookmark.tags ?? [])]
            .join(" ")
            .toLowerCase()
            .includes(search)
        : true,
    );
  }, [addQuery, collection]);

  function openAddDialog() {
    setSelectedIds(new Set(collection?.memberIds ?? []));
    setAddQuery("");
    setFeedback("");
    setAddDialogOpen(true);
  }

  function toggleSelected(bookmarkId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(bookmarkId)) {
        next.delete(bookmarkId);
      } else {
        next.add(bookmarkId);
      }
      return next;
    });
  }

  function saveMemberships() {
    if (!collection) {
      return;
    }
    try {
      setCollectionBookmarkIds(collection.id, [...selectedIds]);
      setAddDialogOpen(false);
      setFeedback("Collection updated.");
    } catch {
      setFeedback(
        "We couldn't update this collection. Check browser storage permissions.",
      );
    }
  }

  function onSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  if (storageError) {
    return (
      <main className="min-h-svh bg-background px-5 py-8 sm:px-8">
        <p className="mx-auto max-w-3xl rounded-2xl border border-error/30 bg-error/5 p-5 text-sm text-error">
          {storageError}
        </p>
      </main>
    );
  }

  if (!collection) {
    return (
      <main className="min-h-svh bg-background px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/collections"
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-text-muted hover:bg-surface-elevated hover:text-text"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Collections
          </Link>
          <p className="mt-6 rounded-2xl border border-border/60 bg-surface-elevated p-5 text-sm text-text-muted">
            This collection doesn&apos;t exist or is no longer available.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-background">
      <header className="border-b border-border/60 bg-background px-5 py-6 sm:px-8 sm:py-9 lg:px-12">
        <div className="mx-auto max-w-container-xl">
          <Link
            href="/collections"
            className="inline-flex min-h-9 items-center gap-2 rounded-full px-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Collections
          </Link>
          <div className="mt-5 flex flex-col gap-5 sm:mt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Collection
              </p>
              <h1 className="mt-2 wrap-break-word text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-4xl">
                {collection.name}
              </h1>
              <p className="mt-2 text-sm font-medium text-text">
                {collection.bookmarks.length}{" "}
                {collection.bookmarks.length === 1 ? "bookmark" : "bookmarks"}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                {collection.description}
              </p>
            </div>
            <button
              type="button"
              onClick={openAddDialog}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-11 sm:px-5"
            >
              <Plus aria-hidden="true" className="size-4" />
              Add bookmarks
            </button>
          </div>
        </div>
      </header>

      <section
        aria-label={`Bookmarks in ${collection.name}`}
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
              onChange={onSearchChange}
              aria-label={`Search ${collection.name}`}
              placeholder={`Search ${collection.name}...`}
              className="h-12 w-full rounded-2xl border border-border/70 bg-surface-elevated pl-12 pr-4 text-sm text-text shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10 sm:h-14 sm:rounded-3xl sm:text-base"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label="Filter by content type"
              className="flex snap-x gap-1 overflow-x-auto rounded-full bg-surface p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {availableTypes.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={`shrink-0 snap-start rounded-full px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    filter === value
                      ? "bg-surface-elevated text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              role="group"
              aria-label="Bookmark view"
              className="flex items-center gap-1 self-end rounded-full bg-surface p-1 sm:self-auto"
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
          </div>

          <div className="mb-4 mt-5 flex items-center justify-between gap-3">
            <p className="text-xs text-text-muted">
              Showing {filteredBookmarks.length}{" "}
              {filteredBookmarks.length === 1 ? "bookmark" : "bookmarks"}
            </p>
            <p className="text-xs text-text-muted" role="status" aria-live="polite">
              {feedback}
            </p>
          </div>

          {filteredBookmarks.length > 0 ? (
            view === "grid" ? (
              <BookmarkGrid bookmarks={filteredBookmarks} />
            ) : (
              <BookmarkList bookmarks={filteredBookmarks} />
            )
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-surface-elevated px-5 py-12 text-center sm:py-16">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Folder aria-hidden="true" className="size-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-text">
                {query || filter !== "all"
                  ? "No bookmarks match"
                  : "No bookmarks here yet"}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-text-muted">
                {query || filter !== "all"
                  ? "Try a different search or content type."
                  : "Add things from your library to keep them together here."}
              </p>
              {query || filter !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                  className="mt-4 text-sm font-medium text-primary hover:underline"
                >
                  Clear search and filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openAddDialog}
                  className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Add from Library
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {addDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAddDialogOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-bookmarks-title"
            className="flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-border/70 bg-surface-elevated shadow-xl sm:max-w-xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/60 p-5 sm:p-6">
              <div>
                <h2
                  id="add-bookmarks-title"
                  className="text-lg font-semibold tracking-[-0.03em] text-text"
                >
                  Add to {collection.name}
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  Choose saved things to include in this collection.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setAddDialogOpen(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-background hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>

            <label className="relative mx-5 mt-4 block sm:mx-6">
              <span className="sr-only">Search your library</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
              />
              <input
                type="search"
                value={addQuery}
                onChange={(event) => setAddQuery(event.target.value)}
                placeholder="Search your library..."
                className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-text outline-none placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
              {addableBookmarks.length > 0 ? (
                <ul className="space-y-1">
                  {addableBookmarks.map((bookmark) => {
                    const checked = selectedIds.has(bookmark.id);
                    return (
                      <li key={bookmark.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-background">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelected(bookmark.id)}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-transparent"
                            }`}
                          >
                            <Check className="size-3.5" />
                          </span>
                          <span
                            className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${bookmark.artwork} text-text`}
                          >
                            {(() => {
                              const Icon = bookmark.icon;
                              return <Icon aria-hidden="true" className="size-4" />;
                            })()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-text">
                              {bookmark.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-text-muted">
                              {bookmark.domain}
                            </span>
                          </span>
                          {collection.memberIds.has(bookmark.id) && (
                            <span className="shrink-0 text-[10px] font-medium text-text-muted">
                              In collection
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-10 text-center text-sm text-text-muted">
                  No saved bookmarks match your search.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/60 p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:p-6">
              <p className="text-xs text-text-muted">
                {selectedIds.size} selected
              </p>
              <button
                type="button"
                onClick={saveMemberships}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Check aria-hidden="true" className="size-4" />
                Add selected
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
