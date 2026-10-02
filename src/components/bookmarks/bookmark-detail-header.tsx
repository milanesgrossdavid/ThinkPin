"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";

type BookmarkDetailHeaderProps = {
  title: string;
  collection: string;
  url?: string;
};

export function BookmarkDetailHeader({
  title,
  collection,
  url,
}: BookmarkDetailHeaderProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [menuOpen]);

  async function copyLink() {
    setMenuOpen(false);
    if (!url) {
      setFeedback("There is no link to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setFeedback("Link copied.");
    } catch {
      setFeedback("Couldn't copy the link. Open the bookmark to copy it.");
    }
  }

  return (
    <header className="mb-5 flex min-h-10 items-center justify-between gap-3 sm:mb-7">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link
          href="/library"
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          <span>Back</span>
        </Link>

        <nav
          aria-label="Breadcrumb"
          className="hidden min-w-0 items-center gap-1.5 text-sm md:flex"
        >
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-border"
          />
          <Link
            href="/library"
            className="shrink-0 text-text-muted transition-colors hover:text-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Library
          </Link>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-border"
          />
          <span className="shrink-0 text-text-muted">{collection}</span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-border"
          />
          <span
            aria-current="page"
            title={title}
            className="truncate font-medium text-text"
          >
            {title}
          </span>
        </nav>
      </div>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label="More bookmark actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-surface-elevated text-text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <MoreHorizontal aria-hidden="true" className="size-[18px]" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Bookmark actions"
            className="absolute right-0 top-12 z-30 w-48 rounded-2xl border border-border bg-surface-elevated p-1.5 shadow-xl"
          >
            {url && (
              <a
                role="menuitem"
                href={url}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-xs text-text transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
              >
                <ExternalLink
                  aria-hidden="true"
                  className="size-4 text-text-muted"
                />
                Open original
              </a>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={copyLink}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs text-text transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Copy aria-hidden="true" className="size-4 text-text-muted" />
              Copy link
            </button>
          </div>
        )}
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {feedback}
      </span>
    </header>
  );
}
