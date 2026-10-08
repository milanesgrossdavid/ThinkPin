"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  Check,
  Clock3,
  FileDiff,
  LoaderCircle,
} from "lucide-react";
import {
  captureBookmarkArchiveAction,
  compareBookmarkSnapshotsAction,
  getBookmarkArchiveHistoryAction,
} from "../../app/actions/web-archive";
import type { WebSnapshot } from "../../types/web-snapshot";
import type { TextDiffResult } from "../../lib/web-archive/text-diff";

type SnapshotComparison = {
  older: {
    id: string;
    pageTitle: string;
    capturedAt: string;
  };
  newer: {
    id: string;
    pageTitle: string;
    capturedAt: string;
  };
  diff: TextDiffResult;
};

function formatCapturedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function WebArchivePanel({ bookmarkId }: { bookmarkId: string }) {
  const [snapshots, setSnapshots] = useState<WebSnapshot[]>([]);
  const [olderSnapshotId, setOlderSnapshotId] = useState("");
  const [newerSnapshotId, setNewerSnapshotId] = useState("");
  const [loading, setLoading] = useState(true);
  const [capturing, startCapture] = useTransition();
  const [comparing, startCompare] = useTransition();
  const [comparison, setComparison] = useState<SnapshotComparison | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    const result = await getBookmarkArchiveHistoryAction(bookmarkId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSnapshots(result.snapshots);
    if (result.snapshots.length >= 2) {
      setOlderSnapshotId(result.snapshots.at(-1)?.id ?? "");
      setNewerSnapshotId(result.snapshots[0].id);
    }
    setError(null);
  }

  useEffect(() => {
    let active = true;
    getBookmarkArchiveHistoryAction(bookmarkId)
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSnapshots(result.snapshots);
        if (result.snapshots.length >= 2) {
          setOlderSnapshotId(result.snapshots.at(-1)?.id ?? "");
          setNewerSnapshotId(result.snapshots[0].id);
        }
      })
      .catch(() => {
        if (active) setError("Could not load snapshot history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookmarkId]);

  function capture() {
    setError(null);
    setMessage(null);
    setComparison(null);
    startCapture(async () => {
      try {
        const result = await captureBookmarkArchiveAction(bookmarkId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMessage(
          result.status === "captured"
            ? "Archived a new version of this page."
            : "The page has not changed since the last snapshot.",
        );
        await loadHistory();
      } catch {
        setError("Could not archive this page. Please try again.");
      }
    });
  }

  function compare(fromId = olderSnapshotId, toId = newerSnapshotId) {
    if (!fromId || !toId || fromId === toId) {
      setError("Choose two different snapshots to compare.");
      return;
    }
    setError(null);
    setMessage(null);
    startCompare(async () => {
      try {
        const result = await compareBookmarkSnapshotsAction(
          bookmarkId,
          fromId,
          toId,
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setComparison(result);
      } catch {
        setError("Could not compare these versions. Please try again.");
      }
    });
  }

  return (
    <section aria-labelledby={`web-archive-title-${bookmarkId}`} className="py-5 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id={`web-archive-title-${bookmarkId}`}
            className="text-sm font-semibold text-text"
          >
            Web Archive
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-text-muted">
            Keep a safe copy of the readable page and its HTML. A new version
            is stored only when the readable content changes. Screenshots
            aren&apos;t captured in this version.
          </p>
        </div>
        <button
          type="button"
          onClick={capture}
          disabled={capturing}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {capturing ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Archive aria-hidden="true" className="size-4" />
          )}
          {capturing ? "Capturing…" : "Archive this page"}
        </button>
      </div>

      {message && (
        <p className="mt-3 text-sm text-success" role="status">
          <Check aria-hidden="true" className="mr-1 inline size-4" />
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-error" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Snapshot history
        </h3>
        {loading ? (
          <p className="mt-3 text-sm text-text-muted">Loading snapshots…</p>
        ) : snapshots.length ? (
          <ol className="mt-3 space-y-3">
            {snapshots.map((snapshot, index) => (
              <li
                key={snapshot.id}
                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-full ${
                      index === 0
                        ? "bg-primary/10 text-primary"
                        : "bg-surface text-text-muted"
                    }`}
                  >
                    {index === 0 ? (
                      <Archive className="size-3.5" />
                    ) : (
                      <Clock3 className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {index === 0 ? "Latest version" : snapshot.pageTitle}
                      {index === snapshots.length - 1 && snapshots.length > 1
                        ? " · Original capture"
                        : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatCapturedAt(snapshot.capturedAt)} ·{" "}
                      {snapshot.wordCount.toLocaleString()} words
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 pl-9 sm:pl-0">
                  <Link
                    href={`/app/archive/${snapshot.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-text hover:border-primary/40 hover:text-primary"
                  >
                    View archived
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-text-muted">
            No archived versions yet. Archive this page to preserve its current
            readable content.
          </p>
        )}
      </div>

      {snapshots.length >= 2 && (
        <div className="mt-5 rounded-2xl border border-border/70 bg-background p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <FileDiff aria-hidden="true" className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-text">Time Machine</h3>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            See how the readable page changed between any two captures.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
            <label className="grid gap-1.5 text-xs font-medium text-text-muted">
              Earlier version
              <select
                value={olderSnapshotId}
                onChange={(event) => setOlderSnapshotId(event.target.value)}
                className="min-h-10 rounded-xl border border-border bg-surface-elevated px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {snapshots
                  .filter(
                    (snapshot) =>
                      snapshot.id !== newerSnapshotId &&
                      snapshots.findIndex((item) => item.id === snapshot.id) >
                        snapshots.findIndex(
                          (item) => item.id === newerSnapshotId,
                        ),
                  )
                  .map((snapshot) => (
                    <option key={snapshot.id} value={snapshot.id}>
                      {formatCapturedAt(snapshot.capturedAt)}
                    </option>
                  ))}
              </select>
            </label>
            <span className="hidden pb-3 text-xs text-text-muted sm:block">
              →
            </span>
            <label className="grid gap-1.5 text-xs font-medium text-text-muted">
              Later version
              <select
                value={newerSnapshotId}
                onChange={(event) => setNewerSnapshotId(event.target.value)}
                className="min-h-10 rounded-xl border border-border bg-surface-elevated px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {snapshots
                  .filter(
                    (snapshot) =>
                      snapshot.id !== olderSnapshotId &&
                      snapshots.findIndex((item) => item.id === snapshot.id) <
                        snapshots.findIndex(
                          (item) => item.id === olderSnapshotId,
                        ),
                  )
                  .map((snapshot) => (
                    <option key={snapshot.id} value={snapshot.id}>
                      {formatCapturedAt(snapshot.capturedAt)}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              disabled={
                comparing ||
                !olderSnapshotId ||
                !newerSnapshotId ||
                olderSnapshotId === newerSnapshotId
              }
              onClick={() => compare()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {comparing ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <FileDiff aria-hidden="true" className="size-4" />
              )}
              Compare
            </button>
          </div>
        </div>
      )}

      {comparison && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text">Time Machine</h3>
              <p className="mt-1 text-xs text-text-muted">
                {formatCapturedAt(comparison.older.capturedAt)} →{" "}
                {formatCapturedAt(comparison.newer.capturedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setComparison(null)}
              className="min-h-8 rounded-full px-3 text-xs font-medium text-text-muted hover:bg-background"
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              {
                label: "Added",
                count: comparison.diff.added.length,
                style: "text-success",
              },
              {
                label: "Removed",
                count: comparison.diff.removed.length,
                style: "text-error",
              },
              {
                label: "Changed",
                count: comparison.diff.changed.length,
                style: "text-primary",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/70 bg-background p-3"
              >
                <p className="text-xs text-text-muted">{item.label}</p>
                <p className={`mt-1 text-xl font-semibold ${item.style}`}>
                  {item.count}
                </p>
              </div>
            ))}
          </div>
          {!comparison.diff.hasChanges ? (
            <p className="mt-3 rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-text-muted">
              The readable content is unchanged between these versions.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {comparison.diff.changed.length > 0 && (
                <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <h4 className="text-sm font-semibold text-primary">
                    Changed
                  </h4>
                  <ul className="mt-2 space-y-3">
                    {comparison.diff.changed.map((change, index) =>
                      change.type === "changed" ? (
                        <li key={`change-${index}`} className="text-sm">
                          <p className="rounded-lg bg-error/5 px-3 py-2 leading-relaxed text-text-muted line-through decoration-error/60">
                            {change.before}
                          </p>
                          <p className="mt-1 rounded-lg bg-success/10 px-3 py-2 leading-relaxed text-text">
                            {change.after}
                          </p>
                        </li>
                      ) : null,
                    )}
                  </ul>
                </section>
              )}
              {comparison.diff.added.length > 0 && (
                <section className="rounded-xl border border-success/20 bg-success/5 p-4">
                  <h4 className="text-sm font-semibold text-success">Added</h4>
                  <ul className="mt-2 space-y-2">
                    {comparison.diff.added.map((change, index) =>
                      change.type === "added" ? (
                        <li
                          key={`added-${index}`}
                          className="rounded-lg bg-surface-elevated px-3 py-2 text-sm leading-relaxed text-text"
                        >
                          + {change.text}
                        </li>
                      ) : null,
                    )}
                  </ul>
                </section>
              )}
              {comparison.diff.removed.length > 0 && (
                <section className="rounded-xl border border-error/20 bg-error/5 p-4">
                  <h4 className="text-sm font-semibold text-error">Removed</h4>
                  <ul className="mt-2 space-y-2">
                    {comparison.diff.removed.map((change, index) =>
                      change.type === "removed" ? (
                        <li
                          key={`removed-${index}`}
                          className="rounded-lg bg-surface-elevated px-3 py-2 text-sm leading-relaxed text-text-muted"
                        >
                          − {change.text}
                        </li>
                      ) : null,
                    )}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
