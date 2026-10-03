"use client";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  Share2,
  Sparkles,
} from "lucide-react";
import { BookmarkThumbnail } from "./BookmarkThumbnail";
import { BookmarkFavoriteButton } from "./BookmarkFavoriteButton";
import { BookmarkDetailHeader } from "./bookmark-detail-header";
import { mockBookmarks } from "./mock-bookmarks";
import type { Bookmark } from "./types";
import { useBookmarkActions } from "./bookmark-interactions-provider";
import { useAppToast } from "../feedback/AppToaster";
import { ActionButton } from "../ui/ActionButton";
import {
  getBookmarkDetailSnapshot,
  getServerBookmarkDetailSnapshot,
  readBookmarkDetailState,
  subscribeToBookmarkDetail,
  updateBookmarkDetailState,
  type BookmarkDetailActivity,
  type BookmarkDetailState,
} from "../../lib/bookmarks";
import {
  getCollectionsSnapshot,
  getServerCollectionsSnapshot,
  loadCollections,
  subscribeToCollections,
} from "../../lib/collections";

type BookmarkDetailViewProps = {
  bookmark: Bookmark;
  collection: string;
  relatedIds?: string[];
  isMock?: boolean;
};

function labelForContentType(contentType: Bookmark["contentType"]) {
  switch (contentType) {
    case "repository":
      return "Repository";
    case "video":
      return "Video";
    case "product":
      return "Product";
    case "tool":
      return "Tool";
    case "social":
      return "Social";
    case "document":
      return "Document";
    case "other":
      return "Other";
    default:
      return "Article";
  }
}

function publisherForDomain(domain: string) {
  const normalized = domain.replace(/^www\./, "");
  const knownPublishers: Record<string, string> = {
    "github.com": "GitHub",
    "youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "developer.ibm.com": "IBM Developer",
    "developer.apple.com": "Apple",
    "web.dev": "web.dev",
    "amazon.com": "Amazon",
  };
  return knownPublishers[normalized] ?? normalized;
}

function formatSavedDate(bookmark: Bookmark) {
  const date = bookmark.savedDate
    ? new Date(`${bookmark.savedDate}T12:00:00`)
    : new Date(bookmark.savedAt);
  if (Number.isNaN(date.getTime())) {
    return bookmark.savedAt;
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function mockSummary(bookmark: Bookmark) {
  if (bookmark.contentType === "repository") {
    return `${bookmark.title} is a code repository focused on ${bookmark.description?.toLowerCase() ?? "modern web development"}. Explore its implementation, documentation, and examples as a reference for related projects.`;
  }
  if (bookmark.contentType === "video") {
    return `This video introduces ${bookmark.description?.toLowerCase() ?? bookmark.title.toLowerCase()} and provides a visual walkthrough you can revisit while learning.`;
  }
  return `${bookmark.description ?? bookmark.title} This saved ${labelForContentType(bookmark.contentType).toLowerCase()} may be useful as a reference for ${bookmark.topic.toLowerCase()}.`;
}

function mockReason(bookmark: Bookmark) {
  if (!bookmark.intent) {
    return "You haven't added a reason yet.";
  }
  return `Saved for ${bookmark.intent.toLowerCase()} while exploring ${bookmark.subtopic.toLowerCase()} in ${bookmark.topic.toLowerCase()}.`;
}

function CardLink({ bookmark }: { bookmark: Bookmark }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-border/60 bg-background p-2 transition-colors hover:border-primary/30 hover:bg-surface sm:gap-3 sm:p-3">
      <Link
        href={`/app/bookmarks/${encodeURIComponent(bookmark.id)}`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <BookmarkThumbnail
          icon={bookmark.icon}
          topic={bookmark.topic}
          artwork={bookmark.artwork}
          thumbnailUrl={bookmark.thumbnailUrl}
          variant="list"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text group-hover:text-primary">
            {bookmark.title}
          </span>
          <span className="mt-1 block truncate text-xs text-text-muted">
            {bookmark.domain}
          </span>
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 shrink-0 text-text-muted transition-colors group-hover:text-primary"
        />
      </Link>
      <BookmarkFavoriteButton bookmark={bookmark} />
    </div>
  );
}

export function BookmarkDetailView({
  bookmark,
  collection,
  relatedIds,
  isMock = false,
}: BookmarkDetailViewProps) {
  const subscribe = useCallback(
    (onChange: () => void) =>
      subscribeToBookmarkDetail(bookmark.id, onChange),
    [bookmark.id],
  );
  const getSnapshot = useCallback(
    () => getBookmarkDetailSnapshot(bookmark.id),
    [bookmark.id],
  );
  const detailSnapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerBookmarkDetailSnapshot,
  );
  const collectionsSnapshot = useSyncExternalStore(
    subscribeToCollections,
    getCollectionsSnapshot,
    getServerCollectionsSnapshot,
  );
  const { setArchived, updateDetails } = useBookmarkActions();
  const toast = useAppToast();
  const detailState = useMemo(
    () => {
      try {
        return readBookmarkDetailState(detailSnapshot);
      } catch {
        return {};
      }
    },
    [detailSnapshot],
  );
  const availableCollections = useMemo(() => {
    try {
      return [
        ...new Set([
          "Development",
          "AI",
          "Design",
          "Learning",
          "Read later",
          ...loadCollections(collectionsSnapshot).map((item) => item.name),
        ]),
      ];
    } catch {
      return ["Development", "AI", "Design", "Learning", "Read later"];
    }
  }, [collectionsSnapshot]);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [showCollectionOptions, setShowCollectionOptions] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [noteSaveSucceeded, setNoteSaveSucceeded] = useState(false);
  const [noteSaveFailed, setNoteSaveFailed] = useState(false);
  const [archivedOverride, setArchivedOverride] = useState<boolean | null>(null);
  const [isInteractionPending, startInteraction] = useTransition();

  const archived =
    archivedOverride ?? detailState.archived ?? bookmark.archived ?? false;
  const unread = detailState.unread ?? bookmark.unread ?? false;
  const activeTitle = detailState.title ?? bookmark.title;
  const activeDescription = detailState.description ?? bookmark.description;
  const activeCollection = detailState.collection ?? collection;
  const tags = detailState.tags ?? bookmark.tags ?? [bookmark.topic, bookmark.subtopic];
  const intent = detailState.intent ?? bookmark.intent;
  const notes = notesDraft ?? detailState.notes ?? "";
  const savedDate = formatSavedDate(bookmark);
  const summary = mockSummary({
    ...bookmark,
    title: activeTitle,
    description: activeDescription,
    topic: activeCollection,
    intent,
  });
  const whySaved = isMock
    ? mockReason({ ...bookmark, intent, topic: activeCollection })
    : intent
      ? `You marked this for ${intent.toLowerCase()}.`
      : "You haven't added a reason yet.";
  const detailStorageError =
    detailSnapshot === null
      ? "Can't access saved details in this browser."
      : detailSnapshot &&
          (() => {
            try {
              readBookmarkDetailState(detailSnapshot);
              return false;
            } catch {
              return true;
            }
          })()
        ? "Saved detail data is invalid. Changes may not persist."
        : "";
  const relatedBookmarks = (relatedIds
    ? relatedIds
        .map((id) => mockBookmarks.find((item) => item.id === id))
        .filter((item): item is (typeof mockBookmarks)[number] => Boolean(item))
    : mockBookmarks.filter(
        (item) =>
          item.id !== bookmark.id &&
          (item.topic === activeCollection ||
            item.tags?.some((tag) => tags.includes(tag))),
      )
  ).slice(0, 3);

  function updateState(updates: BookmarkDetailState, activity?: string) {
    try {
      const current = readBookmarkDetailState(
        getBookmarkDetailSnapshot(bookmark.id),
      );
      const activityEntry: BookmarkDetailActivity[] = activity
        ? [
            {
              action: activity,
              at: new Date().toISOString(),
            },
            ...(current.activity ?? []),
          ]
        : (current.activity ?? []);
      updateBookmarkDetailState(bookmark.id, {
        ...updates,
        ...(activity ? { activity: activityEntry } : {}),
      });
      setFeedback("");
      if (activity) {
        toast.success(activity);
      }
    } catch {
      setFeedback("Couldn't save that update. Check browser storage permissions.");
      toast.error(
        "Couldn't save your changes",
        "Check browser storage permissions and try again.",
      );
    }
  }

  function toggleArchive() {
    const nextArchived = !archived;
    setArchivedOverride(nextArchived);
    startInteraction(async () => {
      try {
        await setArchived(bookmark.id, nextArchived);
      } finally {
        setArchivedOverride(null);
      }
    });
  }

  async function shareBookmark() {
    const shareData = { title: activeTitle, url: bookmark.url };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setFeedback("Bookmark shared.");
        toast.success("Bookmark shared");
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(bookmark.url);
      setFeedback("Link copied to share.");
      toast.success("Link copied");
    } catch {
      setFeedback("Couldn't share or copy the link in this browser.");
      toast.error(
        "Couldn't share this bookmark",
        "Sharing and clipboard access aren't available in this browser.",
      );
    }
  }

  function saveNotes() {
    const nextNotes = notesDraft ?? "";
    setNoteSaveSucceeded(false);
    setNoteSaveFailed(false);
    startInteraction(async () => {
      const succeeded = await updateDetails(bookmark.id, { notes: nextNotes });
      if (succeeded) {
        setNoteSaveSucceeded(true);
        setFeedback(nextNotes.trim() ? "Note added." : "Note removed.");
        window.setTimeout(() => {
          setNotesDraft(null);
          setIsEditingNotes(false);
          setNoteSaveSucceeded(false);
        }, 650);
      } else {
        setNoteSaveFailed(true);
      }
    });
  }

  function saveTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newTag = tagDraft.trim().replace(/^#/, "");
    if (!newTag || tags.some((tag) => tag.toLowerCase() === newTag.toLowerCase())) {
      setTagDraft("");
      return;
    }

    updateState(
      { tags: [...tags, newTag] },
      `Added tag #${newTag}`,
    );
    setTagDraft("");
    setShowTagInput(false);
    setFeedback("Tag added.");
  }

  function moveToCollection(nextCollection: string) {
    updateState(
      { collection: nextCollection },
      `Moved to ${nextCollection}`,
    );
    setShowCollectionOptions(false);
    setFeedback(`Moved to ${nextCollection}.`);
  }

  return (
    <main className="min-h-svh bg-background px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <BookmarkDetailHeader
          title={activeTitle}
          collection={activeCollection}
          url={bookmark.url}
        />

        <article className="overflow-hidden rounded-3xl border border-border/60 bg-surface-elevated shadow-sm">
          <BookmarkThumbnail
            icon={bookmark.icon}
            topic={bookmark.topic}
            artwork={bookmark.artwork}
            thumbnailUrl={bookmark.thumbnailUrl}
          />
          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {labelForContentType(bookmark.contentType)}
              </span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs font-medium text-text-muted">
                {publisherForDomain(bookmark.domain)}
              </span>
              {unread && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span className="size-1.5 rounded-full bg-primary" />
                  Unread
                </span>
              )}
            </div>

            <h1 className="mt-3 wrap-break-word text-2xl font-semibold leading-tight tracking-[-0.04em] text-text sm:text-4xl">
              {activeTitle}
            </h1>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              <span className="truncate">{bookmark.domain}</span>
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
            </a>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">
              {activeDescription || "No description available."}
            </p>

            <div className="mt-6 flex flex-col gap-2 border-t border-border/60 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Open original
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
              <div className="flex flex-wrap gap-2">
                <BookmarkFavoriteButton bookmark={bookmark} variant="pill" />
                <button
                  type="button"
                  aria-pressed={archived}
                  aria-busy={isInteractionPending}
                  disabled={isInteractionPending}
                  onClick={toggleArchive}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-xs font-medium text-text-muted transition-colors hover:bg-background hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Archive aria-hidden="true" className="size-4" />
                  {archived ? "Restore" : "Archive"}
                </button>
                <button
                  type="button"
                  onClick={shareBookmark}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-xs font-medium text-text-muted transition-colors hover:bg-background hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Share2 aria-hidden="true" className="size-4" />
                  Share
                </button>
              </div>
            </div>
            <p
              className={`mt-3 text-xs ${feedback || detailStorageError ? "text-error" : "text-text-muted"}`}
              role="status"
              aria-live="polite"
            >
              {feedback || detailStorageError}
            </p>
          </div>
        </article>

        <div className="mt-5 divide-y divide-border/70 rounded-3xl border border-border/60 bg-surface-elevated px-5 sm:mt-6 sm:px-7">
          <section className="py-5 sm:py-6">
            <h2 className="text-sm font-semibold text-text">Description</h2>
            <p className="mt-2 text-sm leading-7 text-text-muted">
              {activeDescription || "No description available."}
            </p>
          </section>

          <section className="py-5 sm:py-6">
            <h2 className="text-sm font-semibold text-text">Why you saved it</h2>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles aria-hidden="true" className="size-3.5" />
              {intent ?? "Not specified"}
            </p>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {whySaved}
              {isMock && (
                <span className="ml-1 text-text-muted/70">
                  (sample context)
                </span>
              )}
            </p>
          </section>

          <section className="py-5 sm:py-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-text">Tags</h2>
              <Link
                href={`/app/bookmarks?tag=${encodeURIComponent(tags[0] ?? bookmark.topic)}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Browse related
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.length === 0 && (
                <p className="text-sm text-text-muted">No tags yet</p>
              )}
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/app/bookmarks?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex min-h-8 items-center rounded-full bg-background px-3 text-xs font-medium text-text-muted transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  #{tag.replace(/^#/, "")}
                </Link>
              ))}
              <button
                type="button"
                aria-expanded={showTagInput}
                onClick={() => setShowTagInput((visible) => !visible)}
                className="inline-flex min-h-8 items-center rounded-full border border-dashed border-border px-3 text-xs font-medium text-text-muted transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                + Add tag
              </button>
            </div>
            {showTagInput && (
              <form onSubmit={saveTag} className="mt-3 flex gap-2">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">New tag</span>
                  <input
                    autoFocus
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    placeholder="Tag name"
                    className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Add
                </button>
              </form>
            )}
          </section>

          <section className="py-5 sm:py-6">
            <h2 className="text-sm font-semibold text-text">Collection</h2>
            <Link
              href={`/app/bookmarks?collection=${encodeURIComponent(activeCollection)}`}
              className="mt-3 flex min-h-12 items-center justify-between rounded-2xl border border-border/70 bg-background px-4 text-sm font-medium text-text transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {activeCollection}
              <ArrowUpRight aria-hidden="true" className="size-4 text-text-muted" />
            </Link>
            <button
              type="button"
              aria-expanded={showCollectionOptions}
              onClick={() =>
                setShowCollectionOptions((visible) => !visible)
              }
              className="mt-2 inline-flex min-h-8 items-center text-xs font-medium text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Move to another collection
            </button>
            {showCollectionOptions && (
              <div
                role="group"
                aria-label="Move to another collection"
                className="mt-2 flex flex-wrap gap-2"
              >
                {availableCollections
                  .filter((item) => item !== activeCollection)
                  .map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => moveToCollection(item)}
                      className="inline-flex min-h-8 items-center rounded-full border border-border px-3 text-xs font-medium text-text-muted transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {item}
                    </button>
                  ))}
              </div>
            )}
            <p className="mt-2 text-xs text-text-muted">
              Collection changes are saved in this browser.
            </p>
          </section>

          <section className="py-5 sm:py-6">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-text">AI Summary</h2>
              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-text-muted">
                Preview
              </span>
            </div>
            <p
              className={`mt-3 text-sm leading-7 text-text-muted ${summaryExpanded ? "" : "line-clamp-3"}`}
            >
              {summary}
            </p>
            <button
              type="button"
              aria-expanded={summaryExpanded}
              onClick={() => setSummaryExpanded((expanded) => !expanded)}
              className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {summaryExpanded ? "Show less" : "Show more"}
            </button>
            <p className="mt-1 text-[11px] text-text-muted">
              Example summary for this prototype; AI analysis is not connected.
            </p>
          </section>
        </div>

        <section className="mt-8" aria-labelledby="related-bookmarks-title">
          <div className="mb-3">
            <h2
              id="related-bookmarks-title"
              className="text-lg font-semibold tracking-[-0.03em] text-text"
            >
              Related from your library
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              You may also find these useful.
            </p>
          </div>
          {relatedBookmarks.length > 0 ? (
            <ul className="grid list-none gap-2 p-0 sm:grid-cols-2">
              {relatedBookmarks.map((item) => (
                <li key={item.id} className="min-w-0">
                  <CardLink bookmark={item} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-border/60 bg-surface-elevated p-4 text-sm text-text-muted">
              Save more links to find related items here.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-border/60 bg-surface-elevated p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-text">
                Notes
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                Add your own context to this saved item.
              </p>
            </div>
            {detailState.notes && !isEditingNotes && (
              <span className="text-[11px] text-text-muted">Saved locally</span>
            )}
          </div>
          {isEditingNotes ? (
            <>
              <textarea
                autoFocus
                value={notes}
                onChange={(event) => {
                  setNotesDraft(event.target.value);
                  setNoteSaveFailed(false);
                  setNoteSaveSucceeded(false);
                }}
                placeholder="Add a note..."
                rows={4}
                className="mt-4 w-full resize-y rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm leading-6 text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-text-muted">
                  Notes are stored in this browser.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isInteractionPending}
                    onClick={() => {
                      setNotesDraft(null);
                      setIsEditingNotes(false);
                      setNoteSaveFailed(false);
                      setNoteSaveSucceeded(false);
                    }}
                    className="inline-flex min-h-9 items-center rounded-full border border-border px-4 text-xs font-medium text-text-muted transition-colors hover:bg-background disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="button"
                    onClick={saveNotes}
                    status={
                      isInteractionPending
                        ? "loading"
                        : noteSaveSucceeded
                          ? "success"
                          : noteSaveFailed
                            ? "error"
                            : "idle"
                    }
                    className="min-h-9 px-4 text-xs"
                  >
                    {isInteractionPending
                      ? "Saving..."
                      : noteSaveSucceeded
                        ? "Saved"
                        : noteSaveFailed
                          ? "Try again"
                          : "Save note"}
                  </ActionButton>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4">
              {notes.trim() ? (
                <p className="whitespace-pre-wrap rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm leading-6 text-text">
                  {notes}
                </p>
              ) : (
                <p className="text-sm text-text-muted">
                  You haven&apos;t added a note yet.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setNotesDraft(notes);
                  setIsEditingNotes(true);
                }}
                className="mt-3 inline-flex min-h-9 items-center rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {notes.trim() ? "Edit note" : "Add a note"}
              </button>
            </div>
          )}
        </section>

        <section className="mt-8 pb-8" aria-labelledby="bookmark-activity-title">
          <h2
            id="bookmark-activity-title"
            className="text-lg font-semibold tracking-[-0.03em] text-text"
          >
            Activity
          </h2>
          <ol className="mt-4 space-y-0">
            {[
              ...(detailState.activity ?? []),
              ...(intent
                ? [{ action: `Saved for ${intent}`, at: bookmark.savedDate ?? "" }]
                : []),
              { action: `Added to ${activeCollection}`, at: bookmark.savedDate ?? "" },
              { action: "Saved", at: bookmark.savedDate ?? "" },
            ].map((activity, index) => (
              <li key={`${activity.action}-${activity.at}-${index}`} className="flex gap-3">
                <span className="flex w-3 shrink-0 flex-col items-center">
                  <span
                    className={`mt-1 size-2 rounded-full ${index === 0 ? "bg-primary" : "bg-border"}`}
                  />
                  {index < (detailState.activity?.length ?? 0) + 1 && (
                    <span className="mt-1 w-px flex-1 bg-border" />
                  )}
                </span>
                <div className="pb-4">
                  <p className="text-sm font-medium text-text">
                    {activity.action}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {activity.at
                      ? new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(activity.at))
                      : savedDate}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
