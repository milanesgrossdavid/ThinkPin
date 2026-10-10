"use client";

import { useState, type FormEvent } from "react";
import { Link2, Plus } from "lucide-react";
import { requestSmartSave } from "../../lib/save-dialog";

export function QuickSave() {
  const [url, setUrl] = useState("");

  function openSaveDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestSmartSave(url);
  }

  return (
    <section
      id="quick-save"
      aria-label="Quick save a bookmark"
      className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-8 md:static md:z-auto md:bg-none md:px-8 md:pb-5 md:pt-0 lg:px-12"
    >
      <div className="mx-auto max-w-container-xl">
        <form
          onSubmit={openSaveDialog}
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
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste a link to save something..."
              required
              className="h-11 w-full rounded-full border border-border/60 bg-background pl-10 pr-4 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <button
            type="submit"
            data-primary-action
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus aria-hidden="true" className="size-4" />
            Save
          </button>
        </form>

        <button
          type="button"
          data-primary-action
          onClick={() => requestSmartSave()}
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
      </div>
    </section>
  );
}
