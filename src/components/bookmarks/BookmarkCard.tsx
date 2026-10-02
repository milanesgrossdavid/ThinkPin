"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Archive,
  Check,
  Copy,
  ExternalLink,
  Heart,
  MoreHorizontal,
  Pencil,
  Tag,
} from "lucide-react";
import { BookmarkThumbnail } from "./BookmarkThumbnail";
import type { Bookmark, BookmarkView } from "./types";

type BookmarkCardProps = {
  bookmark: Bookmark;
  variant?: BookmarkView;
  onFavoriteChange?: (bookmarkId: string, favorite: boolean) => void;
  onUnreadChange?: (bookmarkId: string, unread: boolean) => void;
};

export function BookmarkCard({
  bookmark,
  variant = "grid",
  onFavoriteChange,
  onUnreadChange,
}: BookmarkCardProps) {
  const isGrid = variant === "grid";
  const isCompact = variant === "compact";
  const [favorite, setFavorite] = useState(bookmark.favorite ?? false);
  const [unread, setUnread] = useState(bookmark.unread ?? false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const tags = bookmark.tags ?? [bookmark.topic, bookmark.subtopic];
  const visibleTags = tags.slice(0, 3);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
  const detailHref = `/library/${encodeURIComponent(bookmark.id)}`;

  function toggleFavorite() {
    const nextFavorite = !favorite;
    setFavorite(nextFavorite);
    onFavoriteChange?.(bookmark.id, nextFavorite);
    setFeedback(
      nextFavorite ? "Added to favorites in this preview." : "Removed from favorites in this preview.",
    );
  }

  function toggleUnread() {
    const nextUnread = !unread;
    setUnread(nextUnread);
    onUnreadChange?.(bookmark.id, nextUnread);
    setMenuOpen(false);
    setFeedback(nextUnread ? "Marked as unread." : "Marked as read.");
  }

  async function copyLink() {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(bookmark.url);
      setFeedback("Link copied.");
    } catch {
      setFeedback("Couldn't copy the link. Open the bookmark to copy it.");
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
      <button
        type="button"
        aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={favorite}
        onClick={toggleFavorite}
        className={`flex size-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          favorite
            ? "text-rose-500 hover:bg-rose-500/10"
            : "text-text-muted hover:bg-background hover:text-rose-500"
        }`}
      >
        <Heart
          aria-hidden="true"
          className={`size-[18px] ${favorite ? "fill-current" : ""}`}
        />
      </button>
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
            role="menu"
            aria-label={`Actions for ${bookmark.title}`}
            className="absolute right-0 top-10 z-20 w-52 rounded-2xl border border-border bg-surface-elevated p-1.5 shadow-xl"
          >
            <a
              role="menuitem"
              href={bookmark.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ExternalLink aria-hidden="true" className="size-4 text-text-muted" />
              Open original
            </a>
            <Link
              role="menuitem"
              href={detailHref}
              onClick={() => setMenuOpen(false)}
              className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Pencil aria-hidden="true" className="size-4 text-text-muted" />
              Open details
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={toggleUnread}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Check aria-hidden="true" className="size-4 text-text-muted" />
              Mark as {unread ? "read" : "unread"}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                toggleFavorite();
                setMenuOpen(false);
              }}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Heart
                aria-hidden="true"
                className={`size-4 ${favorite ? "fill-current text-rose-500" : "text-text-muted"}`}
              />
              {favorite ? "Remove from favorites" : "Add to favorites"}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={copyLink}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Copy aria-hidden="true" className="size-4 text-text-muted" />
              Copy link
            </button>
            <div className="my-1 border-t border-border/60" />
            {[
              { label: "Edit", icon: Pencil },
              { label: "Move to collection", icon: Archive },
              { label: "Add tags", icon: Tag },
              { label: "Archive", icon: Archive },
              { label: "Delete", icon: Archive },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                disabled
                title="Coming soon"
                className="flex min-h-10 w-full cursor-not-allowed items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text-muted/60"
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
                <span className="ml-auto text-[10px]">Soon</span>
              </button>
            ))}
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
