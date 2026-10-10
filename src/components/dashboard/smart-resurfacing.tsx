"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, RotateCcw, Sparkles, X, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveResurfacingFeedback } from "../../app/actions/resurfacing";
import type { ResurfacingCandidate } from "../../lib/resurfacing/types";

export function SmartResurfacing({
  candidates,
  error,
}: {
  candidates: ResurfacingCandidate[];
  error?: string;
}) {
  const router = useRouter();
  const [visibleCandidates, setVisibleCandidates] = useState(candidates);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFeedback(
    bookmarkId: string,
    status: "rediscovered" | "dismissed",
  ) {
    setFeedbackError(null);
    startTransition(async () => {
      try {
        const result = await saveResurfacingFeedback(bookmarkId, status);
        if (!result.ok) {
          setFeedbackError(result.error);
          return;
        }
        if (status === "rediscovered") {
          router.push(`/app/bookmarks/${encodeURIComponent(bookmarkId)}`);
          return;
        }
        setVisibleCandidates((current) =>
          current.filter((candidate) => candidate.id !== bookmarkId),
        );
        router.refresh();
      } catch {
        setFeedbackError(
          "Could not save your response right now. Please try again.",
        );
      }
    });
  }

  if (error) {
    return (
      <section className="px-5 py-3 sm:px-8 lg:px-12" aria-label="Smart Resurfacing">
        <div className="mx-auto flex max-w-container-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-surface-elevated px-5 py-4">
          <p className="text-sm leading-6 text-text-muted">{error}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold text-text transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <RefreshCw aria-hidden="true" className="size-3.5" />
            Try again
          </button>
        </div>
      </section>
    );
  }
  if (!visibleCandidates.length) return null;

  return (
    <section
      aria-labelledby="smart-resurfacing-title"
      className="px-5 py-5 sm:px-8 sm:py-7 lg:px-12"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          <h2
            id="smart-resurfacing-title"
            className="text-lg font-semibold tracking-[-0.03em] text-text sm:text-xl"
          >
            Worth revisiting
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleCandidates.map((candidate) => (
            <article
              key={candidate.id}
              className="flex min-h-48 flex-col rounded-2xl border border-border/70 bg-surface-elevated p-4 shadow-sm sm:p-5"
            >
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-text-muted">
                <span>{candidate.domain}</span>
                <span>Saved {candidate.ageLabel}</span>
              </div>
              <Link
                href={`/app/bookmarks/${encodeURIComponent(candidate.id)}`}
                className="line-clamp-2 text-base font-semibold leading-snug text-text transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {candidate.title}
              </Link>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-muted">
                {candidate.reason}
              </p>
              <div className="mt-auto flex items-center gap-2 pt-4">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    handleFeedback(candidate.id, "rediscovered")
                  }
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <RotateCcw aria-hidden="true" className="size-3.5" />
                  Rediscover
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleFeedback(candidate.id, "dismissed")}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-medium text-text-muted transition-colors hover:bg-background hover:text-text disabled:opacity-60"
                >
                  <X aria-hidden="true" className="size-3.5" />
                  Not interested
                </button>
              </div>
            </article>
          ))}
        </div>
        {feedbackError && (
          <p className="mt-3 text-sm text-error" role="alert">
            {feedbackError}
          </p>
        )}
      </div>
    </section>
  );
}
