import { Bookmark, Folder, Sparkles, Tags } from "lucide-react";

export function IntelligenceSection() {
  return (
    <section
      aria-labelledby="intelligence-title"
      aria-describedby="intelligence-description"
      data-scroll-reveal
      className="overflow-hidden bg-background px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Optional AI organization
          </p>
          <h2
            id="intelligence-title"
            className="mt-4 font-heading text-4xl leading-[1.02] tracking-tight text-text sm:text-5xl md:text-6xl"
          >
            Keep your library
            <br className="hidden sm:block" />{" "}
            <span className="text-primary">organized your way.</span>
          </h2>
          <p id="intelligence-description" className="sr-only">
            Example of a saved link with tags and a collection.
          </p>
        </div>

        <div
          aria-hidden="true"
          className="relative mx-auto mt-10 h-[440px] max-w-5xl sm:mt-14 sm:h-[500px]"
        >
          <div className="absolute inset-x-0 top-0 h-64 rounded-[32px] bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--primary)_9%,transparent),transparent_72%)]" />

          <article className="absolute left-1/2 top-5 w-[min(86%,400px)] -translate-x-1/2 rounded-[24px] border border-border/50 bg-surface-elevated p-5 shadow-[0_20px_60px_-32px_rgba(0,0,0,0.28)] ring-1 ring-text/[0.03] sm:top-7 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                <span className="size-1.5 rounded-full bg-success" />
                Example saved link
              </span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-text sm:text-xl">
              Authentication guide
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              developer.example.com
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {["#development", "#reference"].map((topic) => (
                <li
                  key={topic}
                  className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                >
                  {topic}
                </li>
              ))}
            </ul>
          </article>

          <ul className="absolute inset-x-0 bottom-3 grid grid-cols-3 gap-2 sm:bottom-5 sm:gap-5">
            {[
              { label: "Saved link", icon: Bookmark },
              { label: "Tags", icon: Tags },
              { label: "Collection", icon: Folder },
            ].map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-border/50 bg-surface-elevated px-1 py-2 shadow-sm sm:min-h-[88px] sm:flex-row sm:gap-3 sm:px-4 sm:py-3"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background text-text-muted sm:size-9">
                  <Icon className="size-4 sm:size-[18px]" />
                </span>
                <span className="truncate text-center text-[11px] font-semibold text-text sm:text-left sm:text-sm">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mx-auto mt-3 max-w-xl text-center text-xs leading-5 text-text-muted">
          Tags and collections are yours to manage. If AI organization is
          enabled, ThinkPin can suggest a title, summary, tags, and content type.
        </p>
      </div>
    </section>
  );
}
