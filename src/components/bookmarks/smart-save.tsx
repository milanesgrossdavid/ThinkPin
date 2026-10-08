"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  saveBookmarkAction,
  updateBookmarkAction,
} from "../../app/actions/bookmarks";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Link2,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import {
  cacheServerBookmark,
  notifyBookmarkSaved,
  normalizeBookmarkUrl,
  updateSavedBookmark,
  type SavedBookmark,
} from "../../lib/bookmarks";
import { useAppToast } from "../feedback/AppToaster";
import { ActionButton } from "../ui/ActionButton";

function displayTitle(bookmark: SavedBookmark) {
  return bookmark.title || bookmark.domain;
}

export function SmartSave({ initialUrl }: { initialUrl?: string }) {
  const toast = useAppToast();
  const processedInitialUrl = useRef("");
  const [url, setUrl] = useState("");
  const [bookmark, setBookmark] = useState<SavedBookmark | null>(null);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [editTitleOpen, setEditTitleOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const pollForMetadata = useCallback(async (bookmarkId: string) => {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1_000));
      try {
        const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Bookmark processing status could not be loaded.");
        }
        const payload: unknown = await response.json();
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("bookmark" in payload) ||
          typeof payload.bookmark !== "object" ||
          payload.bookmark === null
        ) {
          throw new Error("Bookmark processing status response was invalid.");
        }

        const record = payload.bookmark as Record<string, unknown>;
        if (
          typeof record.id !== "string" ||
          typeof record.url !== "string" ||
          typeof record.domain !== "string" ||
          typeof record.title !== "string" ||
          typeof record.content_status !== "string"
        ) {
          throw new Error("Bookmark processing status response was invalid.");
        }

        const updated = cacheServerBookmark({
          id: record.id,
          url: record.url,
          domain: record.domain,
          title: record.title,
          description:
            typeof record.description === "string"
              ? record.description
              : null,
          canonicalUrl:
            typeof record.canonical_url === "string"
              ? record.canonical_url
              : null,
          imageUrl:
            typeof record.image_url === "string" ? record.image_url : null,
          contentType:
            record.content_type === "article" ||
            record.content_type === "video" ||
            record.content_type === "repository" ||
            record.content_type === "product" ||
            record.content_type === "tool" ||
            record.content_type === "social" ||
            record.content_type === "document" ||
            record.content_type === "image" ||
            record.content_type === "other"
              ? record.content_type
              : undefined,
          faviconUrl:
            typeof record.favicon_url === "string" ? record.favicon_url : null,
          tags: Array.isArray(record.tags)
            ? record.tags.filter((tag): tag is string => typeof tag === "string")
            : undefined,
          savedReason:
            typeof record.saved_reason === "string"
              ? record.saved_reason
              : undefined,
          collection:
            typeof record.collection === "string"
              ? record.collection
              : undefined,
          contentStatus:
            record.content_status === "pending" ||
            record.content_status === "processing" ||
            record.content_status === "ready" ||
            record.content_status === "failed"
              ? record.content_status
              : undefined,
          createdAt:
            typeof record.created_at === "string" ? record.created_at : undefined,
        });
        setBookmark(updated);

        if (
          updated.contentStatus === "ready" ||
          updated.contentStatus === "failed"
        ) {
          if (updated.contentStatus === "failed") {
            setMessage(
              "Your bookmark is safe, but page analysis could not be queued or completed.",
            );
          } else {
            setMessage("");
          }
          return;
        }
      } catch (error) {
        console.error("Bookmark metadata polling failed.", error);
        setMessage(
          "Your bookmark is saved. We couldn't check its page details right now.",
        );
        return;
      }
    }
    setMessage(
      "Your bookmark is saved and page analysis is still running. Its details will appear here when processing finishes.",
    );
  }, []);

  const saveUrl = useCallback(async (value: string) => {
    setMessage("");

    try {
      const parsedUrl = normalizeBookmarkUrl(value);
      const result = await saveBookmarkAction(parsedUrl.toString());
      if (!result.ok) {
        throw new Error(result.error);
      }

      const record = result.bookmark;
      const saved = cacheServerBookmark({
        id: record.id,
        url: record.url,
        domain: record.domain,
        title: "title" in record ? record.title : record.domain,
        description: "description" in record ? record.description : null,
        canonicalUrl: record.canonicalUrl,
        imageUrl: "imageUrl" in record ? record.imageUrl : null,
        faviconUrl: "faviconUrl" in record ? record.faviconUrl : null,
        contentStatus: record.contentStatus,
        createdAt: "createdAt" in record ? record.createdAt : undefined,
      });
      notifyBookmarkSaved(saved.id);

      if (result.duplicate) {
        setBookmark(saved);
        setAlreadySaved(true);
        if (
          saved.contentStatus === "pending" ||
          saved.contentStatus === "processing"
        ) {
          void pollForMetadata(saved.id);
        } else if (
          saved.contentStatus === "failed" &&
          !result.processingQueued
        ) {
          setMessage(
            "This bookmark is saved, but its background analysis could not be restarted.",
          );
        }
        setEditTitleOpen(false);
        setIsError(false);
        toast.info("This bookmark is already saved");
        return;
      }

      setBookmark(saved);
      setAlreadySaved(false);
      setEditTitleOpen(false);
      setIsError(false);
      if (!result.processingQueued) {
        setMessage(
          "Your bookmark is safe, but page analysis could not be queued. Please try again later.",
        );
      } else {
        toast.success("Bookmark saved");
        void pollForMetadata(saved.id);
      }
    } catch (error) {
      setIsError(true);
      const errorMessage =
        error instanceof Error
          ? error.message === "Stored bookmark data is invalid."
            ? "Saved bookmark data in this browser is invalid. Clear it before saving a new link."
            : error.message
          : "We couldn't save this link. Check browser storage permissions and try again.";
      setMessage(errorMessage);
      toast.error("Couldn't save this bookmark", errorMessage);
    }
  }, [pollForMetadata, toast]);

  useEffect(() => {
    if (!initialUrl || processedInitialUrl.current === initialUrl) {
      return;
    }

    processedInitialUrl.current = initialUrl;
    setUrl(initialUrl);
    startTransition(async () => {
      await saveUrl(initialUrl);
    });
  }, [initialUrl, saveUrl]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      await saveUrl(url);
    });
  }

  async function updateBookmark(
    updates: Partial<
      Pick<SavedBookmark, "title" | "collection" | "tags" | "intent">
    >,
  ) {
    if (!bookmark) {
      return;
    }

    try {
      const result = await updateBookmarkAction(bookmark.id, updates);
      if (!result.ok) {
        throw new Error(result.error);
      }
      updateSavedBookmark(bookmark.id, updates);
      setBookmark((current) => (current ? { ...current, ...updates } : current));
      setMessage("");
      setIsError(false);
    } catch (error) {
      setIsError(true);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "We couldn't update your saved link. Please try again.";
      setMessage(errorMessage);
      toast.error("Couldn't update this bookmark", errorMessage);
    }
  }

  function reset() {
    setBookmark(null);
    setUrl("");
    setMessage("");
  }

  return (
    <main className="min-h-svh bg-background px-5 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/app/bookmarks"
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowRight aria-hidden="true" className="size-4 rotate-180" />
          Your Library
        </Link>

        <header className="mt-9 max-w-xl sm:mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            Smart Save
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.05em] text-text sm:text-5xl">
            Save something
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-muted sm:mt-4 sm:text-base sm:leading-7">
            Paste a link. We&apos;ll save it and fetch its page metadata.
          </p>
        </header>

        {!bookmark ? (
          <>
            <form onSubmit={save} className="mt-8 sm:mt-10">
              <label className="relative block">
                <span className="sr-only">Paste a URL to save</span>
                <Link2
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  autoFocus
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setMessage("");
                  }}
                  placeholder="Paste a URL..."
                  aria-invalid={isError}
                  aria-describedby={message ? "smart-save-message" : undefined}
                  className="h-14 w-full rounded-2xl border border-border bg-surface-elevated pl-12 pr-4 text-sm text-text shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10 sm:h-16 sm:rounded-3xl sm:pl-14 sm:text-base"
                />
              </label>
              <ActionButton
                type="submit"
                status={isPending ? "loading" : isError ? "error" : "idle"}
                className="mt-3 w-full sm:mt-4 sm:w-auto sm:px-6"
              >
                {isPending
                  ? "Saving bookmark"
                  : isError
                    ? "Try again"
                    : "Save bookmark"}
              </ActionButton>
            </form>
            {message && (
              isError ? (
                <div
                  id="smart-save-message"
                  className="mt-4 rounded-2xl border border-error/30 bg-error/5 p-4"
                  role="alert"
                >
                  <p className="text-sm font-semibold text-text">
                    Couldn&apos;t save this bookmark
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    {message}
                  </p>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await saveUrl(url);
                      })
                    }
                    className="mt-3 text-sm font-medium text-primary hover:underline disabled:opacity-60"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <p
                  id="smart-save-message"
                  className="mt-3 text-sm text-text-muted"
                  role="status"
                >
                  {message}
                </p>
              )
            )}
            <p className="mt-4 text-xs leading-5 text-text-muted">
              You can paste a link from anywhere on the web. GitHub · YouTube ·
              Articles · Products · Tools
            </p>
          </>
        ) : (
          <section className="mt-8 space-y-5 sm:mt-10 sm:space-y-6">
            <div
              className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/10 p-4"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-success"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">
                  {alreadySaved
                    ? "Already in your memory"
                    : "Saved to your memory"}
                </p>
                <p className="mt-1 break-all text-xs leading-5 text-text-muted">
                  {bookmark.url}
                </p>
              </div>
            </div>

            <article className="overflow-hidden rounded-3xl border border-border/70 bg-surface-elevated shadow-sm">
              <div
                className="flex min-h-28 items-center justify-center bg-gradient-to-br from-primary/10 via-surface to-surface-elevated bg-cover bg-center p-5 sm:min-h-36"
                style={
                  bookmark.imageUrl
                    ? { backgroundImage: `url("${bookmark.imageUrl}")` }
                    : undefined
                }
              >
                <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-surface-elevated text-primary shadow-sm">
                  <Link2 aria-hidden="true" className="size-5" />
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-lg font-semibold leading-snug tracking-[-0.03em] text-text sm:text-xl">
                      {displayTitle(bookmark)}
                    </h2>
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-text-muted hover:text-primary"
                    >
                      <span className="truncate">{bookmark.domain}</span>
                      <ExternalLink
                        aria-hidden="true"
                        className="size-3 shrink-0"
                      />
                    </a>
                    {bookmark.description && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-muted">
                        {bookmark.description}
                      </p>
                    )}
                    {bookmark.tags.length > 0 && (
                      <p
                        aria-label="Suggested tags"
                        className="mt-3 text-xs leading-5 text-text-muted"
                      >
                        {bookmark.tags.join(", ")}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-expanded={editTitleOpen}
                    onClick={() => {
                      setTitleDraft(bookmark.title);
                      setEditTitleOpen((open) => !open);
                    }}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Edit title
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-3.5 transition-transform ${editTitleOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
                {editTitleOpen && (
                  <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-medium text-text">
                      Title
                    </span>
                    <input
                      value={titleDraft}
                      onChange={(event) => setTitleDraft(event.target.value)}
                      onBlur={() => {
                        if (titleDraft !== bookmark.title) {
                          void updateBookmark({ title: titleDraft });
                        }
                      }}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </label>
                )}
              </div>
            </article>

            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-text">
                  {bookmark.contentStatus === "failed"
                    ? "Page details are unavailable"
                    : bookmark.contentStatus === "ready"
                      ? "Page details are ready"
                      : "Getting page details"}
                </h2>
                {bookmark.contentStatus === "pending" ||
                bookmark.contentStatus === "processing" ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin text-primary"
                  />
                ) : bookmark.contentStatus === "ready" ? (
                  <Check
                    aria-hidden="true"
                    className="size-4 text-success"
                  />
                ) : (
                  <Sparkles
                    aria-hidden="true"
                    className="size-4 text-text-muted"
                  />
                )}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-text-muted">
                {bookmark.contentStatus === "failed"
                  ? message ||
                    "Your bookmark is saved. The background job could not complete."
                  : bookmark.contentStatus === "ready"
                    ? "Page metadata is ready. When enabled, local AI can also suggest tags and a description."
                    : "The bookmark is saved. Page details, tags, a summary, and a collection are being prepared in the background."}
              </p>
            </div>

            {message && (
              <p
                className={`text-sm ${isError ? "text-error" : "text-text-muted"}`}
                role={isError ? "alert" : "status"}
              >
                {message}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-medium text-text transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Save another
              </button>
              <Link
                href="/app/bookmarks"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Done
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
