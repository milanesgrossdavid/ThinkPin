"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  Check,
  Circle,
  ExternalLink,
  Link2,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";
import {
  mockAnalyzeBookmark,
  mockSaveAnalyzedBookmark,
  type MockBookmarkPreview,
} from "../../lib/mock-actions/bookmarks";
import type { BookmarkIntent } from "../../lib/bookmarks";
import { useAppToast } from "../feedback/AppToaster";
import { ActionButton } from "../ui/ActionButton";

const analysisSteps = [
  "Link detected",
  "Page found",
  "Understanding content",
  "Finding topics",
  "Suggestions generated",
];

const intentOptions: BookmarkIntent[] = [
  "Research",
  "Learn",
  "Buy",
  "Reference",
  "Project",
  "Inspiration",
];

function normalizeInputUrl(value: string) {
  const input = value.trim();
  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input)
    ? input
    : `https://${input}`;
  const url = new URL(candidate);
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    (!url.hostname.includes(".") && url.hostname !== "localhost")
  ) {
    throw new Error("Please enter a valid URL.");
  }
  return url.toString();
}

function delay(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

export function SmartSaveDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<MockBookmarkPreview | null>(null);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedIntent, setSelectedIntent] =
    useState<BookmarkIntent>("Research");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<"validation" | "preview" | "save" | null>(null);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [isAnalyzing, startAnalysis] = useTransition();
  const [isSaving, startSave] = useTransition();
  const toast = useAppToast();
  const isPending = isAnalyzing || isSaving;

  const closeDialog = useCallback(() => {
    if (isPending) {
      return;
    }
    setIsOpen(false);
    setError("");
    setSaveSucceeded(false);
    setUrl("");
    setPreview(null);
    setAnalysisStep(0);
  }, [isPending]);

  const analyzeUrl = useCallback(
    (rawUrl: string) => {
      setError("");
      setErrorKind(null);
      setSaveSucceeded(false);
      setPreview(null);
      setAnalysisStep(0);

      let normalizedUrl: string;
      try {
        normalizedUrl = normalizeInputUrl(rawUrl);
      } catch {
        setError("Please enter a valid URL.");
        setErrorKind("validation");
        inputRef.current?.focus();
        return;
      }

      setUrl(normalizedUrl);
      startAnalysis(async () => {
        try {
          const analysisPromise = mockAnalyzeBookmark(normalizedUrl);
          for (let step = 1; step < analysisSteps.length; step += 1) {
            await delay(220);
            setAnalysisStep(step);
          }
          const result = await analysisPromise;
          if (!result.success) {
            setError(result.error);
            setErrorKind("preview");
            toast.error("Couldn't analyze this link", result.error);
            return;
          }
          setPreview(result.data);
          setSelectedCollection(result.data.collection);
          setSelectedTags(result.data.tags);
          setSelectedIntent(result.data.intent ?? "Research");
          setAnalysisStep(analysisSteps.length);
        } catch {
          setError("We couldn't retrieve a preview for this link.");
          setErrorKind("preview");
          toast.error(
            "Couldn't retrieve a preview",
            "You can retry the preview before saving this link.",
          );
        }
      });
    },
    [toast],
  );

  const openDialog = useCallback(
    (initialUrl = "") => {
      setIsOpen(true);
      setError("");
      setErrorKind(null);
      setSaveSucceeded(false);
      setPreview(null);
      setAnalysisStep(0);
      setUrl(initialUrl);
      if (initialUrl) {
        analyzeUrl(initialUrl);
      } else {
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    [analyzeUrl],
  );

  useEffect(() => {
    function handleOpen(event: Event) {
      const initialUrl =
        event instanceof CustomEvent &&
        typeof event.detail?.url === "string"
          ? event.detail.url
          : "";
      openDialog(initialUrl);
    }
    window.addEventListener("thinkpin:open-save-dialog", handleOpen);
    return () =>
      window.removeEventListener("thinkpin:open-save-dialog", handleOpen);
  }, [openDialog]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen && !dialog.open) {
      dialog.showModal();
      return;
    }
    if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      closeDialog();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeDialog, isOpen]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) {
      startSave(async () => {
        try {
          const result = await mockSaveAnalyzedBookmark({
            ...preview,
            collection: selectedCollection,
            tags: selectedTags,
            intent: selectedIntent,
          });
          if (!result.success) {
            setError(result.error);
            setErrorKind("save");
            toast.error("Couldn't save this bookmark", result.error);
            return;
          }
          toast.success("Bookmark saved");
          setSaveSucceeded(true);
          window.setTimeout(closeDialog, 650);
        } catch {
          setError("The URL couldn't be processed.");
          setErrorKind("save");
          toast.error(
            "Couldn't save this bookmark",
            "The URL couldn't be processed.",
          );
        }
      });
      return;
    }
    analyzeUrl(url);
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((value) => value !== tag)
        : [...current, tag],
    );
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="smart-save-dialog-title"
      onClose={() => setIsOpen(false)}
      onCancel={(event) => {
        if (isPending) {
          event.preventDefault();
          return;
        }
        closeDialog();
      }}
      onMouseDown={closeOnBackdrop}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-border/60 bg-surface-elevated p-0 text-text shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[min(90dvh,48rem)] sm:w-[min(100%-2rem,36rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
    >
      <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border sm:hidden" />
      <div className="p-5 sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Smart Save
            </p>
            <h2
              id="smart-save-dialog-title"
              className="mt-1.5 text-xl font-semibold tracking-[-0.035em] text-text sm:text-2xl"
            >
              Save something
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-text-muted">
              Paste a URL and we&apos;ll organize it for you.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close save dialog"
            disabled={isPending}
            onClick={closeDialog}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-background hover:text-text disabled:opacity-50"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <label className="relative block">
            <span className="sr-only">Paste a URL</span>
            <Link2
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            />
            <input
              ref={inputRef}
              type="text"
              inputMode="url"
              autoComplete="url"
              value={url}
              disabled={isPending || Boolean(preview)}
              onChange={(event) => {
                setUrl(event.target.value);
                setError("");
                setErrorKind(null);
                setSaveSucceeded(false);
              }}
              placeholder="https://"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "smart-save-error" : undefined}
              className="h-12 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-70"
            />
          </label>

          {error && (
            <div id="smart-save-error" className="rounded-2xl border border-error/30 bg-error/5 p-4" role="alert">
              <p className="text-sm font-semibold text-text">
                {errorKind === "save"
                  ? "Couldn't save this bookmark"
                  : errorKind === "preview"
                    ? "We couldn't retrieve a preview for this link."
                    : error}
              </p>
              {errorKind === "save" && (
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  {error || "The URL couldn&apos;t be processed."}
                </p>
              )}
              {errorKind === "preview" && (
                <button
                  type="button"
                  onClick={() => analyzeUrl(url)}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  Retry preview
                </button>
              )}
            </div>
          )}

          {isAnalyzing && (
            <section
              aria-label="Analyzing this link"
              aria-live="polite"
              className="rounded-2xl border border-border/70 bg-background p-4"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-text">
                <Sparkles aria-hidden="true" className="size-4 text-primary" />
                Analyzing this link...
              </div>
              <ol className="mt-4 space-y-2">
                {analysisSteps.map((step, index) => (
                  <li
                    key={step}
                    className={`flex items-center gap-2.5 text-xs ${
                      index < analysisStep
                        ? "text-text"
                        : index === analysisStep
                          ? "font-medium text-primary"
                          : "text-text-muted"
                    }`}
                  >
                    {index < analysisStep ? (
                      <Check
                        aria-hidden="true"
                        className="size-4 text-success"
                      />
                    ) : index === analysisStep ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-4 animate-spin"
                      />
                    ) : (
                      <Circle aria-hidden="true" className="size-4" />
                    )}
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {preview && (
            <div className="max-h-[42dvh] space-y-4 overflow-y-auto pr-1 sm:max-h-[48dvh]">
              <article className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                <div className="flex h-24 items-center justify-center bg-gradient-to-br from-primary/15 via-surface to-surface-elevated">
                  <span className="flex size-11 items-center justify-center rounded-2xl border border-border/60 bg-surface-elevated text-primary shadow-sm">
                    <Link2 aria-hidden="true" className="size-5" />
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-text">
                    {preview.title}
                  </h3>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary"
                  >
                    {preview.domain}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                  <p className="mt-2 text-xs leading-5 text-text-muted">
                    {preview.description}
                  </p>
                </div>
              </article>

              <section>
                <h3 className="text-xs font-semibold text-text">
                  Suggested collection
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...new Set([preview.collection, "Read later", "Unsorted"])].map(
                    (collection) => (
                      <button
                        key={collection}
                        type="button"
                        aria-pressed={selectedCollection === collection}
                        onClick={() => setSelectedCollection(collection)}
                        className={`min-h-8 rounded-full px-3 text-xs font-medium transition-colors ${
                          selectedCollection === collection
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-text-muted hover:text-text"
                        }`}
                      >
                        {collection}
                        {selectedCollection === collection ? " ✓" : ""}
                      </button>
                    ),
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-text">
                  Suggested tags
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {preview.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={selectedTags.includes(tag)}
                      onClick={() => toggleTag(tag)}
                      className={`min-h-8 rounded-full px-3 text-xs font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? "bg-primary/10 text-primary"
                          : "bg-background text-text-muted"
                      }`}
                    >
                      #{tag}
                      {selectedTags.includes(tag) ? " ✓" : ""}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-text">
                  Why are you saving this?
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {intentOptions.map((intent) => (
                    <button
                      key={intent}
                      type="button"
                      aria-pressed={selectedIntent === intent}
                      onClick={() => setSelectedIntent(intent)}
                      className={`min-h-8 rounded-full px-3 text-xs font-medium transition-colors ${
                        selectedIntent === intent
                          ? "bg-primary/10 text-primary"
                          : "bg-background text-text-muted hover:text-text"
                      }`}
                    >
                      {intent}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          <div className="flex gap-2 border-t border-border/60 pt-4">
            {preview && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setPreview(null);
                  setError("");
                  inputRef.current?.focus();
                }}
                className="min-h-11 rounded-full border border-border px-4 text-sm font-medium text-text-muted transition-colors hover:bg-background disabled:opacity-60"
              >
                Back
              </button>
            )}
            <ActionButton
              type="submit"
              status={
                isPending
                  ? "loading"
                  : saveSucceeded
                    ? "success"
                    : error
                      ? "error"
                      : "idle"
              }
              className="flex-1"
            >
              {isPending
                ? isAnalyzing
                  ? "Analyzing..."
                  : "Saving..."
                : saveSucceeded
                  ? "Saved"
                  : errorKind === "save"
                    ? "Try again"
                    : errorKind === "preview"
                      ? "Retry preview"
                      : errorKind === "validation"
                        ? "Check URL"
                        : "Save Bookmark"}
            </ActionButton>
          </div>
        </form>
      </div>
    </dialog>
  );
}
