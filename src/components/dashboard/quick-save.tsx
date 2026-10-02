"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Check, Link2, Plus, X } from "lucide-react";
import { normalizeBookmarkUrl } from "../../lib/bookmarks";

export function QuickSave() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function saveBookmark(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const normalizedUrl = normalizeBookmarkUrl(url);
      router.push(`/save?url=${encodeURIComponent(normalizedUrl.toString())}`);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message === "Stored bookmark data is invalid."
            ? "Saved bookmark data in this browser is invalid. Clear it before saving a new link."
            : error.message
          : "We couldn't save this link. Check browser storage permissions and try again.",
      );
    }
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      setIsOpen(false);
    }
  }

  return (
    <section
      id="quick-save"
      aria-label="Quick save a bookmark"
      className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-8 md:static md:z-auto md:bg-none md:px-8 md:pb-8 md:pt-4 lg:px-12"
    >
      <div className="mx-auto max-w-container-xl">
        <form
          onSubmit={saveBookmark}
          className="hidden items-center gap-3 rounded-3xl border border-border/60 bg-surface-elevated p-3 shadow-sm md:flex"
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Paste a URL to save</span>
            <Link2
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              inputMode="url"
              autoComplete="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setMessage("");
              }}
              placeholder="Paste a link to save something..."
              required
              className="h-11 w-full rounded-full border border-border/60 bg-background pl-10 pr-4 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus aria-hidden="true" className="size-4" />
            Save
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setIsOpen(true);
          }}
          className="flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface-elevated p-2.5 text-left shadow-xl shadow-black/10 backdrop-blur-xl transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Plus aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-text">
              Save something
            </span>
            <span className="mt-0.5 block text-xs text-text-muted">
              Add a link to your memory
            </span>
          </span>
          <span className="mr-1 text-xs font-medium text-primary">Save</span>
        </button>

        {message && !isOpen && (
          <p
            className={`mt-3 text-center text-xs ${isError ? "text-error" : "text-text-muted"}`}
            role={isError ? "alert" : "status"}
            aria-live={isError ? "assertive" : "polite"}
          >
            {message}
          </p>
        )}
      </div>

      {isOpen && (
        <dialog
          ref={dialogRef}
          onClose={() => setIsOpen(false)}
          onMouseDown={closeOnBackdrop}
          className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none rounded-t-3xl border border-border/60 bg-surface-elevated px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 text-text shadow-xl backdrop:bg-black/40 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(100%-2.5rem,28rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6"
        >
          <div
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="quick-save-title"
                className="text-xl font-semibold tracking-[-0.03em] text-text"
              >
                Save to your memory
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Paste a link. We&apos;ll do the organizing.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close quick save"
              onClick={() => setIsOpen(false)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-background hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <form onSubmit={saveBookmark} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-text">
                Paste a URL
              </span>
              <input
                type="text"
                inputMode="url"
                autoComplete="url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setMessage("");
                }}
                placeholder="https://..."
                required
                autoFocus
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Check aria-hidden="true" className="size-4" />
              Save bookmark
            </button>
            {message && isError && (
              <p
                className="text-center text-xs text-error"
                role="alert"
                aria-live="assertive"
              >
                {message}
              </p>
            )}
          </form>
        </dialog>
      )}
    </section>
  );
}
