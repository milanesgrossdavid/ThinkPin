"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Link2, LoaderCircle, X } from "lucide-react";
import {
  cacheServerBookmark,
  notifyBookmarkSaved,
  normalizeBookmarkUrl,
  type SavedBookmark,
} from "../../lib/bookmarks";
import { saveBookmarkAction } from "../../app/actions/bookmarks";
import type { BookmarkDetail, CreatedBookmark } from "../../lib/bookmarks/types";
import { useAppToast } from "../feedback/AppToaster";
import { ActionButton } from "../ui/ActionButton";

type BookmarkPreview = {
  url: string;
  domain: string;
};

function toSavedBookmark(
  record: BookmarkDetail | CreatedBookmark,
): SavedBookmark {
  const bookmark = cacheServerBookmark({
    id: record.id,
    url: record.url,
    domain: record.domain,
    title: "title" in record ? record.title : "",
    description: "description" in record ? record.description : null,
    canonicalUrl: record.canonicalUrl,
    imageUrl: "imageUrl" in record ? record.imageUrl : null,
    faviconUrl: "faviconUrl" in record ? record.faviconUrl : null,
    contentStatus: record.contentStatus,
    createdAt: "createdAt" in record ? record.createdAt : undefined,
  });
  notifyBookmarkSaved(bookmark.id);
  return bookmark;
}

export function SmartSaveDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<BookmarkPreview | null>(null);
  const [error, setError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useAppToast();

  const closeDialog = useCallback(() => {
    if (isSaving) return;
    setIsOpen(false);
    setError("");
    setSaveSucceeded(false);
    setUrl("");
    setPreview(null);
  }, [isSaving]);

  const prepareUrl = useCallback((value: string) => {
    setError("");
    setIsValidationError(false);
    setSaveSucceeded(false);
    setPreview(null);
    try {
      const parsed = normalizeBookmarkUrl(value);
      const domain = parsed.hostname.replace(/^www\./, "");
      setUrl(parsed.toString());
      setPreview({ url: parsed.toString(), domain });
    } catch {
      setError("Please enter a valid URL.");
      setIsValidationError(true);
      inputRef.current?.focus();
    }
  }, []);

  const openDialog = useCallback(
    (initialUrl = "") => {
      setIsOpen(true);
      setError("");
      setIsValidationError(false);
      setSaveSucceeded(false);
      setPreview(null);
      setUrl(initialUrl);
      if (initialUrl) {
        prepareUrl(initialUrl);
      } else {
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    [prepareUrl],
  );

  useEffect(() => {
    function handleOpen(event: Event) {
      const initialUrl =
        event instanceof CustomEvent && typeof event.detail?.url === "string"
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
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeDialog, isOpen]);

  async function saveBookmark(bookmarkUrl: string) {
    setIsSaving(true);
    setError("");
    setIsValidationError(false);
    try {
      const result = await saveBookmarkAction(bookmarkUrl);
      if (!result.ok) {
        throw new Error(result.error);
      }

      toSavedBookmark(result.bookmark);
      if (result.duplicate) {
        toast.info("This bookmark is already saved");
      } else {
        toast.success("Bookmark saved");
      }
      setSaveSucceeded(true);
      if (!result.processingQueued) {
        setError(
          "The bookmark is saved, but page details could not be queued.",
        );
      } else {
        window.setTimeout(closeDialog, 650);
      }
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "The URL couldn't be processed.";
      setError(message);
      toast.error("Couldn't save this bookmark", message);
    } finally {
      setIsSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) {
      prepareUrl(url);
      return;
    }
    void saveBookmark(preview.url);
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDialog();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="smart-save-dialog-title"
      onClose={() => setIsOpen(false)}
      onCancel={(event) => {
        if (isSaving) event.preventDefault();
        else closeDialog();
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
              Save a link now. Page details and optional local AI tags are
              prepared in the background.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close save dialog"
            disabled={isSaving}
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
              disabled={isSaving || Boolean(preview)}
              onChange={(event) => {
                setUrl(event.target.value);
                setError("");
                setIsValidationError(false);
                setSaveSucceeded(false);
              }}
              placeholder="https://"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "smart-save-error" : undefined}
              className="h-12 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-70"
            />
          </label>

          {error && (
            <div
              id="smart-save-error"
              className="rounded-2xl border border-error/30 bg-error/5 p-4"
              role="alert"
            >
              <p className="text-sm font-semibold text-text">
                {isValidationError ? error : "Couldn't save this bookmark"}
              </p>
              {!isValidationError && (
                <p className="mt-1 text-sm leading-6 text-text-muted">{error}</p>
              )}
            </div>
          )}

          {isSaving && (
            <p
              className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background p-4 text-sm font-medium text-text"
              aria-live="polite"
            >
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin text-primary"
              />
              Saving bookmark...
            </p>
          )}

          {preview && (
            <article className="rounded-2xl border border-border/70 bg-background p-4">
              <h3 className="text-sm font-semibold text-text">{preview.domain}</h3>
              <p className="mt-1 break-all text-xs text-text-muted">
                {preview.url}
              </p>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                Page metadata and optional local AI suggestions will be
                prepared after this link is saved.
              </p>
            </article>
          )}

          <div className="flex gap-2 border-t border-border/60 pt-4">
            {preview && (
              <button
                type="button"
                disabled={isSaving}
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
                isSaving
                  ? "loading"
                  : saveSucceeded
                    ? "success"
                    : error
                      ? "error"
                      : "idle"
              }
              className="flex-1"
            >
              {isSaving
                ? "Saving..."
                : saveSucceeded
                  ? "Saved"
                  : error && !isValidationError
                    ? "Try again"
                    : preview
                      ? "Save bookmark"
                      : "Continue"}
            </ActionButton>
          </div>
        </form>
      </div>
    </dialog>
  );
}
