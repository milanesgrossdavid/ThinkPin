"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Check, FolderPlus, Sparkles, X } from "lucide-react";
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
  getCollectionsSnapshot,
  getMembershipsSnapshot,
  getServerCollectionsSnapshot,
  getServerMembershipsSnapshot,
  loadMemberships,
  loadCollections,
  subscribeToCollections,
  subscribeToMemberships,
} from "../../lib/collections";
import { mutatePrivateCollection, syncPrivateCollections } from "../../lib/collections/client";
import { useAppToast } from "../feedback/AppToaster";

const suggestionStatusStorageKey = "thinkpin:smart-collection-suggestions";
const suggestionStatusChangedEvent = "thinkpin:smart-collection-suggestions-change";
const MAX_SUGGESTIONS = 5;

type SuggestionStatus = Record<string, "created" | "dismissed">;
type Suggestion = {
  id: string;
  name: string;
  description: string;
  signals: string[];
  bookmarkIds: string[];
  bookmarkTitles: string[];
  kind: "create" | "add";
  collectionId?: string;
};

const suggestionPatterns: Array<{
  id: string;
  name: string;
  description: string;
  terms: RegExp;
}> = [
  {
    id: "ai-tools",
    name: "AI Tools",
    description: "AI tools and resources you may want to keep together.",
    terms: /\b(ai|artificial intelligence|llm|machine learning|ollama|openai|claude|cursor)\b/i,
  },
  {
    id: "web-development",
    name: "Web Development",
    description: "Resources related to building websites and applications.",
    terms: /\b(web development|frontend|backend|javascript|typescript|react|next\.js|css|html|programming|coding|node(?:\.js)?|npm|github|repository|repositories|web scraping|scraping)\b/i,
  },
  {
    id: "design-resources",
    name: "Design Resources",
    description: "Design inspiration, systems, and tools for digital products.",
    terms: /\b(design|figma|ui|ux|typography|color|design system|interface)\b/i,
  },
  {
    id: "learning-resources",
    name: "Learning Resources",
    description: "Courses, tutorials, and material saved for learning.",
    terms: /\b(learn|learning|course|tutorial|guide|documentation|lesson|education)\b/i,
  },
  {
    id: "research-reference",
    name: "Research & Reference",
    description: "Articles and references collected for deeper research.",
    terms: /\b(research|reference|paper|study|documentation|article|journal)\b/i,
  },
];

function subscribeToSuggestionStatus(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === suggestionStatusStorageKey || event.key === null) {
      onChange();
    }
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(suggestionStatusChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(suggestionStatusChangedEvent, onChange);
  };
}

function getSuggestionStatusSnapshot() {
  try {
    return window.localStorage.getItem(suggestionStatusStorageKey) ?? "";
  } catch {
    return null;
  }
}

function getServerSuggestionStatusSnapshot() {
  return "";
}

function parseSuggestionStatus(snapshot: string | null): SuggestionStatus {
  if (!snapshot) return {};
  const value: unknown = JSON.parse(snapshot);
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !Object.values(value).every(
      (status) => status === "created" || status === "dismissed",
    )
  ) {
    throw new Error("Smart Collection suggestion status is invalid.");
  }
  return value as SuggestionStatus;
}

function saveSuggestionStatus(status: SuggestionStatus) {
  window.localStorage.setItem(
    suggestionStatusStorageKey,
    JSON.stringify(status),
  );
  window.dispatchEvent(new Event(suggestionStatusChangedEvent));
}

function makeSuggestions(
  bookmarks: ReturnType<typeof loadSavedBookmarks>,
  collectionNames: string[],
  customCollections: ReturnType<typeof loadCollections>,
  memberships: ReturnType<typeof loadMemberships>,
  statuses: SuggestionStatus,
): Suggestion[] {
  return suggestionPatterns
    .filter((pattern) => !statuses[pattern.id])
    .map((pattern) => {
      const matched = bookmarks.filter((bookmark) => {
        if (bookmark.archived) return false;
        const text = [
          bookmark.title,
          bookmark.description,
          bookmark.domain,
          bookmark.contentType ?? "",
          bookmark.intent ?? "",
          ...bookmark.tags,
        ].join(" ");
        return pattern.terms.test(text);
      });
      const existingName = collectionNames.find((name) => {
        const normalized = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        switch (pattern.id) {
          case "ai-tools":
            return ["ai", "ai tools", "artificial intelligence"].includes(normalized);
          case "web-development":
            return ["development", "web development", "web dev", "developer"].includes(normalized);
          case "design-resources":
            return ["design", "design resources", "ui ux"].includes(normalized);
          case "learning-resources":
            return ["learning", "learning resources", "education"].includes(normalized);
          case "research-reference":
            return ["research", "reference", "research reference"].includes(normalized);
        }
      });
      const existingCollection = existingName
        ? customCollections.find(
            (collection) =>
              collection.name.toLocaleLowerCase() === existingName.toLocaleLowerCase(),
          )
        : null;
      const collectionId = existingCollection?.id;
      const assignedIds = existingName && collectionId
        ? bookmarkIdsForCollection(
            collectionId,
            existingName,
            bookmarks.map((bookmark) => ({
              id: bookmark.id,
              topic: bookmark.collection,
            })),
            memberships,
          )
        : new Set<string>();
      const suggestedBookmarks = matched.filter(
        (bookmark) => !assignedIds.has(bookmark.id),
      );
      const signals = [
        ...new Set(suggestedBookmarks.flatMap((bookmark) => bookmark.tags)),
      ].slice(0, 3);
      return {
        id: pattern.id,
        name: existingName ?? pattern.name,
        description: existingName
          ? `${suggestedBookmarks.length} bookmarks seem to belong in this collection.`
          : pattern.description,
        signals,
        bookmarkIds: suggestedBookmarks.map((bookmark) => bookmark.id),
        bookmarkTitles: suggestedBookmarks.map((bookmark) => bookmark.title),
        kind: existingName ? ("add" as const) : ("create" as const),
        ...(collectionId ? { collectionId } : {}),
      };
    })
    .filter((suggestion) => suggestion.bookmarkIds.length >= 3)
    .slice(0, MAX_SUGGESTIONS);
}

export function MagicCollections() {
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
  const statusesSnapshot = useSyncExternalStore(
    subscribeToSuggestionStatus,
    getSuggestionStatusSnapshot,
    getServerSuggestionStatusSnapshot,
  );
  const [customizing, setCustomizing] = useState<Suggestion | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState("");
  const [privateCollectionsError, setPrivateCollectionsError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const toast = useAppToast();

  useEffect(() => {
    syncPrivateCollections().catch((error: unknown) => {
      const reason =
        error instanceof Error ? error.message : "Please refresh and try again.";
      setPrivateCollectionsError(reason);
      toast.error("Couldn't load collections", reason);
    });
  }, [toast]);

  const { suggestions, bookmarksById, collectionNames, loadError } =
    useMemo(() => {
      try {
        if (
          bookmarksSnapshot === null ||
          detailsSnapshot === null ||
          collectionsSnapshot === null ||
          membershipsSnapshot === null ||
          statusesSnapshot === null
        ) {
          throw new Error("Browser storage is unavailable.");
        }
        const detailsData: unknown = JSON.parse(detailsSnapshot || "[]");
        if (!Array.isArray(detailsData)) {
          throw new Error("Saved bookmark details are invalid.");
        }
        const details = new Map<
          string,
          ReturnType<typeof readBookmarkDetailState>
        >();
        for (const entry of detailsData) {
          if (
            Array.isArray(entry) &&
            entry.length === 2 &&
            typeof entry[0] === "string" &&
            typeof entry[1] === "string"
          ) {
            details.set(entry[0], readBookmarkDetailState(entry[1]));
          }
        }

        const bookmarks = loadSavedBookmarks(bookmarksSnapshot)
          .map((bookmark) => {
            const detail = details.get(bookmark.id);
            return {
              ...bookmark,
              title: detail?.title ?? bookmark.title,
              description: detail?.description ?? bookmark.description,
              collection: detail?.collection ?? bookmark.collection,
              tags: detail?.tags ?? bookmark.tags,
              contentType: detail?.contentType ?? bookmark.contentType,
              intent: detail?.intent ?? bookmark.intent,
              archived: detail?.archived ?? bookmark.archived ?? false,
            };
          })
          .filter((bookmark) => !bookmark.archived);
        const customCollections = loadCollections(collectionsSnapshot);
        const memberships = loadMemberships(membershipsSnapshot);
        const names = [
          ...new Set(customCollections.map((collection) => collection.name)),
        ];
        const statuses = parseSuggestionStatus(statusesSnapshot);
        return {
          suggestions: makeSuggestions(
            bookmarks,
            names,
            customCollections,
            memberships,
            statuses,
          ),
          bookmarksById: new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark])),
          collectionNames: names,
          loadError: "",
        };
      } catch (error) {
        return {
          suggestions: [],
          bookmarksById: new Map(),
          collectionNames: [],
          loadError:
            error instanceof Error
              ? error.message
              : "Smart Collections could not be loaded.",
        };
      }
    }, [
      bookmarksSnapshot,
      collectionsSnapshot,
      detailsSnapshot,
      membershipsSnapshot,
      statusesSnapshot,
    ]);

  function openCustomize(suggestion: Suggestion) {
    setCustomizing(suggestion);
    setName(suggestion.name);
    setDescription(suggestion.description);
    setSelectedBookmarkIds(suggestion.bookmarkIds);
    setActionError("");
  }

  function dismiss(suggestion: Suggestion) {
    try {
      const status = parseSuggestionStatus(getSuggestionStatusSnapshot());
      saveSuggestionStatus({ ...status, [suggestion.id]: "dismissed" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Try again in a moment.";
      toast.error("Couldn't dismiss suggestion", message);
    }
  }

  async function createSuggestedCollection() {
    if (!customizing || isSaving) return;
    setIsSaving(true);
    setActionError("");
    try {
      let collectionName = customizing.name;
      if (customizing.kind === "create") {
        const normalizedName = name.trim().replace(/\s+/g, " ");
        if (
          collectionNames.some(
            (existingName) =>
              existingName.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
          )
        ) {
          throw new Error("A collection with this name already exists.");
        }
        collectionName = normalizedName;
        await mutatePrivateCollection("create", {
          name,
          description,
          bookmarkIds: selectedBookmarkIds,
        });
      } else {
        const collectionId = customizing.collectionId;
        if (!collectionId) {
          throw new Error("The suggested collection could not be found.");
        }
        const currentMemberships = loadMemberships(getMembershipsSnapshot());
        const currentIds: string[] =
          currentMemberships[collectionId] ??
          customizing.bookmarkIds.filter((id) =>
            bookmarksById.get(id)?.collection.toLocaleLowerCase() ===
            collectionName.toLocaleLowerCase(),
          );
        await mutatePrivateCollection("members", {
          collectionId,
          bookmarkIds: [...new Set([...currentIds, ...selectedBookmarkIds])],
        });
      }
      try {
        saveSuggestionStatus({
          ...parseSuggestionStatus(getSuggestionStatusSnapshot()),
          [customizing.id]: "created",
        });
      } catch (error) {
        console.error(
          "Collection was saved but suggestion status could not be recorded.",
          error,
        );
      }
      toast.success(
        customizing.kind === "add"
          ? `Added bookmarks to ${collectionName}`
          : `${collectionName} collection created`,
      );
      setCustomizing(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't create this collection.";
      setActionError(message);
      toast.error("Couldn't create collection", message);
    } finally {
      setIsSaving(false);
    }
  }

  if (privateCollectionsError) {
    return (
      <section className="px-5 py-4 sm:px-8 lg:px-12">
        <div role="alert" className="mx-auto max-w-container-xl rounded-2xl border border-error/30 bg-error/5 p-4 text-sm text-text">
          Private collections could not be synchronized: {privateCollectionsError}
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="px-5 py-4 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-container-xl rounded-2xl border border-error/30 bg-error/5 p-4 text-sm text-text">
          {loadError}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="magic-collections-heading"
      className="px-5 py-4 sm:px-8 sm:py-5 lg:px-12"
    >
      <div className="mx-auto max-w-container-xl rounded-3xl border border-border/60 bg-surface-elevated p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2
              id="magic-collections-heading"
              className="text-lg font-semibold tracking-[-0.03em] text-text"
            >
              Smart Collections
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
              Suggested from patterns in your saved links. Nothing is created
              or moved until you choose.
            </p>
          </div>
        </div>

        {suggestions.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {suggestions.map((suggestion) => (
              <article
                key={suggestion.id}
                className="rounded-2xl border border-border/60 bg-background/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-text">
                      {suggestion.name}
                    </h3>
                    <p className="mt-1 text-xs text-text-muted">
                      {suggestion.bookmarkIds.length}{" "}
                      {suggestion.kind === "add"
                        ? "new bookmarks to review"
                        : "related bookmarks"}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Dismiss ${suggestion.name} suggestion`}
                    onClick={() => dismiss(suggestion)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface hover:text-text"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-text-muted">
                  {suggestion.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(suggestion.signals.length
                    ? suggestion.signals
                    : suggestion.bookmarkTitles.slice(0, 3)
                  ).map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-medium text-text-muted"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openCustomize(suggestion)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <FolderPlus aria-hidden="true" className="size-3.5" />
                    {suggestion.kind === "add" ? "Review & Add" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openCustomize(suggestion)}
                    className="min-h-9 rounded-full border border-border px-3.5 text-xs font-medium text-text-muted transition-colors hover:text-text"
                  >
                    {suggestion.kind === "add" ? "Customize" : "Customize"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-background/60 p-4 text-sm leading-6 text-text-muted">
            Your library is already organized. We&apos;ll suggest collections
            when we find meaningful patterns in at least three bookmarks.
          </p>
        )}
      </div>

      {customizing && (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setCustomizing(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customize-smart-collection-title"
            className="max-h-[90svh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-border bg-surface-elevated p-5 shadow-xl sm:rounded-3xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="customize-smart-collection-title"
                  className="text-lg font-semibold text-text"
                >
                  {customizing.kind === "add"
                    ? `Add to ${customizing.name}`
                    : "Customize collection"}
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  {customizing.kind === "add"
                    ? "Choose which suggested bookmarks to add."
                    : "Review the name and bookmarks before creating it."}
                </p>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setCustomizing(null)}
                aria-label="Close customization"
                className="flex size-9 items-center justify-center rounded-full text-text-muted hover:bg-background disabled:opacity-50"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <label className="mt-5 block text-xs font-medium text-text">
              {customizing.kind === "add"
                ? "Existing collection"
                : "Name"}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                disabled={isSaving || customizing.kind === "add"}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <label className="mt-4 block text-xs font-medium text-text">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={240}
                rows={2}
                disabled={isSaving || customizing.kind === "add"}
                className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-5 text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <fieldset className="mt-5">
              <legend className="text-xs font-medium text-text">
                Include bookmarks ({selectedBookmarkIds.length})
              </legend>
              <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
                {customizing.bookmarkIds.map((bookmarkId) => {
                  const bookmark = bookmarksById.get(bookmarkId);
                  if (!bookmark) return null;
                  const checked = selectedBookmarkIds.includes(bookmarkId);
                  return (
                    <li key={bookmarkId}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-text hover:bg-background">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedBookmarkIds((current) =>
                              checked
                                ? current.filter((id) => id !== bookmarkId)
                                : [...current, bookmarkId],
                            )
                          }
                          className="size-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {bookmark.title}
                        </span>
                        <span className="shrink-0 text-xs text-text-muted">
                          {bookmark.domain}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
            {actionError && (
              <p role="alert" className="mt-4 text-sm leading-5 text-error">
                {actionError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setCustomizing(null)}
                className="min-h-10 rounded-full border border-border px-4 text-sm font-medium text-text-muted hover:text-text disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isSaving ||
                  !name.trim() ||
                  selectedBookmarkIds.length === 0
                }
                onClick={createSuggestedCollection}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  "Creating…"
                ) : (
                  <>
                    <Check aria-hidden="true" className="size-4" />
                    {customizing.kind === "add"
                      ? "Add to Collection"
                      : "Create Collection"}
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
