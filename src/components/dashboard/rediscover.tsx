"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Clock3, RotateCcw, Sparkles } from "lucide-react";

const rediscoverItem = {
  title: "Building a SaaS with Next.js",
  url: "https://nextjs.org/",
  savedAt: "8 months ago",
  reason: "You saved this while exploring web development.",
  tags: ["Next.js", "SaaS", "Development"],
};

export function Rediscover() {
  const [savedAgain, setSavedAgain] = useState(false);

  return (
    <section
      aria-labelledby="rediscover-title"
      className="px-5 pb-14 sm:px-8 sm:pb-16 lg:px-12"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="mb-5 sm:mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            From your past saves
          </p>
          <h2
            id="rediscover-title"
            className="mt-1.5 text-xl font-semibold tracking-[-0.035em] text-text sm:text-2xl"
          >
            Rediscover
          </h2>
          <p className="mt-1.5 text-sm text-text-muted">
            Your Internet doesn&apos;t just remember. It remembers for you.
          </p>
        </div>

        <article className="overflow-hidden rounded-3xl border border-border/60 bg-surface-elevated shadow-sm">
          <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Sparkles aria-hidden="true" className="size-4" />
                <span>You saved this 8 months ago.</span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.04em] text-text sm:text-3xl">
                {rediscoverItem.title}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted sm:text-base">
                It might be useful again. {rediscoverItem.reason}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {rediscoverItem.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/50 pt-5">
                <a
                  href={rediscoverItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Open
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setSavedAgain(true)}
                  disabled={savedAgain}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background disabled:cursor-default disabled:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {savedAgain ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <RotateCcw aria-hidden="true" className="size-4" />
                  )}
                  {savedAgain ? "Saved again" : "Save again"}
                </button>
              </div>
              {savedAgain && (
                <p className="mt-3 text-xs text-text-muted" role="status">
                  Added to your recent saves in this preview.
                </p>
              )}
            </div>

            <div className="flex items-center border-t border-border/50 bg-background/70 px-5 py-4 md:border-l md:border-t-0 md:px-6">
              <div className="flex items-center gap-3 md:flex-col md:items-start">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Clock3 aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-text-muted">
                    Saved to your memory
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text">
                    8 months ago
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <p className="mt-3 text-center text-[11px] text-text-muted">
          Sample rediscovery · Recommendations will be personalized in a future
          version.
        </p>
      </div>
    </section>
  );
}
