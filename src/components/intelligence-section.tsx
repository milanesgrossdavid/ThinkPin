import { Code2, Database, KeyRound, Sparkles } from "lucide-react";

const connectedResources = [
  { name: "Supabase", detail: "Database", icon: Database },
  { name: "Next.js", detail: "Framework", icon: Code2 },
  { name: "OAuth", detail: "Authentication", icon: KeyRound },
];

export function IntelligenceSection() {
  return (
    <section
      aria-labelledby="intelligence-title"
      aria-describedby="intelligence-description"
      className="overflow-hidden bg-surface px-5 py-20 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            A little more than bookmarks
          </p>
          <h2
            id="intelligence-title"
            className="mt-4 font-heading text-4xl leading-[1.02] tracking-tight text-text sm:text-5xl md:text-6xl"
          >
            Your bookmarks aren&apos;t just stored.
            <br className="hidden sm:block" />{" "}
            <span className="text-primary">They&apos;re understood.</span>
          </h2>
          <p id="intelligence-description" className="sr-only">
            A saved Next.js Auth resource is connected to related topics and
            resources including Supabase, Next.js, and OAuth.
          </p>
        </div>

        <div
          aria-hidden="true"
          className="relative mx-auto mt-10 h-[440px] max-w-5xl sm:mt-14 sm:h-[500px]"
        >
          <div className="absolute inset-x-0 top-0 h-64 rounded-[32px] bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--primary)_9%,transparent),transparent_72%)]" />

          <svg
            className="absolute inset-0 size-full overflow-visible"
            viewBox="0 0 900 500"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="relationship-line" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity=".45" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity=".18" />
              </linearGradient>
            </defs>
            <path
              d="M450 218V286M145 286H755M145 286V385M450 286V385M755 286V385"
              fill="none"
              stroke="url(#relationship-line)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx="450" cy="286" r="4" fill="var(--primary)" fillOpacity=".7" />
            {[145, 450, 755].map((x) => (
              <circle
                key={x}
                cx={x}
                cy="385"
                r="4"
                fill="var(--primary)"
                fillOpacity=".45"
              />
            ))}
          </svg>

          <article className="absolute left-1/2 top-5 w-[min(86%,400px)] -translate-x-1/2 rounded-2xl border border-border bg-surface-elevated p-5 shadow-lg ring-1 ring-text/[0.03] sm:top-7 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                <span className="size-1.5 rounded-full bg-success" />
                Saved resource
              </span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-text sm:text-xl">
              Next.js Auth
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              Authentication patterns for modern apps
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {["#nextjs", "#supabase", "#authentication"].map((topic) => (
                <li
                  key={topic}
                  className="rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-[11px] font-medium text-primary"
                >
                  {topic}
                </li>
              ))}
            </ul>
          </article>

          <ul className="absolute inset-x-0 bottom-3 grid grid-cols-3 gap-2 sm:bottom-5 sm:gap-5">
            {connectedResources.map((resource) => {
              const Icon = resource.icon;

              return (
                <li
                  key={resource.name}
                  className="flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface-elevated px-1 py-2 shadow-sm sm:min-h-[88px] sm:flex-row sm:gap-3 sm:px-4 sm:py-3"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background text-text-muted sm:size-9">
                    <Icon className="size-4 sm:size-[18px]" />
                  </span>
                  <span className="min-w-0 max-w-full text-center sm:text-left">
                    <span className="block truncate text-[11px] font-semibold text-text sm:text-sm">
                      {resource.name}
                    </span>
                    <span className="mt-0.5 hidden truncate text-[11px] text-text-muted sm:block">
                      {resource.detail}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
