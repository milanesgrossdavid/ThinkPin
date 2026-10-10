import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Link2,
  Sparkles,
} from "lucide-react";

const sources = [
  { name: "A saved article", domain: "example.com", icon: Link2 },
  { name: "A saved guide", domain: "example.org", icon: Link2 },
];

export function AskLibrarySection() {
  return (
    <section
      aria-labelledby="ask-library-title"
      data-scroll-reveal
      className="bg-surface px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Ask Your Library · Pro
          </p>
          <h2
            id="ask-library-title"
            className="mt-4 font-heading text-4xl leading-[1.02] tracking-tight text-text sm:text-5xl md:text-6xl"
          >
            Ask questions about links you saved.
          </h2>
        </div>

        <div
          role="region"
          aria-label="Example answer based on your saved library"
          className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-[28px] border border-border/50 bg-surface-elevated shadow-[0_24px_80px_-40px_rgba(0,0,0,0.26)] ring-1 ring-text/[0.03] sm:mt-14"
        >
          <div className="border-b border-border p-4 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
              <BookOpen aria-hidden="true" className="size-4 text-primary" />
              Your library
            </div>
            <div className="mt-4 rounded-2xl border border-border/50 bg-background/70 px-4 py-4 sm:px-5 sm:py-5">
              <p className="text-sm leading-6 text-text sm:text-base sm:leading-7">
                What did I save about getting started?
              </p>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-7">
            <div className="mb-5 flex justify-center" aria-hidden="true">
              <span className="flex size-8 items-center justify-center rounded-full border border-primary/15 bg-primary/[0.06] text-primary">
                <ArrowDown className="size-4" />
              </span>
            </div>

            <div className="rounded-2xl border border-border/50 bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  <Sparkles aria-hidden="true" className="size-4" />
                  Example answer
                </span>
              </div>
              <p className="mt-4 text-base font-medium leading-relaxed text-text sm:text-lg">
                Here&apos;s a short summary of the relevant information in your
                saved links.
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Answers include sources from your library so you can check the
                original pages.
              </p>

              <div className="mt-6 border-t border-border/80 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Example sources
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {sources.map((source) => {
                    const Icon = source.icon;

                    return (
                      <li key={source.name}>
                        <div className="flex min-w-0 items-center gap-3 rounded-xl bg-surface-elevated px-3 py-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-text-muted">
                            <Icon aria-hidden="true" className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-text">
                              {source.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-text-muted">
                              {source.domain}
                            </span>
                          </span>
                          <ArrowUpRight
                            aria-hidden="true"
                            className="size-4 shrink-0 text-text-muted/60"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-5 text-text-muted">
              Ask Your Library requires a Pro plan and an available AI provider. The
              example above is illustrative; your answer depends on your saved links.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
