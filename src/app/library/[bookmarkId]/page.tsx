import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Heart, Sparkles } from "lucide-react";
import { BookmarkThumbnail } from "../../../components/bookmarks/BookmarkThumbnail";
import { SavedBookmarkDetail } from "../../../components/bookmarks/saved-bookmark-detail";
import { mockBookmarks } from "../../../components/bookmarks/mock-bookmarks";

type BookmarkDetailPageProps = PageProps<"/library/[bookmarkId]">;

export async function generateMetadata({
  params,
}: BookmarkDetailPageProps): Promise<Metadata> {
  const { bookmarkId } = await params;
  const bookmark = mockBookmarks.find((item) => item.id === bookmarkId);

  return {
    title: bookmark ? `${bookmark.title} | ThinkPin` : "Bookmark | ThinkPin",
  };
}

export default async function BookmarkDetailPage({
  params,
}: BookmarkDetailPageProps) {
  const { bookmarkId } = await params;
  const bookmark = mockBookmarks.find((item) => item.id === bookmarkId);

  if (!bookmark) {
    return <SavedBookmarkDetail bookmarkId={bookmarkId} />;
  }

  return (
    <main className="min-h-svh bg-background px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/library"
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Your Library
        </Link>

        <article className="mt-5 overflow-hidden rounded-3xl border border-border/60 bg-surface-elevated shadow-sm sm:mt-7">
          <BookmarkThumbnail
            icon={bookmark.icon}
            topic={bookmark.topic}
            artwork={bookmark.artwork}
            thumbnailUrl={bookmark.thumbnailUrl}
          />
          <div className="p-5 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {bookmark.unread && (
                  <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Unread
                  </p>
                )}
                <h1 className="text-2xl font-semibold leading-tight tracking-[-0.04em] text-text sm:text-4xl">
                  {bookmark.title}
                </h1>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-rose-500">
                <Heart
                  aria-hidden="true"
                  className={`size-[18px] ${bookmark.favorite ? "fill-current" : ""}`}
                />
                <span className="sr-only">
                  {bookmark.favorite ? "Favorite" : "Not a favorite"}
                </span>
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-text-muted sm:text-base">
              {bookmark.description || "No description available"}
            </p>

            <a
              href={bookmark.url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex max-w-full items-center gap-2 truncate text-sm font-medium text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-[9px] font-semibold uppercase text-text-muted">
                {bookmark.domain.slice(0, 2)}
              </span>
              <span className="truncate">{bookmark.domain}</span>
            </a>

            <div className="mt-5 flex flex-wrap gap-2">
              {(bookmark.tags ?? [bookmark.topic, bookmark.subtopic]).map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-text-muted"
                  >
                    #{tag.replace(/^#/, "")}
                  </span>
                ),
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-5">
              <p className="text-xs text-text-muted">
                Saved {bookmark.savedAt}
              </p>
              <a
                href={bookmark.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Open original
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            </div>
          </div>
        </article>

        <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-text-muted">
          <Sparkles aria-hidden="true" className="size-4 shrink-0 text-primary" />
          Bookmark details are mock data in this preview.
        </p>
      </div>
    </main>
  );
}
