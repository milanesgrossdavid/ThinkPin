"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Clock3,
  ExternalLink,
  Pencil,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import {
  archiveLinkHealthBookmarkAction,
  requestBookmarkLinkCheckAction,
  updateBookmarkHealthUrlAction,
} from "../../app/actions/link-health";
import type {
  LibraryHealthBookmark,
  LibraryHealthStatus,
  LibraryHealthSummary,
} from "../../types/library-health";

const filterOptions: {
  id: LibraryHealthStatus;
  label: string;
  countKey: keyof LibraryHealthSummary;
  icon: typeof Activity;
}[] = [
  { id: "all", label: "All", countKey: "total", icon: Activity },
  { id: "healthy", label: "Healthy", countKey: "healthy", icon: ShieldCheck },
  { id: "redirect", label: "Redirects", countKey: "redirects", icon: RefreshCw },
  { id: "broken", label: "Broken", countKey: "broken", icon: ShieldX },
  { id: "timeout", label: "Timeouts", countKey: "timeouts", icon: Clock3 },
  { id: "blocked", label: "Blocked", countKey: "blocked", icon: ShieldAlert },
  { id: "unknown", label: "Unknown", countKey: "unknown", icon: CircleHelp },
];

function statusLabel(status: LibraryHealthStatus) {
  if (status === "all") return "All bookmarks";
  if (status === "redirect") return "Redirect";
  if (status === "timeout") return "Timeout";
  return `${status[0].toUpperCase()}${status.slice(1)}`;
}

function statusStyle(status: LibraryHealthBookmark["status"]) {
  switch (status) {
    case "healthy":
      return "border-success/30 bg-success/10 text-success";
    case "redirect":
      return "border-warning/40 bg-warning/10 text-text";
    case "broken":
      return "border-error/30 bg-error/10 text-error";
    case "timeout":
    case "blocked":
      return "border-warning/40 bg-warning/10 text-text";
    default:
      return "border-border bg-background text-text-muted";
  }
}

function formatDate(value: string | null) {
  if (!value) return "Never checked";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function HealthBookmarkCard({
  bookmark,
}: {
  bookmark: LibraryHealthBookmark;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(bookmark.url);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);

  function queueCheck() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await requestBookmarkLinkCheckAction(bookmark.bookmarkId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMessage(result.message ?? "Link check queued.");
      } catch {
        setError("Could not queue a link check. Please try again.");
      }
    });
  }

  function saveUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await updateBookmarkHealthUrlAction(
          bookmark.bookmarkId,
          url,
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setEditing(false);
        setMessage(result.message ?? "URL updated.");
      } catch {
        setError("Could not update this URL. Please try again.");
      }
    });
  }

  function archiveBookmark() {
    if (!window.confirm("Archive this bookmark?")) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await archiveLinkHealthBookmarkAction(
          bookmark.bookmarkId,
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setArchived(true);
      } catch {
        setError("Could not archive this bookmark. Please try again.");
      }
    });
  }

  if (archived) return null;

  return (
    <article className="rounded-2xl border border-border/70 bg-surface-elevated p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex max-w-full items-start gap-1.5 text-base font-semibold leading-snug text-text transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="line-clamp-2">{bookmark.title}</span>
            <ExternalLink
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 opacity-50 group-hover:opacity-100"
            />
          </a>
          <p className="mt-1 truncate text-sm text-text-muted">{bookmark.domain}</p>
          <p className="mt-3 break-all text-xs leading-relaxed text-text-muted">
            {bookmark.url}
          </p>
        </div>

        <span
          className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium ${statusStyle(bookmark.status)}`}
        >
          {statusLabel(bookmark.status)}
          {bookmark.httpStatus ? ` · ${bookmark.httpStatus}` : ""}
        </span>
      </div>

      {bookmark.error && (
        <p className="mt-3 text-sm text-text-muted">{bookmark.error}</p>
      )}
      {bookmark.redirectUrl && (
        <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
          <p className="font-medium text-text">This link now redirects.</p>
          <p className="mt-1 break-all text-text-muted">
            New destination: {bookmark.redirectUrl}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            The saved URL has not been changed.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
        <span>Checked {formatDate(bookmark.checkedAt)}</span>
        {bookmark.responseTime !== null && (
          <span>{bookmark.responseTime} ms</span>
        )}
      </div>

      {editing && (
        <form onSubmit={saveUrl} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`url-${bookmark.bookmarkId}`}>
            Updated bookmark URL
          </label>
          <input
            id={`url-${bookmark.bookmarkId}`}
            type="url"
            required
            maxLength={2048}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Check aria-hidden="true" className="size-4" />
            Save URL
          </button>
          <button
            type="button"
            onClick={() => {
              setUrl(bookmark.url);
              setEditing(false);
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-full px-3 text-sm text-text-muted hover:bg-background"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <button
          type="button"
          onClick={queueCheck}
          disabled={isPending}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" className="size-3.5" />
          Check now
        </button>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMessage(null);
              setEditing(true);
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-text-muted hover:bg-background hover:text-text"
          >
            <Pencil aria-hidden="true" className="size-3.5" />
            Edit URL
          </button>
        )}
        <button
          type="button"
          onClick={archiveBookmark}
          disabled={isPending}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-text-muted hover:bg-error/5 hover:text-error disabled:opacity-60"
        >
          <Archive aria-hidden="true" className="size-3.5" />
          Archive
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-3 text-sm text-primary" role="status">
          {message}
        </p>
      )}
    </article>
  );
}

export function LibraryHealth({
  summary,
  bookmarks,
  status,
  page,
  pageSize,
}: {
  summary: LibraryHealthSummary;
  bookmarks: LibraryHealthBookmark[];
  status: LibraryHealthStatus;
  page: number;
  pageSize: number;
}) {
  const totalMatching =
    bookmarks[0]?.totalMatching ??
    (status === "all" ? summary.total : summary[filterOptions.find((item) => item.id === status)?.countKey ?? "unknown"]);
  const pageCount = Math.ceil(totalMatching / pageSize);
  const start = totalMatching === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalMatching);

  return (
    <main className="min-h-svh bg-background pb-16">
      <header className="border-b border-border/60 px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        <div className="mx-auto max-w-container-xl">
          <Link
            href="/app"
            className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-text-muted hover:text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Dashboard
          </Link>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Your Internet Memory
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-text sm:text-4xl">
                Library Health
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
                Check which saved links still work. Link checks do not change
                your bookmarks or their content-processing status.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-surface-elevated px-4 py-3 text-sm text-text-muted">
              <span className="font-semibold tabular-nums text-text">
                {summary.total.toLocaleString()}
              </span>{" "}
              active bookmarks
            </div>
          </div>
        </div>
      </header>

      <section className="px-5 pt-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-container-xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {filterOptions.map((option) => {
              const Icon = option.icon;
              const active = status === option.id;
              return (
                <Link
                  key={option.id}
                  href={`/app/library-health?status=${option.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-2xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    active
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/70 bg-surface-elevated hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-text-muted sm:text-sm">
                      {option.label}
                    </span>
                    <Icon
                      aria-hidden="true"
                      className={`size-4 ${active ? "text-primary" : "text-text-muted"}`}
                    />
                  </div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-text">
                    {summary[option.countKey].toLocaleString()}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-text">
                {statusLabel(status)}
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                {totalMatching.toLocaleString()}{" "}
                {totalMatching === 1 ? "bookmark" : "bookmarks"}
                {status === "all" && summary.unknown > 0
                  ? ` · ${summary.unknown.toLocaleString()} not checked yet`
                  : ""}
              </p>
            </div>
            {pageCount > 1 && (
              <p className="text-sm text-text-muted">
                Showing {start}–{end} of {totalMatching.toLocaleString()}
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            {bookmarks.length ? (
              bookmarks.map((bookmark) => (
                <HealthBookmarkCard key={bookmark.bookmarkId} bookmark={bookmark} />
              ))
            ) : (
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-6 text-sm text-text-muted">
                {summary.total === 0
                  ? "Your saved links will appear here once you add bookmarks."
                  : `No ${status === "all" ? "" : `${statusLabel(status).toLowerCase()} `}bookmarks on this page.`}
              </div>
            )}
          </div>

          {pageCount > 1 && (
            <nav
              aria-label="Library Health pages"
              className="mt-6 flex items-center justify-between"
            >
              {page > 0 ? (
                <Link
                  href={`/app/library-health?status=${status}&page=${page - 1}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium text-text hover:bg-surface-elevated"
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-text-muted">
                Page {page + 1} of {pageCount}
              </span>
              {page + 1 < pageCount ? (
                <Link
                  href={`/app/library-health?status=${status}&page=${page + 1}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium text-text hover:bg-surface-elevated"
                >
                  Next
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}
