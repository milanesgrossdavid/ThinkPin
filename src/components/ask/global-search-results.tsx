"use client";

import { ArrowUpRight, BookmarkPlus, Check, Globe2 } from "lucide-react";
import { useState } from "react";
import { saveBookmarkAction } from "../../app/actions/bookmarks";
import { notifyBookmarkSaved } from "../../lib/bookmarks";
import type { GlobalSearchResult } from "../../lib/ask/web-search";
import { useAppToast } from "../feedback/AppToaster";

export function GlobalSearchResults({
  results,
}: {
  results: GlobalSearchResult[];
}) {
  const [savedUrls, setSavedUrls] = useState<Set<string>>(() => new Set());
  const [savingUrls, setSavingUrls] = useState<Set<string>>(() => new Set());
  const toast = useAppToast();

  async function saveResult(result: GlobalSearchResult) {
    if (savingUrls.has(result.url) || savedUrls.has(result.url)) return;
    setSavingUrls((current) => new Set(current).add(result.url));
    try {
      const saved = await saveBookmarkAction(result.url);
      if (!saved.ok) {
        toast.error("Couldn't save this bookmark", saved.error);
        return;
      }
      if (!saved.duplicate) notifyBookmarkSaved();
      setSavedUrls((current) => new Set(current).add(result.url));
      if (saved.duplicate) {
        toast.info("This bookmark is already saved");
      } else {
        toast.success("Bookmark saved");
      }
    } catch (error) {
      toast.error(
        "Couldn't save this bookmark",
        error instanceof Error ? error.message : "Try again in a moment.",
      );
    } finally {
      setSavingUrls((current) => {
        const next = new Set(current);
        next.delete(result.url);
        return next;
      });
    }
  }

  if (results.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-text-muted">
        No web results found. Try a different search.
      </p>
    );
  }

  return (
    <section aria-labelledby="global-search-results-heading" className="mt-8">
      <h2
        id="global-search-results-heading"
        className="mb-3 text-base font-semibold text-text"
      >
        Web results
        <span className="ml-2 text-sm font-normal text-text-muted">
          ({results.length})
        </span>
      </h2>
      <ul className="space-y-3">
        {results.map((result) => {
          const isSaving = savingUrls.has(result.url);
          const isSaved = savedUrls.has(result.url);
          return (
            <li key={result.url}>
              <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/60 bg-surface-elevated p-3 sm:gap-4 sm:p-4">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${result.title}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <Globe2 aria-hidden="true" className="size-5" />
                </a>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-text">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-primary"
                    >
                      {result.title}
                    </a>
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-muted">
                    {result.description}
                  </p>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-[11px] font-medium text-text-muted hover:text-primary"
                  >
                    {result.domain}
                    <ArrowUpRight aria-hidden="true" className="size-3" />
                  </a>
                </div>
                <button
                  type="button"
                  disabled={isSaving || isSaved}
                  onClick={() => void saveResult(result)}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={isSaved ? "Saved to library" : "Save to library"}
                >
                  {isSaved ? (
                    <Check aria-hidden="true" className="size-3.5" />
                  ) : (
                    <BookmarkPlus aria-hidden="true" className="size-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {isSaving ? "Saving…" : isSaved ? "Saved" : "Save"}
                  </span>
                </button>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
