"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CircleCheck,
  FileUp,
  Folder,
  LoaderCircle,
  RotateCw,
  Upload,
} from "lucide-react";
import { trackProductEvent } from "../../lib/analytics";

type ImportCounts = {
  pending: number;
  duplicate_file: number;
  duplicate_library: number;
  invalid: number;
  imported: number;
  failed: number;
};

type PreviewItem = {
  position: number;
  title: string;
  url: string | null;
  folderPath?: string[];
  folder_path?: string[];
  status: string;
  error: string | null;
};

type ImportJob = {
  id: string;
  status: "review" | "processing" | "completed" | "completed_with_errors";
  total_count: number;
  created_at: string;
  counts: ImportCounts;
};

type ImportSnapshot = {
  job: ImportJob;
  folders?: string[];
  preview: PreviewItem[];
  errors?: PreviewItem[];
};

const DEMO_SNAPSHOT: ImportSnapshot = {
  job: {
    id: "demo-import",
    status: "review",
    total_count: 8,
    created_at: "2026-01-01T00:00:00.000Z",
    counts: {
      pending: 4,
      duplicate_file: 1,
      duplicate_library: 2,
      invalid: 1,
      imported: 0,
      failed: 0,
    },
  },
  folders: ["Bookmarks Bar / Design", "Bookmarks Bar / Learn", "Read later"],
  preview: [
    {
      position: 0,
      title: "Designing better interfaces",
      url: "https://example.com/design-systems",
      folderPath: ["Bookmarks Bar", "Design"],
      status: "pending",
      error: null,
    },
    {
      position: 1,
      title: "React documentation",
      url: "https://react.dev/learn",
      folderPath: ["Bookmarks Bar", "Learn"],
      status: "duplicate_library",
      error: null,
    },
    {
      position: 2,
      title: "A useful product article",
      url: "https://example.com/product",
      folderPath: ["Read later"],
      status: "pending",
      error: null,
    },
    {
      position: 3,
      title: "Repeated export entry",
      url: "https://example.com/design-systems",
      folderPath: ["Bookmarks Bar", "Design"],
      status: "duplicate_file",
      error: null,
    },
    {
      position: 4,
      title: "Learning JavaScript",
      url: "https://javascript.info/",
      folderPath: ["Bookmarks Bar", "Learn"],
      status: "pending",
      error: null,
    },
    {
      position: 5,
      title: "Not a web link",
      url: null,
      folderPath: ["Other bookmarks"],
      status: "invalid",
      error: "Only HTTP and HTTPS URLs are allowed.",
    },
    {
      position: 6,
      title: "CSS layout guide",
      url: "https://example.com/css-layout",
      folderPath: ["Read later"],
      status: "pending",
      error: null,
    },
    {
      position: 7,
      title: "MDN Web Docs",
      url: "https://developer.mozilla.org/",
      folderPath: ["Bookmarks Bar", "Learn"],
      status: "duplicate_library",
      error: null,
    },
  ],
};

function errorMessage(payload: unknown, fallback: string) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

function StatusPill({ status }: { status: string }) {
  const label =
    status === "pending"
      ? "Ready to import"
      : status === "duplicate_file"
        ? "Repeated in file"
        : status === "duplicate_library"
          ? "Already in library"
          : status === "invalid"
            ? "Needs attention"
            : status === "imported"
              ? "Imported"
              : status === "failed"
                ? "Could not import"
                : status;
  const style =
    status === "pending" || status === "imported"
      ? "bg-success/10 text-text"
      : status === "invalid" || status === "failed"
        ? "bg-error/10 text-text"
        : "bg-surface text-text-muted";
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${style}`}>
      {label}
    </span>
  );
}

export function BrowserBookmarkImport({
  initialJobId,
  demoMode = false,
}: {
  initialJobId: string | null;
  demoMode?: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [snapshot, setSnapshot] = useState<ImportSnapshot | null>(
    demoMode ? DEMO_SNAPSHOT : null,
  );
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const loadJob = useCallback(async (jobId: string) => {
    const response = await fetch(`/api/imports/bookmarks/${encodeURIComponent(jobId)}`, {
      cache: "no-store",
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new Error(errorMessage(payload, "Could not load the import."));
    }
    setSnapshot(payload as ImportSnapshot);
  }, []);

  const processImport = useCallback(
    async (jobId: string, retryFailed = false) => {
      setBusy(true);
      setError("");
      try {
        if (demoMode) {
          for (let imported = 1; imported <= 4; imported += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 650));
            setSnapshot((current) => {
              if (!current) return current;
              let markedFirstPending = false;
              return {
                ...current,
                job: {
                  ...current.job,
                  status: imported === 4 ? "completed" : "processing",
                  counts: {
                    ...current.job.counts,
                    pending: 4 - imported,
                    imported,
                  },
                },
                preview: current.preview.map((item) => {
                  if (item.status !== "pending" || markedFirstPending) return item;
                  markedFirstPending = true;
                  return { ...item, status: "imported" };
                }),
              };
            });
          }
          return;
        }
        let hasMore = true;
        let retry = retryFailed;
        let batches = 0;
        while (hasMore) {
          batches += 1;
          if (batches > 2_000) {
            throw new Error("The import is taking longer than expected. Resume it to continue.");
          }
          const response = await fetch(
            `/api/imports/bookmarks/${encodeURIComponent(jobId)}/process`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(retry ? { retryFailed: true } : {}),
            },
          );
          retry = false;
          const payload: unknown = await response.json();
          if (!response.ok) {
            throw new Error(errorMessage(payload, "The next import batch failed."));
          }
          hasMore =
            typeof payload === "object" &&
            payload !== null &&
            "hasMore" in payload &&
            payload.hasMore === true;
          await loadJob(jobId);
        }
        await loadJob(jobId);
        trackProductEvent("import_completed");
      } catch (cause) {
        trackProductEvent("import_failed");
        setError(
          cause instanceof Error
            ? cause.message
            : "The import could not continue. You can safely resume it.",
        );
        try {
          await loadJob(jobId);
        } catch (statusError) {
          console.error("Could not refresh bookmark import status.", statusError);
        }
      } finally {
        setBusy(false);
      }
    },
    [demoMode, loadJob],
  );

  useEffect(() => {
    if (demoMode) return;
    if (!initialJobId) return;
    const jobId = initialJobId;
    let active = true;
    async function fetchImport() {
      try {
        const response = await fetch(
          `/api/imports/bookmarks/${encodeURIComponent(jobId)}`,
          { cache: "no-store" },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(errorMessage(payload, "Could not load the import."));
        }
        if (active) setSnapshot(payload as ImportSnapshot);
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Could not load the import.",
          );
        }
      }
    }
    void fetchImport();
    return () => {
      active = false;
    };
  }, [demoMode, initialJobId]);

  async function createPreview(selectedFile: File) {
    setBusy(true);
    setError("");
    setSnapshot(null);
    try {
      const body = new FormData();
      body.set("file", selectedFile);
      const response = await fetch("/api/imports/bookmarks", {
        method: "POST",
        body,
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(errorMessage(payload, "The bookmark file could not be read."));
      }
      const result = payload as ImportSnapshot;
      setSnapshot(result);
      trackProductEvent("import_started");
      router.replace(`/app/import?job=${encodeURIComponent(result.job.id)}`);
    } catch (cause) {
      trackProductEvent("import_failed");
      setError(
        cause instanceof Error
          ? cause.message
          : "The bookmark file could not be prepared.",
      );
    } finally {
      setBusy(false);
    }
  }

  function selectFile(selected: File | undefined) {
    if (!selected) return;
    setFile(selected);
    setSnapshot(null);
    setError("");
  }

  function startOver() {
    setFile(null);
    setSnapshot(null);
    setError("");
    router.replace("/app/import");
    if (fileInput.current) fileInput.current.value = "";
  }

  const counts = snapshot?.job.counts;
  const completed =
    snapshot?.job.status === "completed" ||
    snapshot?.job.status === "completed_with_errors";
  const progressPercent = snapshot
    ? Math.round(
        ((snapshot.job.counts.imported +
          snapshot.job.counts.duplicate_file +
          snapshot.job.counts.duplicate_library +
          snapshot.job.counts.invalid +
          snapshot.job.counts.failed) /
          snapshot.job.total_count) *
          100,
      )
    : 0;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href="/app/bookmarks"
        className="inline-flex items-center gap-2 rounded-full text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to your library
      </Link>

      <header className="mt-8 max-w-2xl">
        <p data-page-eyebrow className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Bring your saved links with you
        </p>
        <h1 data-page-title className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-text sm:text-4xl">
          Import your bookmarks
        </h1>
        <p data-page-summary className="mt-3 text-sm leading-6 text-text-muted sm:text-base">
          Bring links from Chrome, Firefox, Safari, or Edge into your ThinkPin
          library. Review the preview, skip duplicates, then import in resumable
          batches.
        </p>
        {!demoMode && (
          <Link
            href="/app/import?demo=1"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <CircleCheck aria-hidden="true" className="size-4" />
            See an interactive demo
          </Link>
        )}
      </header>

      <section className="mt-8 rounded-3xl border border-border/70 bg-surface-elevated p-5 shadow-sm sm:p-8">
        {demoMode && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-text">
                Interactive demo · sample data only
              </p>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                This preview is illustrative. Confirming it only animates the
                experience; it does not upload a file or change your library.
              </p>
            </div>
            <Link
              href="/app/import"
              className="ml-auto shrink-0 text-xs font-medium text-primary hover:underline"
            >
              Exit demo
            </Link>
          </div>
        )}
        {!snapshot && (
          <>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                selectFile(event.dataTransfer.files[0]);
              }}
              className={`rounded-2xl border border-dashed p-7 text-center transition-colors sm:p-10 ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background/70"
              }`}
            >
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileUp aria-hidden="true" className="size-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold tracking-tight text-text">
                Drop your bookmark export here
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                HTML or HTM · up to 5 MB · maximum 10,000 links
              </p>
              <input
                ref={fileInput}
                type="file"
                accept=".html,.htm,text/html"
                className="sr-only"
                onChange={(event) => selectFile(event.currentTarget.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface-elevated px-5 text-sm font-medium text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Upload aria-hidden="true" className="size-4" />
                Choose an HTML file
              </button>
            </div>

            {file && (
              <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl border border-border/70 bg-background p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
                    <FileUp aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{file.name}</p>
                    <p className="text-xs text-text-muted">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void createPreview(file)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
                >
                  {busy ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Check aria-hidden="true" className="size-4" />
                  )}
                  {busy ? "Checking file…" : "Review import"}
                </button>
              </div>
            )}
          </>
        )}

        {snapshot && (
          <div>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  {completed
                    ? demoMode
                      ? "Demo finished"
                      : "Import finished"
                    : "Review before importing"}
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-text">
                  {completed
                    ? demoMode
                      ? "That’s how the import works"
                      : snapshot.job.status === "completed_with_errors"
                        ? "Some links need another try"
                        : "Your library is ready"
                    : snapshot.job.status === "processing"
                        ? "Import in progress"
                      : `${snapshot.job.total_count.toLocaleString()} bookmarks found`}
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-text-muted">
                  {completed
                    ? demoMode
                      ? "That was the complete flow. No file was uploaded and your library was not changed."
                      : "Your imported links are available in your library. Enrichment continues separately."
                    : "Duplicates will be left untouched. Browser folders are kept as collections where possible."}
                </p>
              </div>
              {snapshot.job.status === "review" && !demoMode && (
                <button
                  type="button"
                  onClick={startOver}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text"
                >
                  Choose another file
                </button>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <CountCard label="New" value={counts?.pending ?? 0} />
              <CountCard
                label="Repeated in file"
                value={counts?.duplicate_file ?? 0}
              />
              <CountCard
                label="Already in library"
                value={counts?.duplicate_library ?? 0}
              />
              <CountCard label="Need attention" value={counts?.invalid ?? 0} />
              <CountCard
                label="Imported"
                value={counts?.imported ?? 0}
                success
              />
            </div>

            {(snapshot.job.status === "processing" || completed) && (
              <div className="mt-5" aria-label={`Import progress: ${progressPercent}%`}>
                <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
                  <span>{demoMode ? "Demo progress" : "Import progress"}</span>
                  <span className="tabular-nums">{progressPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {(snapshot.folders?.length ?? 0) > 0 && (
              <div className="mt-5 rounded-2xl border border-border/70 bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-text">
                  <Folder aria-hidden="true" className="size-4 text-primary" />
                  {snapshot.folders?.length.toLocaleString()} folders detected
                </div>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  Folder paths become collection names. Deep paths are shortened
                  from the beginning if a collection name exceeds 100 characters.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {snapshot.folders?.slice(0, 8).map((folder) => (
                    <span
                      key={folder}
                      className="max-w-full truncate rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-text-muted"
                    >
                      {folder}
                    </span>
                  ))}
                  {(snapshot.folders?.length ?? 0) > 8 && (
                    <span className="rounded-full bg-surface px-3 py-1 text-xs text-text-muted">
                      +{(snapshot.folders?.length ?? 0) - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 overflow-hidden rounded-2xl border border-border/70">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-background px-4 py-3">
                <h3 className="text-sm font-semibold text-text">File preview</h3>
                <span className="text-xs text-text-muted">
                  First {Math.min(snapshot.preview.length, 12)} links
                </span>
              </div>
              <ul className="divide-y divide-border/60">
                {snapshot.preview.map((item) => {
                  const folderPath = item.folderPath ?? item.folder_path ?? [];
                  return (
                    <li
                      key={item.position}
                      className="flex min-w-0 flex-col gap-2 bg-surface-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {item.title || item.url || "Untitled bookmark"}
                        </p>
                        <p className="truncate text-xs text-text-muted">
                          {folderPath.length > 0 ? `${folderPath.join(" / ")} · ` : ""}
                          {item.url ?? item.error}
                        </p>
                      </div>
                      <StatusPill status={item.status} />
                    </li>
                  );
                })}
              </ul>
            </div>

            {snapshot.errors && snapshot.errors.length > 0 && (
              <div className="mt-5 rounded-2xl border border-error/25 bg-error/5 p-4">
                <p className="text-sm font-semibold text-text">
                  Failed items can be retried
                </p>
                <ul className="mt-2 space-y-1 text-xs text-text-muted">
                  {snapshot.errors.slice(0, 5).map((item) => (
                    <li key={item.position} className="truncate">
                      {item.title || item.url}: {item.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {snapshot.job.status === "review" && (
              <div className="mt-6 flex flex-col justify-between gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center">
                <p className="text-xs leading-5 text-text-muted">
                  Nothing is added until you confirm. Invalid links and duplicates are skipped.
                </p>
                <button
                  type="button"
                  disabled={busy || (counts?.pending ?? 0) === 0}
                  onClick={() => void processImport(snapshot.job.id)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Upload aria-hidden="true" className="size-4" />
                  )}
                  {busy
                    ? "Importing…"
                    : demoMode
                      ? "Run demo"
                      : `Import ${counts?.pending.toLocaleString() ?? 0} bookmarks`}
                </button>
              </div>
            )}

            {snapshot.job.status === "processing" && (
              <div className="mt-6 flex flex-col justify-between gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center">
                <p className="text-sm text-text-muted">
                  {counts?.imported.toLocaleString() ?? 0} of{" "}
                  {snapshot.job.total_count.toLocaleString()} items have been imported.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void processImport(snapshot.job.id)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-surface-elevated px-4 text-sm font-medium text-text transition-colors hover:bg-surface disabled:opacity-50"
                >
                  {busy ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <RotateCw aria-hidden="true" className="size-4" />
                  )}
                  {busy ? "Working…" : "Resume import"}
                </button>
              </div>
            )}

            {completed && (
              <div className="mt-6 flex flex-col justify-between gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center">
                <p className="text-sm text-text-muted">
                  {counts?.failed
                    ? `${counts.failed} items failed and can be retried.`
                    : "Import complete. Metadata enrichment and indexing continue in the background."}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {demoMode && (
                    <button
                      type="button"
                      onClick={() => setSnapshot(DEMO_SNAPSHOT)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-surface-elevated px-4 text-sm font-medium text-text transition-colors hover:bg-surface"
                    >
                      <RotateCw aria-hidden="true" className="size-4" />
                      Replay demo
                    </button>
                  )}
                  {(counts?.failed ?? 0) > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void processImport(snapshot.job.id, true)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-surface-elevated px-4 text-sm font-medium text-text transition-colors hover:bg-surface disabled:opacity-50"
                    >
                      <RotateCw aria-hidden="true" className="size-4" />
                      Retry failed
                    </button>
                  )}
                  <Link
                    href={demoMode ? "/app/import" : "/app/bookmarks"}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <CircleCheck aria-hidden="true" className="size-4" />
                    {demoMode ? "Back to import" : "Open your library"}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-2xl border border-error/30 bg-error/5 p-4 text-sm text-text"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-error" />
            <span>{error}</span>
          </div>
        )}

        {busy && snapshot?.job.status !== "processing" && (
          <div className="mt-4 flex items-center gap-2 text-xs text-text-muted" role="status">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Processing your request…
          </div>
        )}

        {snapshot?.job.status === "completed" && (
          <p className="sr-only" role="status">
            Import complete. {counts?.imported ?? 0} bookmarks imported.
          </p>
        )}
      </section>

      {!snapshot && (
        <aside className="mt-5 grid gap-3 text-sm text-text-muted sm:grid-cols-3">
          <Tip
            title="Export first"
            copy="Use your browser's bookmark manager to export as an HTML file."
          />
          <Tip
            title="Review before saving"
            copy="We show a preview and detect duplicates against this library."
          />
          <Tip
            title="Safe to resume"
            copy="Your progress is saved per link, so you can continue later."
          />
        </aside>
      )}
    </div>
  );
}

function CountCard({
  label,
  value,
  success = false,
}: {
  label: string;
  value: number;
  success?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-3 sm:p-4">
      <div className="flex items-center gap-2">
        {success ? (
          <CircleCheck aria-hidden="true" className="size-4 text-success" />
        ) : (
          <Check aria-hidden="true" className="size-4 text-primary" />
        )}
        <span className="text-[11px] leading-4 text-text-muted sm:text-xs">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-text">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Tip({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-elevated p-4">
      <p className="font-medium text-text">{title}</p>
      <p className="mt-1 text-xs leading-5">{copy}</p>
    </div>
  );
}
