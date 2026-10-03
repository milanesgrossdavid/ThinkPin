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
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  ExternalLink,
  Link2,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import {
  normalizeBookmarkUrl,
  suggestBookmarkOrganization,
  updateSavedBookmark,
  type BookmarkIntent,
  type SavedBookmark,
} from "../../lib/bookmarks";
import { mockSaveBookmark } from "../../lib/mock-actions/bookmarks";
import { useAppToast } from "../feedback/AppToaster";
import { ActionButton } from "../ui/ActionButton";

const intents: BookmarkIntent[] = [
  "Research",
  "Learn",
  "Buy",
  "Reference",
  "Project",
  "Inspiration",
];
const enrichmentSteps = [
  "Link detected",
  "Page details",
  "Finding topics",
  "Suggesting tags",
];

function displayTitle(bookmark: SavedBookmark) {
  return bookmark.title || bookmark.domain;
}

export function SmartSave({ initialUrl }: { initialUrl?: string }) {
  const toast = useAppToast();
  const processedInitialUrl = useRef("");
  const [url, setUrl] = useState("");
  const [bookmark, setBookmark] = useState<SavedBookmark | null>(null);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [enrichmentStep, setEnrichmentStep] = useState(0);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [editTitleOpen, setEditTitleOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!bookmark || enrichmentStep >= enrichmentSteps.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setEnrichmentStep((current) => current + 1);
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [bookmark, enrichmentStep]);

  const saveUrl = useCallback(async (value: string) => {
    setMessage("");

    try {
      const parsedUrl = normalizeBookmarkUrl(value);
      const suggestions = suggestBookmarkOrganization(
        parsedUrl.hostname.replace(/^www\./, ""),
      );
      const result = await mockSaveBookmark(parsedUrl.toString(), suggestions);
      if (!result.success) {
        throw new Error(result.error);
      }
      setBookmark(result.data.bookmark);
      setAlreadySaved(result.data.alreadySaved);
      setEnrichmentStep(0);
      setEditTitleOpen(false);
      setMessage("");
      setIsError(false);
      if (result.data.alreadySaved) {
        toast.info("This bookmark is already saved");
      } else {
        toast.success("Bookmark saved");
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
  }, [toast]);

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

  function updateBookmark(
    updates: Partial<
      Pick<SavedBookmark, "title" | "collection" | "tags" | "intent">
    >,
  ) {
    if (!bookmark) {
      return;
    }

    try {
      updateSavedBookmark(bookmark.id, updates);
      setBookmark((current) => (current ? { ...current, ...updates } : current));
      setMessage("");
      setIsError(false);
    } catch {
      setIsError(true);
      setMessage("We couldn't update your saved link. Please try again.");
    }
  }

  function reset() {
    setBookmark(null);
    setUrl("");
    setMessage("");
    setEnrichmentStep(0);
  }

  const suggestions = bookmark
    ? suggestBookmarkOrganization(bookmark.domain)
    : null;
  const isEnriching = enrichmentStep < enrichmentSteps.length;

  return (
    <main className="min-h-svh bg-background px-5 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/library"
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
            Paste a link. We&apos;ll do the organizing for you.
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
              <div className="flex min-h-28 items-center justify-center bg-gradient-to-br from-primary/10 via-surface to-surface-elevated p-5 sm:min-h-36">
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
                  </div>
                  <button
                    type="button"
                    aria-expanded={editTitleOpen}
                    onClick={() => setEditTitleOpen((open) => !open)}
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
                      value={bookmark.title}
                      onChange={(event) =>
                        updateBookmark({ title: event.target.value })
                      }
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </label>
                )}
              </div>
            </article>

            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Sparkles
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                <h2 className="text-sm font-semibold text-text">
                  {isEnriching ? "Finding the useful details" : "Looks good?"}
                </h2>
              </div>
              <ol className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
                {enrichmentSteps.map((step, index) => {
                  const isDone = index < enrichmentStep;
                  const isCurrent = index === enrichmentStep && isEnriching;

                  return (
                    <li
                      key={step}
                      className={`flex min-w-0 items-center gap-1.5 text-[11px] leading-4 ${
                        isDone || isCurrent ? "text-text" : "text-text-muted"
                      }`}
                    >
                      {isDone ? (
                        <Check
                          aria-hidden="true"
                          className="size-3.5 shrink-0 text-success"
                        />
                      ) : isCurrent ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-3.5 shrink-0 animate-spin text-primary"
                        />
                      ) : (
                        <Circle
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                      )}
                      <span>{step}</span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 text-[11px] leading-5 text-text-muted">
                Suggestions are a local preview for now; automatic page analysis
                isn&apos;t connected yet.
              </p>
            </div>

            {suggestions && (
              <div className="space-y-5 rounded-2xl border border-border/70 bg-surface-elevated p-4 sm:p-5">
                <div>
                  <p className="text-sm font-semibold text-text">
                    We organized this for you
                  </p>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    These are suggestions. You can change them anytime.
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-text-muted">
                    Suggested collection
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[suggestions.collection, "Unsorted"].map((collection) => (
                      <button
                        key={collection}
                        type="button"
                        aria-pressed={bookmark.collection === collection}
                        onClick={() => updateBookmark({ collection })}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          bookmark.collection === collection
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-background text-text-muted hover:text-text"
                        }`}
                      >
                        {collection}
                        {bookmark.collection === collection && (
                          <Check aria-hidden="true" className="size-3.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-text-muted">
                    Suggested tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.tags.map((tag) => {
                      const selected = bookmark.tags.includes(tag);

                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            updateBookmark({
                              tags: selected
                                ? bookmark.tags.filter((item) => item !== tag)
                                : [...bookmark.tags, tag],
                            })
                          }
                          className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            selected
                              ? "bg-primary/10 text-primary"
                              : "bg-background text-text-muted hover:text-text"
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-text-muted">
                    Why are you saving this?
                    <span className="ml-1 font-normal">(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {intents.map((intent) => (
                      <button
                        key={intent}
                        type="button"
                        aria-pressed={bookmark.intent === intent}
                        onClick={() =>
                          updateBookmark({
                            intent:
                              bookmark.intent === intent ? undefined : intent,
                          })
                        }
                        className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          bookmark.intent === intent
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-text-muted hover:bg-background hover:text-text"
                        }`}
                      >
                        {intent}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
                href="/library"
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
