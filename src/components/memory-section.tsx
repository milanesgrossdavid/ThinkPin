import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Compass,
  Sparkles,
} from "lucide-react";

export function MemorySection() {
  return (
    <section
      aria-labelledby="memory-title"
      className="overflow-hidden bg-surface-elevated px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto grid max-w-container-xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div className="min-w-0 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            A memory that gives back
          </p>
          <h2
            id="memory-title"
            className="mt-4 font-heading text-4xl leading-[1.04] tracking-tight text-text sm:text-5xl md:text-6xl"
          >
            The things you save today can become useful months from now.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-text-muted sm:text-lg sm:leading-8">
            Your library brings the right idea back into view when what you’re
            working on makes it matter again.
          </p>
        </div>

        <div
          role="img"
          aria-label="Eight-month-old resource rediscovered because of recent research into AI development"
          className="relative mx-auto w-full min-w-0 max-w-xl"
        >
          <div
            aria-hidden="true"
            className="absolute -inset-4 -z-10 rounded-[32px] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_72%)] blur-2xl sm:-inset-8"
          />
          <div className="rounded-[28px] border border-border/50 bg-surface-elevated p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.26)] ring-1 ring-text/[0.03] sm:p-7">
            <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-text-muted">
              <CalendarClock aria-hidden="true" className="size-4" />
              You saved this 8 months ago.
            </div>

            <article className="mt-5 overflow-hidden rounded-2xl border border-border/50 bg-surface">
              <div className="flex items-center gap-4 p-4 sm:p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-text sm:text-base">
                    Building AI products with Next.js
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    vercel.com <span aria-hidden="true">·</span> Article
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-border/70 px-4 py-2.5 sm:px-5">
                {["Next.js", "AI development", "Product"].map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-surface-elevated px-2 py-1 text-[10px] font-medium text-text-muted"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </article>

            <div className="relative ml-5 mt-5 border-l border-dashed border-primary/35 pl-5 sm:ml-6 sm:pl-6">
              <span className="absolute -left-[5px] top-1 size-2.5 rounded-full border-2 border-surface-elevated bg-primary" />
              <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
                <Compass aria-hidden="true" className="size-4 text-primary" />
                This week
              </div>
              <p className="mt-2 text-sm leading-6 text-text">
                We found it because you&apos;ve been researching AI development
                this week.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-background p-3.5 sm:p-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles aria-hidden="true" className="size-4" />
                </span>
                <span className="text-xs font-medium text-text sm:text-sm">
                  A useful memory, right on time.
                </span>
              </div>
              <span
                aria-hidden="true"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary"
              >
                Rediscover
                <ArrowRight className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
