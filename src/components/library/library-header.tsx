"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Folder, Plus, Upload } from "lucide-react";
import { requestSmartSave } from "../../lib/save-dialog";
import { CreditBalance } from "../billing/credit-balance";
import { DashboardAccountButton } from "../dashboard/dashboard-account-button";
import {
  getBookmarksSnapshot,
  getServerBookmarksSnapshot,
  loadSavedBookmarks,
  subscribeToBookmarks,
} from "../../lib/bookmarks";

type LibraryHeaderProps = {
  title?: string;
};

export function LibraryHeader({
  title = "Your Library",
}: LibraryHeaderProps) {
  const bookmarksSnapshot = useSyncExternalStore(
    subscribeToBookmarks,
    getBookmarksSnapshot,
    getServerBookmarksSnapshot,
  );
  const itemCount = useMemo(() => {
    try {
      const bookmarks = loadSavedBookmarks(bookmarksSnapshot);
      return title === "Favorites"
        ? bookmarks.filter((bookmark) => bookmark.favorite).length
        : bookmarks.length;
    } catch {
      return 0;
    }
  }, [bookmarksSnapshot, title]);

  return (
    <header className="border-b border-border/60 bg-background px-5 pb-7 pt-4 sm:px-8 sm:pb-9 sm:pt-5 lg:px-12">
      <div className="mx-auto mb-7 flex max-w-container-xl items-center justify-end gap-2 sm:mb-8">
        <CreditBalance />
        <Link
          href="/app/billing"
          className="rounded-full px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Plan &amp; billing
        </Link>
        <DashboardAccountButton />
      </div>
      <div className="mx-auto flex max-w-container-xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <p data-page-eyebrow className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Your Internet Memory
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 data-page-title className="text-4xl font-semibold leading-[1.05] tracking-[-0.055em] text-text sm:text-5xl">
              {title}
            </h1>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface-elevated px-3 py-1.5 text-xs font-medium text-text-muted">
              <span className="tabular-nums text-text">
                {itemCount.toLocaleString()}
              </span>
              {title === "Favorites" ? "favorites" : "saved"}
            </p>
          </div>
          <p data-page-summary className="mt-3 max-w-xl text-sm leading-6 text-text-muted sm:text-base">
            {title === "Favorites"
              ? "Your favorite links, ready to open again. Save one from your bookmarks."
              : "Keep useful links together—save, search, and return to them when you need them."}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            data-primary-action
            onClick={() => requestSmartSave()}
            className="order-first inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/15 transition-[background-color,transform,box-shadow] hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:order-last sm:w-auto"
          >
            <Plus aria-hidden="true" className="size-5" />
            <span>Save a link</span>
          </button>
          <div className="flex items-center justify-center gap-1 sm:mr-2">
            <Link
              href="/app/import"
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Upload aria-hidden="true" className="size-4" />
              <span>Import</span>
            </Link>
            <Link
              href="/app/collections"
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Folder aria-hidden="true" className="size-4" />
              <span>Collections</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
