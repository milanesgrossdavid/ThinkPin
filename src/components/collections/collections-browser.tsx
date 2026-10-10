"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  Folder,
  FolderPlus,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import type { LibraryBookmark } from "../bookmarks/types";
import {
  getBookmarkDetailsSnapshot,
  getBookmarksSnapshot,
  getServerBookmarksSnapshot,
  loadSavedBookmarks,
  readBookmarkDetailState,
  subscribeToBookmarkDetails,
  subscribeToBookmarks,
} from "../../lib/bookmarks";
import {
  bookmarkIdsForCollection,
  getCollectionsSnapshot,
  getMembershipsSnapshot,
  getServerCollectionsSnapshot,
  getServerMembershipsSnapshot,
  loadMemberships,
  loadCollections,
  subscribeToMemberships,
  subscribeToCollections,
} from "../../lib/collections";
import { mutatePrivateCollection, syncPrivateCollections } from "../../lib/collections/client";
import { ErrorState } from "../feedback/ErrorState";
import { useAppToast } from "../feedback/AppToaster";
import { ActionButton } from "../ui/ActionButton";
import { trackProductEvent } from "../../lib/analytics";

type CollectionCardModel = {
  id: string;
  name: string;
  description: string;
  bookmarks: LibraryBookmark[];
  tags: string[];
  isCustom: boolean;
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

function collectionTags(bookmarks: LibraryBookmark[]) {
  const counts = new Map<string, number>();
  bookmarks.forEach((bookmark) => {
    (bookmark.tags ?? []).forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });
  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 3)
    .map(([tag]) => tag);
}

function CollectionPreview({ bookmarks }: { bookmarks: LibraryBookmark[] }) {
  const previewItems = bookmarks.slice(0, 4);

  if (previewItems.length === 0) {
    return (
      <div className="flex aspect-[1.8/1] items-center justify-center bg-gradient-to-br from-primary/10 via-surface to-surface-elevated">
        <span className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-surface-elevated text-primary shadow-sm">
          <Folder aria-hidden="true" className="size-5" />
        </span>
      </div>
    );
  }

  return (
    <div
      aria-label={`${previewItems.length} bookmark previews`}
      className="grid aspect-[1.8/1] grid-cols-4 gap-2 overflow-hidden bg-gradient-to-br from-surface via-background to-surface p-4 sm:gap-3 sm:p-5"
    >
      {previewItems.map((bookmark) => {
        const Icon = bookmark.icon;
        return (
          <Link
            key={bookmark.id}
            href={`/app/bookmarks/${encodeURIComponent(bookmark.id)}`}
            aria-label={`Open ${bookmark.title}`}
            className={`relative flex min-w-0 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br ${bookmark.artwork} shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
          >
            {bookmark.thumbnailUrl && (
              // Open Graph previews may be hosted on any site.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bookmark.thumbnailUrl}
                alt=""
                loading="lazy"
                className="absolute inset-0 size-full object-cover"
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
              />
            )}
            <span className="relative flex size-8 items-center justify-center rounded-xl border border-white/60 bg-white/70 text-text shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
              <Icon aria-hidden="true" className="size-4" />
            </span>
          </Link>
        );
      })}
      {Array.from({ length: Math.max(0, 4 - previewItems.length) }).map(
        (_, index) => (
          <span
            key={`empty-preview-${index}`}
            aria-hidden="true"
            className="flex items-center justify-center rounded-xl border border-dashed border-border/50 bg-surface/70"
          >
            <Folder aria-hidden="true" className="size-4 text-text-muted/50" />
          </span>
        ),
      )}
    </div>
  );
}

function CollectionCard({
  collection,
  onRename,
}: {
  collection: CollectionCardModel;
  onRename: (collection: CollectionCardModel) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tags = collection.tags;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border/70 bg-surface-elevated shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <CollectionPreview bookmarks={collection.bookmarks} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-[-0.02em] text-text">
              <Link
                href={`/app/collections/${encodeURIComponent(collection.id)}`}
                className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {collection.name}
              </Link>
            </h2>
            <p className="mt-1.5 text-xs text-text-muted">
              <span className="font-medium tabular-nums text-text">
                {collection.bookmarks.length}
              </span>{" "}
              {collection.bookmarks.length === 1 ? "bookmark" : "bookmarks"}
            </p>
          </div>
          {collection.isCustom && (
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label={`More actions for ${collection.name}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="flex size-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-background hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <MoreHorizontal aria-hidden="true" className="size-[18px]" />
              </button>
              {menuOpen && (
                <div
                  className="fixed inset-0 z-[90] bg-black/40 sm:contents"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setMenuOpen(false);
                    }
                  }}
                >
                  <div
                    role="menu"
                    aria-label={`Actions for ${collection.name}`}
                    className="fixed inset-x-0 bottom-0 z-[91] rounded-t-3xl border border-border bg-surface-elevated p-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-xl sm:absolute sm:inset-auto sm:right-0 sm:top-10 sm:z-20 sm:w-44 sm:rounded-2xl sm:p-1.5 sm:pb-1.5"
                  >
                  <div className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-border sm:hidden" />
                  <p className="px-3 pb-2 pt-1 text-sm font-semibold text-text sm:hidden">
                    Actions
                  </p>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onRename(collection);
                    }}
                    className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-xs text-text transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    Rename collection
                  </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {collection.description && (
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-text-muted">
            {collection.description}
          </p>
        )}
        {tags.length > 0 ? (
          <div className="mt-4 flex min-h-6 flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/app/bookmarks?tag=${encodeURIComponent(tag)}`}
                className="max-w-full truncate rounded-full bg-background px-2.5 py-1 text-[10px] font-medium text-text-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                #{tag.replace(/^#/, "")}
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 min-h-6 text-[11px] text-text-muted">
            {collection.isCustom
              ? "Move saved links here to get started."
              : "No tags yet"}
          </p>
        )}
      </div>
    </article>
  );
}

export function CollectionsBrowser({
  initialCreate = false,
}: {
  initialCreate?: boolean;
}) {
  const bookmarksSnapshot = useSyncExternalStore(
    subscribeToBookmarks,
    getBookmarksSnapshot,
    getServerBookmarksSnapshot,
  );
  const detailsSnapshot = useSyncExternalStore(
    subscribeToBookmarkDetails,
    getBookmarkDetailsSnapshot,
    () => "[]",
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
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(initialCreate);
  const [editingCollection, setEditingCollection] =
    useState<CollectionCardModel | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const toast = useAppToast();

  useEffect(() => {
    syncPrivateCollections().catch((error: unknown) => {
      const reason =
        error instanceof Error ? error.message : "Please refresh and try again.";
      setSyncError(reason);
      toast.error("Couldn't load collections", reason);
    });
  }, [toast]);

  const {
    cards,
    storageError,
  }: { cards: CollectionCardModel[]; storageError: string } = useMemo(() => {
    try {
      if (bookmarksSnapshot === null || detailsSnapshot === null) {
        throw new Error("Browser storage is unavailable.");
      }
      const savedBookmarks = loadSavedBookmarks(bookmarksSnapshot).map(
        toSavedLibraryBookmark,
      );
      const detailEntries: unknown = JSON.parse(detailsSnapshot);
      if (
        !Array.isArray(detailEntries) ||
        !detailEntries.every(
          (entry) =>
            Array.isArray(entry) &&
            entry.length === 2 &&
            typeof entry[0] === "string" &&
            typeof entry[1] === "string",
        )
      ) {
        throw new Error("Saved bookmark details are invalid.");
      }
      const detailStates = new Map<string, ReturnType<typeof readBookmarkDetailState>>(
        detailEntries.map((entry: unknown) => {
          if (
            !Array.isArray(entry) ||
            typeof entry[0] !== "string" ||
            typeof entry[1] !== "string"
          ) {
            throw new Error("Saved bookmark details are invalid.");
          }
          return [entry[0], readBookmarkDetailState(entry[1])];
        }),
      );
      const bookmarks = [...savedBookmarks]
        .map((bookmark) => {
          const state = detailStates.get(bookmark.id);
          return {
            ...bookmark,
            title: state?.title ?? bookmark.title,
            description: state?.description ?? bookmark.description,
            topic: state?.collection ?? bookmark.topic,
            tags: state?.tags ?? bookmark.tags,
            intent: state?.intent ?? bookmark.intent,
          };
        })
        .filter((bookmark) => {
          const state = detailStates.get(bookmark.id);
          return !state?.archived && !state?.deleted;
        });
      const memberships = loadMemberships(membershipsSnapshot);
      const customCollections = loadCollections(collectionsSnapshot);
      const cards = customCollections
        .map((custom) => {
          const collectionName = custom.name;
          const id = custom.id;
          const assignedIds = bookmarkIdsForCollection(
            id,
            collectionName,
            bookmarks,
            memberships,
          );
          const items = bookmarks.filter((bookmark) =>
            assignedIds.has(bookmark.id),
          );
          return {
            id,
            name: collectionName,
            description: custom.description ?? "",
            bookmarks: items,
            tags: collectionTags(items),
            isCustom: true,
          };
        })
        .sort((first, second) => first.name.localeCompare(second.name));

      return { cards, storageError: "" };
    } catch {
      return {
        cards: [],
        storageError:
          "We couldn't load your collections from this browser. Check storage permissions and refresh.",
      };
    }
  }, [
    bookmarksSnapshot,
    collectionsSnapshot,
    detailsSnapshot,
    membershipsSnapshot,
  ]);

  const filteredCards = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return cards;
    }
    return cards.filter((card) =>
      [card.name, card.description, ...card.tags]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [cards, query]);

  function openCreate() {
    setName("");
    setDescription("");
    setMessage("");
    setSaveSucceeded(false);
    setEditingCollection(null);
    setShowCreate(true);
  }

  function openRename(collection: CollectionCardModel) {
    setName(collection.name);
    setDescription(collection.description);
    setMessage("");
    setSaveSucceeded(false);
    setEditingCollection(collection);
    setShowCreate(true);
  }

  function submitCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSaveSucceeded(false);
    startTransition(async () => {
      const names = cards
        .filter((card) => card.id !== editingCollection?.id)
        .map((card) => card.name);
      const normalizedName = name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
      if (names.some((existingName) => existingName.toLocaleLowerCase() === normalizedName)) {
        const reason = "A collection with this name already exists.";
        setMessage(reason);
        toast.error("Couldn't save collection", reason);
        return;
      }
      try {
        await mutatePrivateCollection(
          editingCollection ? "rename" : "create",
          editingCollection
            ? {
                collectionId: editingCollection.id,
                name,
                description,
              }
            : { name, description },
        );
        if (!editingCollection) trackProductEvent("collection_created");
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "The collection could not be saved.";
        setMessage(reason);
        toast.error("Couldn't save collection", reason);
        return;
      }

      toast.success(
        editingCollection ? "Collection renamed" : "Collection created",
      );
      setSaveSucceeded(true);
      window.setTimeout(() => {
        setShowCreate(false);
        setEditingCollection(null);
        setName("");
        setDescription("");
        setSaveSucceeded(false);
      }, 650);
    });
  }

  return (
    <main className="min-h-svh bg-background">
      {syncError && (
        <p
          role="alert"
          className="border-b border-error/30 bg-error/5 px-5 py-3 text-center text-sm text-text"
        >
          Your collections could not be synchronized: {syncError}
        </p>
      )}
      <header className="border-b border-border/60 bg-background px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
        <div className="mx-auto max-w-container-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Your Internet Memory
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-4xl">
                Collections
              </h1>
              <p className="mt-2 text-sm leading-6 text-text-muted sm:text-base">
                Organize the things you want to remember.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-11 sm:gap-2 sm:px-5"
            >
              <FolderPlus aria-hidden="true" className="size-4 sm:size-5" />
              <span className="hidden sm:inline">New Collection</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </header>

      <section
        aria-label="Search collections"
        className="px-5 py-6 sm:px-8 sm:py-8 lg:px-12"
      >
        <div className="mx-auto max-w-container-xl">
          <label className="relative block">
            <span className="sr-only">Search collections</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search collections..."
              className="h-12 w-full rounded-2xl border border-border/70 bg-surface-elevated pl-12 pr-12 text-sm text-text shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10 sm:h-14 sm:rounded-3xl sm:text-base"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-text-muted hover:bg-background hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </label>

          {storageError && (
            <div className="mt-4">
              <ErrorState description={storageError} />
            </div>
          )}
          {!storageError && (
            <>
              <p className="mb-4 mt-7 text-xs text-text-muted">
                {filteredCards.length}{" "}
                {filteredCards.length === 1 ? "collection" : "collections"}
              </p>
              {filteredCards.length > 0 ? (
                <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCards.map((collection) => (
                    <li key={collection.id} className="min-w-0">
                      <CollectionCard
                        collection={collection}
                        onRename={openRename}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-surface-elevated px-5 py-12 text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Search aria-hidden="true" className="size-5" />
                  </span>
                  <h2 className="mt-4 text-base font-semibold text-text">
                    No collections found
                  </h2>
                  <p className="mt-1 text-sm text-text-muted">
                    {query
                      ? "Try another search."
                      : "Create a collection to start organizing your saved links."}
                  </p>
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="mt-4 text-sm font-medium text-primary hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreate(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="collection-dialog-title"
            className="w-full rounded-t-3xl border border-border/70 bg-surface-elevated p-5 shadow-xl sm:max-w-md sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2
                id="collection-dialog-title"
                className="text-lg font-semibold tracking-[-0.03em] text-text"
              >
                {editingCollection ? "Rename collection" : "Create collection"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowCreate(false)}
                className="flex size-9 items-center justify-center rounded-full text-text-muted hover:bg-background hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <form onSubmit={submitCollection}>
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-text">
                  Name
                </span>
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setMessage("");
                  }}
                  placeholder="e.g. Product ideas"
                  maxLength={60}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-text outline-none placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </label>
              {!editingCollection && (
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-medium text-text">
                    Description
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setMessage("");
                    }}
                    placeholder="Web development resources..."
                    rows={3}
                    maxLength={240}
                    className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-5 text-text outline-none placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>
              )}
              {message && (
                <p className="mt-2 text-xs text-error" role="alert">
                  {message}
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowCreate(false)}
                  className="min-h-11 rounded-full border border-border px-4 text-sm font-medium text-text-muted transition-colors hover:bg-background disabled:opacity-60"
                >
                  Cancel
                </button>
                <ActionButton
                  type="submit"
                  status={
                    isPending
                      ? "loading"
                      : saveSucceeded
                        ? "success"
                        : message
                          ? "error"
                          : "idle"
                  }
                >
                  {isPending
                    ? "Saving..."
                    : saveSucceeded
                      ? "Saved"
                      : message
                        ? "Try again"
                    : editingCollection
                      ? "Save changes"
                      : "Create"}
                </ActionButton>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
