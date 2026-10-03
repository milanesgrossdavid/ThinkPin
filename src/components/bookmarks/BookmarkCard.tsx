"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Archive,
  Check,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { BookmarkThumbnail } from "./BookmarkThumbnail";
import {
  useBookmarkActions,
  useBookmarkInteractionState,
} from "./bookmark-interactions-provider";
import { BookmarkFavoriteButton } from "./BookmarkFavoriteButton";
import { useAppToast } from "../feedback/AppToaster";
import { ActionButton } from "../ui/ActionButton";
import type { Bookmark, BookmarkView } from "./types";
import { mockBookmarks } from "./mock-bookmarks";
import { mockCollections } from "../../lib/mock/collections";
import {
  createCollection,
  getCollectionsSnapshot,
  getServerCollectionsSnapshot,
  loadCollections,
  subscribeToCollections,
} from "../../lib/collections";
import type { BookmarkIntent } from "../../lib/bookmarks";

const intents: BookmarkIntent[] = [
  "Research",
  "Learn",
  "Buy",
  "Reference",
  "Project",
  "Inspiration",
];

const suggestedTags = [
  "Next.js",
  "React",
  "TypeScript",
  "Authentication",
  "Web Development",
];

function uniqueTags(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

type BookmarkCardProps = {
  bookmark: Bookmark;
  variant?: BookmarkView;
};

type BookmarkDialogMode = "edit" | "move" | "tags" | "delete";

export function BookmarkCard({
  bookmark,
  variant = "grid",
}: BookmarkCardProps) {
  const isGrid = variant === "grid";
  const isCompact = variant === "compact";
  const {
    setUnread: updateUnread,
    setArchived,
    updateDetails,
    setDeleted,
  } = useBookmarkActions();
  const interactionState = useBookmarkInteractionState(bookmark);
  const [unreadOverride, setUnreadOverride] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<BookmarkDialogMode | null>(null);
  const [titleDraft, setTitleDraft] = useState(bookmark.title);
  const [descriptionDraft, setDescriptionDraft] = useState(
    bookmark.description ?? "",
  );
  const [collectionDraft, setCollectionDraft] = useState(bookmark.topic);
  const [selectedTags, setSelectedTags] = useState(
    bookmark.tags ?? [bookmark.topic, bookmark.subtopic],
  );
  const [intentDraft, setIntentDraft] = useState<BookmarkIntent>("Research");
  const [notesDraft, setNotesDraft] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const collectionsSnapshot = useSyncExternalStore(
    subscribeToCollections,
    getCollectionsSnapshot,
    getServerCollectionsSnapshot,
  );
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const toast = useAppToast();
  const unread = unreadOverride ?? interactionState.unread;
  const tags = bookmark.tags ?? [bookmark.topic, bookmark.subtopic];
  const allCollections = useMemo(() => {
    let savedNames: string[] = [];
    try {
      savedNames = loadCollections(collectionsSnapshot).map(
        (collection) => collection.name,
      );
    } catch {
      savedNames = [];
    }
    return [...new Set([
      ...mockCollections.map((collection) => collection.name),
      "Shopping",
      ...savedNames,
      bookmark.topic,
    ])].sort((left, right) => left.localeCompare(right));
  }, [bookmark.topic, collectionsSnapshot]);
  const filteredCollections = allCollections.filter((collection) =>
    collection.toLowerCase().includes(collectionSearch.trim().toLowerCase()),
  );
  const availableTags = uniqueTags([
    ...suggestedTags,
    ...mockBookmarks.flatMap((item) => item.tags ?? []),
    ...tags,
  ]).sort((left, right) => left.localeCompare(right));
  const filteredTags = availableTags.filter((tag) =>
    tag.toLowerCase().includes(tagSearch.trim().toLowerCase()),
  );
  const visibleTags = tags.slice(0, 3);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
  const detailHref = `/app/bookmarks/${encodeURIComponent(bookmark.id)}`;

  useEffect(() => {
    if (!dialogMode) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        setDialogMode(null);
        setActionError("");
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [dialogMode, isPending]);

  function openDialog(mode: BookmarkDialogMode) {
    setMenuOpen(false);
    setActionError("");
    setTitleDraft(interactionState.detailState.title ?? bookmark.title);
    setDescriptionDraft(
      interactionState.detailState.description ?? bookmark.description ?? "",
    );
    setCollectionDraft(
      interactionState.detailState.collection ?? bookmark.topic,
    );
    setSelectedTags(
      interactionState.detailState.tags ?? tags,
    );
    const currentIntent =
      interactionState.detailState.intent ?? bookmark.intent;
    setIntentDraft(
      intents.find((intent) => intent === currentIntent) ?? "Research",
    );
    setNotesDraft(interactionState.detailState.notes ?? "");
    setCollectionSearch("");
    setTagSearch("");
    setNewCollectionName("");
    setShowCreateCollection(false);
    setDialogMode(mode);
  }

  function toggleUnread() {
    const nextUnread = !unread;
    setUnreadOverride(nextUnread);
    startTransition(async () => {
      try {
        await updateUnread(bookmark.id, nextUnread);
      } finally {
        setUnreadOverride(null);
      }
    });
    setMenuOpen(false);
  }

  function runAction(action: () => Promise<boolean>, onSuccess: () => void) {
    setActionError("");
    startTransition(async () => {
      const succeeded = await action();
      if (succeeded) {
        onSuccess();
      } else {
        setActionError("We couldn't save that change. Try again.");
      }
    });
  }

  function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dialogMode === "delete") {
      runAction(
        () => setDeleted(bookmark.id, true),
        () => {
          setDialogMode(null);
          toast.action("Bookmark deleted", "Undo", () => {
            void setDeleted(bookmark.id, false);
          });
        },
      );
      return;
    }

    const updates =
      dialogMode === "edit"
        ? {
            title: titleDraft.trim(),
            description: descriptionDraft.trim(),
            collection: collectionDraft.trim(),
            tags: selectedTags,
            intent: intentDraft,
            notes: notesDraft.trim(),
          }
        : dialogMode === "move"
          ? { collection: collectionDraft.trim() }
          : { tags: selectedTags };
    if (
      ("title" in updates && !updates.title) ||
      ("collection" in updates && !updates.collection)
    ) {
      setActionError("This field can't be empty.");
      return;
    }

    runAction(
      () => updateDetails(bookmark.id, updates),
      () => setDialogMode(null),
    );
  }

  function archiveBookmark() {
    setMenuOpen(false);
    runAction(
      () => setArchived(bookmark.id, true),
      () => {},
    );
  }

  function openOriginal() {
    setMenuOpen(false);
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(bookmark.url);
      setFeedback("Link copied.");
      toast.success("Link copied");
    } catch {
      setFeedback("Couldn't copy the link. Open the bookmark to copy it.");
      toast.error(
        "Couldn't copy the link",
        "Open the bookmark and try copying the original URL.",
      );
    }
  }

  const actions = (
    <div className="flex shrink-0 items-center gap-1">
      {unread && (
        <span
          className="mr-1 flex size-2 rounded-full bg-primary"
          role="img"
          aria-label="Unread"
          title="Unread"
        />
      )}
      <BookmarkFavoriteButton bookmark={bookmark} />
      <div className="relative">
        <button
          type="button"
          aria-label={`More actions for ${bookmark.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-background hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <MoreHorizontal aria-hidden="true" className="size-[18px]" />
        </button>
        {menuOpen && (
          <div
            className="fixed inset-0 z-[110] bg-black/40 sm:contents"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setMenuOpen(false);
              }
            }}
          >
          <div
            role="menu"
            aria-label={`Actions for ${bookmark.title}`}
            className="fixed inset-x-0 bottom-0 z-[111] max-h-[85dvh] overflow-y-auto rounded-t-3xl border border-border bg-surface-elevated p-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-xl sm:absolute sm:inset-auto sm:right-0 sm:top-10 sm:z-20 sm:max-h-[min(80dvh,36rem)] sm:w-52 sm:rounded-2xl sm:p-1.5 sm:pb-1.5"
          >
            <div className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-border sm:hidden" />
            <p className="px-3 pb-2 pt-1 text-sm font-semibold text-text sm:hidden">
              Actions
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={openOriginal}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ExternalLink aria-hidden="true" className="size-4 text-text-muted" />
              Open link
            </button>
            <Link
              role="menuitem"
              href={detailHref}
              onClick={() => setMenuOpen(false)}
              className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Pencil aria-hidden="true" className="size-4 text-text-muted" />
              Open details
            </Link>
            <div className="my-1 border-t border-border/60" />
            <button
              type="button"
              role="menuitem"
              onClick={() => openDialog("edit")}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Pencil aria-hidden="true" className="size-4 text-text-muted" />
              Edit bookmark
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openDialog("move")}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Archive aria-hidden="true" className="size-4 text-text-muted" />
              Move to collection
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openDialog("tags")}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Tag aria-hidden="true" className="size-4 text-text-muted" />
              Add tags
            </button>
            <div className="my-1 border-t border-border/60" />
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={toggleUnread}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Check aria-hidden="true" className="size-4 text-text-muted" />
              Mark as {unread ? "read" : "unread"}
            </button>
            <div role="none" onClick={() => setMenuOpen(false)}>
              <BookmarkFavoriteButton bookmark={bookmark} variant="menu" />
            </div>
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={copyLink}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Copy aria-hidden="true" className="size-4 text-text-muted" />
              Copy link
            </button>
            <div className="my-1 border-t border-border/60" />
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={archiveBookmark}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
            >
              <Archive aria-hidden="true" className="size-4 text-text-muted" />
              Archive
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openDialog("delete")}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-error hover:bg-error/5 focus-visible:outline-2 focus-visible:outline-error"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </button>
          </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <article
      className={`group relative flex min-w-0 overflow-visible rounded-2xl border border-border/60 bg-surface-elevated shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:border-border hover:shadow-md ${
        isGrid
          ? "flex-col rounded-3xl hover:-translate-y-0.5"
          : isCompact
            ? "items-center gap-2 rounded-xl px-2 py-1.5"
            : "items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4"
      } ${menuOpen ? "z-20" : isGrid ? "z-0 hover:z-10" : ""}`}
    >
      <Link
        href={detailHref}
        aria-label={`Open details for ${bookmark.title}`}
        className={`block shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          isGrid ? "w-full" : ""
        }`}
      >
        <BookmarkThumbnail
          icon={bookmark.icon}
          topic={bookmark.topic}
          artwork={bookmark.artwork}
          thumbnailUrl={bookmark.thumbnailUrl}
          variant={variant}
        />
      </Link>

      <div
        className={`flex min-w-0 flex-1 ${
          isGrid ? "flex-col p-4 sm:p-5" : "items-center gap-2 sm:gap-3"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-1">
            <h3 className="min-w-0 flex-1 text-sm font-semibold leading-5 tracking-[-0.02em] text-text sm:text-base">
              <Link
                href={detailHref}
                className="line-clamp-2 rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {bookmark.title}
              </Link>
            </h3>
            {isGrid && actions}
          </div>

          {!isCompact && (
            <p
              className={`mt-1 text-xs leading-5 text-text-muted sm:text-sm sm:leading-6 ${
                isGrid ? "line-clamp-2 min-h-10" : "line-clamp-1"
              }`}
            >
              {bookmark.description?.trim() || "No description available"}
            </p>
          )}

          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-[11px] font-medium text-text-muted transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-background text-[8px] font-semibold uppercase text-text-muted"
            >
              {bookmark.domain.slice(0, 2)}
            </span>
            <span className="truncate">{bookmark.domain}</span>
          </a>

          {!isCompact && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="max-w-full truncate rounded-full bg-background px-2 py-1 text-[10px] font-medium text-text-muted"
                >
                  #{tag.replace(/^#/, "")}
                </span>
              ))}
              {hiddenTagCount > 0 && (
                <span className="rounded-full bg-background px-2 py-1 text-[10px] font-medium text-text-muted">
                  +{hiddenTagCount}
                </span>
              )}
            </div>
          )}
        </div>

        {!isGrid && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {actions}
            {!isCompact && (
              <span className="hidden text-[10px] text-text-muted sm:block">
                Saved {bookmark.savedAt}
              </span>
            )}
          </div>
        )}

        {isGrid && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/50 pt-3">
            <span className="text-[10px] text-text-muted">
              Saved {bookmark.savedAt}
            </span>
            {unread && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                Unread
              </span>
            )}
          </div>
        )}
      </div>

      {dialogMode &&
        createPortal(
          <div
            className={`fixed inset-0 z-[100] flex overflow-y-auto bg-black/40 backdrop-blur-sm ${
              dialogMode === "move"
                ? "items-end p-0 sm:items-center sm:p-4"
                : "items-center justify-center p-4"
            }`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isPending) {
                setDialogMode(null);
              }
            }}
          >
            <section
              role={dialogMode === "delete" ? "alertdialog" : "dialog"}
              aria-modal="true"
              aria-labelledby={`bookmark-action-title-${bookmark.id}`}
              aria-describedby={
                dialogMode === "delete"
                  ? `bookmark-action-description-${bookmark.id}`
                  : undefined
              }
              className={`my-auto max-h-[calc(100dvh-2rem)] w-full max-w-[28rem] overflow-y-auto border border-border bg-surface-elevated p-5 shadow-xl sm:p-6 ${
                dialogMode === "move"
                  ? "max-h-[90dvh] max-w-none rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-[28rem] sm:rounded-3xl sm:pb-6"
                  : "rounded-3xl"
              }`}
            >
            {dialogMode === "move" && (
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />
            )}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id={`bookmark-action-title-${bookmark.id}`}
                  className={`text-lg font-semibold tracking-[-0.03em] ${
                    dialogMode === "delete" ? "text-error" : "text-text"
                  }`}
                >
                  {dialogMode === "delete"
                    ? "Delete bookmark?"
                    : dialogMode === "edit"
                      ? "Edit bookmark"
                      : dialogMode === "move"
                        ? "Move to collection"
                        : "Add tags"}
                </h2>
                {dialogMode === "delete" && (
                  <p
                    id={`bookmark-action-description-${bookmark.id}`}
                    className="mt-2 text-sm leading-6 text-text-muted"
                  >
                    Are you sure you want to delete{" "}
                    <span className="font-medium text-text">
                      &quot;{bookmark.title}&quot;
                    </span>
                    ? This action can&apos;t be undone.
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                disabled={isPending}
                onClick={() => setDialogMode(null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-background hover:text-text disabled:opacity-50"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>

            {dialogMode !== "delete" && (
              <form
                className="mt-5"
                onSubmit={submitDialog}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && dialogMode !== "edit") {
                    event.preventDefault();
                  }
                }}
              >
                {dialogMode === "edit" && (
                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-text">
                        Title
                      </span>
                      <input
                        autoFocus
                        required
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-text">
                        Description
                      </span>
                      <textarea
                        rows={3}
                        value={descriptionDraft}
                        onChange={(event) =>
                          setDescriptionDraft(event.target.value)
                        }
                        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-5 text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-text">
                        Collection
                      </span>
                      <select
                        value={collectionDraft}
                        onChange={(event) =>
                          setCollectionDraft(event.target.value)
                        }
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      >
                        {allCollections.map((collection) => (
                          <option key={collection} value={collection}>
                            {collection}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-text">
                        Tags
                      </span>
                      <input
                        value={selectedTags.join(", ")}
                        onChange={(event) =>
                          setSelectedTags(
                            uniqueTags(event.target.value
                              .split(",")
                            ),
                          )
                        }
                        placeholder="Next.js, Authentication"
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-text">
                        Intent
                      </span>
                      <select
                        value={intentDraft}
                        onChange={(event) =>
                          setIntentDraft(event.target.value as BookmarkIntent)
                        }
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      >
                        {intents.map((intent) => (
                          <option key={intent} value={intent}>
                            {intent}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-text">
                        Notes
                      </span>
                      <textarea
                        rows={3}
                        value={notesDraft}
                        onChange={(event) => setNotesDraft(event.target.value)}
                        placeholder="Add a personal note..."
                        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-5 text-text outline-none placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </label>
                  </div>
                )}

                {dialogMode === "move" && (
                  <div>
                    <label className="relative block">
                      <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
                      />
                      <input
                        autoFocus
                        value={collectionSearch}
                        onChange={(event) =>
                          setCollectionSearch(event.target.value)
                        }
                        placeholder="Search collections..."
                        className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-text outline-none placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </label>
                    <div className="mt-3 max-h-52 space-y-1 overflow-y-auto">
                      {filteredCollections.map((collection) => (
                        <label
                          key={collection}
                          className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-text transition-colors hover:bg-background"
                        >
                          <input
                            type="radio"
                            name={`collection-${bookmark.id}`}
                            value={collection}
                            checked={collectionDraft === collection}
                            onChange={() => setCollectionDraft(collection)}
                            className="size-4 accent-primary"
                          />
                          {collection}
                        </label>
                      ))}
                      {filteredCollections.length === 0 && (
                        <p className="px-3 py-4 text-center text-xs text-text-muted">
                          No collections match that search.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setShowCreateCollection((show) => !show)
                      }
                      className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      Create new collection
                    </button>
                    {showCreateCollection && (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={newCollectionName}
                          onChange={(event) =>
                            setNewCollectionName(event.target.value)
                          }
                          placeholder="Collection name"
                          aria-label="New collection name"
                          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const collection = createCollection(
                                newCollectionName,
                                allCollections,
                              );
                              setCollectionDraft(collection.name);
                              setNewCollectionName("");
                              setShowCreateCollection(false);
                              setActionError("");
                            } catch (error) {
                              setActionError(
                                error instanceof Error
                                  ? error.message
                                  : "We couldn't create this collection.",
                              );
                            }
                          }}
                          className="min-h-10 rounded-full border border-border px-3 text-xs font-medium text-text hover:bg-background"
                        >
                          Create
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {dialogMode === "tags" && (
                  <div>
                    <label className="relative block">
                      <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
                      />
                      <input
                        autoFocus
                        value={tagSearch}
                        onChange={(event) => setTagSearch(event.target.value)}
                        placeholder="Search or create tags..."
                        className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-text outline-none placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </label>
                    <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-border/60 bg-background p-1.5">
                      {filteredTags.map((tag) => {
                        const isSelected = selectedTags.some(
                          (selected) =>
                            selected.toLocaleLowerCase() ===
                            tag.toLocaleLowerCase(),
                        );
                        return (
                          <button
                            key={tag}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() =>
                              setSelectedTags((current) =>
                                isSelected
                                  ? current.filter(
                                      (item) =>
                                        item.toLocaleLowerCase() !==
                                        tag.toLocaleLowerCase(),
                                    )
                                  : uniqueTags([...current, tag]),
                              )
                            }
                            className="flex min-h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-xs text-text hover:bg-surface"
                          >
                            <span>#{tag}</span>
                            {isSelected && (
                              <Check
                                aria-hidden="true"
                                className="size-4 text-primary"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {tagSearch.trim() &&
                      !availableTags.some(
                        (tag) =>
                          tag.toLocaleLowerCase() ===
                          tagSearch.trim().replace(/^#/, "").toLowerCase(),
                      ) && (
                        <button
                          type="button"
                          onClick={() => {
                            const tag = tagSearch.trim().replace(/^#/, "");
                            if (
                              tag &&
                              !selectedTags.some(
                                (selected) =>
                                  selected.toLocaleLowerCase() ===
                                  tag.toLocaleLowerCase(),
                              )
                            ) {
                              setSelectedTags((current) =>
                                uniqueTags([...current, tag]),
                              );
                            }
                            setTagSearch("");
                          }}
                          className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-medium text-primary hover:bg-primary/10"
                        >
                          <Plus aria-hidden="true" className="size-4" />
                          Create &quot;{tagSearch.trim().replace(/^#/, "")}&quot;
                        </button>
                      )}
                    <div className="mt-4 border-t border-border/60 pt-3">
                      <p className="text-[11px] font-medium text-text-muted">
                        Selected
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedTags.length ? (
                          selectedTags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              aria-label={`Remove ${tag}`}
                              onClick={() =>
                                setSelectedTags((current) =>
                                  current.filter((item) => item !== tag),
                                )
                              }
                              className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                            >
                              #{tag} ×
                            </button>
                          ))
                        ) : (
                          <span className="text-xs text-text-muted">
                            No tags selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {actionError && (
                  <p className="mt-3 text-xs text-error" role="alert">
                    {actionError}
                  </p>
                )}
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setDialogMode(null)}
                    className="min-h-10 rounded-full border border-border px-4 text-sm font-medium text-text-muted hover:bg-background disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    status={
                      isPending
                        ? "loading"
                        : actionError
                          ? "error"
                          : "idle"
                    }
                  >
                    {isPending
                      ? "Saving..."
                      : actionError
                        ? "Try again"
                      : dialogMode === "move"
                        ? "Move bookmark"
                        : dialogMode === "tags"
                          ? "Save"
                          : "Save changes"}
                  </ActionButton>
                </div>
              </form>
            )}

            {dialogMode === "delete" && (
              <>
                {actionError && (
                  <p className="mt-3 text-xs text-error" role="alert">
                    {actionError}
                  </p>
                )}
                <form className="mt-6 flex justify-end gap-2" onSubmit={submitDialog}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setDialogMode(null)}
                    className="min-h-10 rounded-full border border-border px-4 text-sm font-medium text-text-muted hover:bg-background disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <ActionButton
                    type="submit"
                    variant="danger"
                    status={
                      isPending
                        ? "loading"
                        : actionError
                          ? "error"
                          : "idle"
                    }
                  >
                    {isPending
                      ? "Deleting..."
                      : actionError
                        ? "Retry delete"
                        : "Delete bookmark"}
                  </ActionButton>
                </form>
              </>
            )}
            </section>
          </div>,
          document.body,
        )}

      {feedback && (
        <p
          className="sr-only"
          role="status"
          aria-live="polite"
          onAnimationEnd={() => setFeedback("")}
        >
          {feedback}
        </p>
      )}
    </article>
  );
}
