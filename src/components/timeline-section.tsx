import { ArrowRight, Link2, Sparkles } from "lucide-react";

const years = ["2024", "2025", "2026"];
const stages = ["Saved", "Learned", "Researched", "Revisited"];

export function TimelineSection() {
  return (
    <section
      aria-labelledby="timeline-title"
      className="overflow-hidden bg-surface px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            A lifetime of little discoveries
          </p>
          <h2
            id="timeline-title"
            className="mt-4 font-heading text-4xl leading-[1.02] tracking-tight text-text sm:text-5xl md:text-6xl"
          >
            Your Internet Memory.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
            What you save today becomes part of a bigger picture over time.
          </p>
        </div>

        <div
          role="img"
          aria-label="Resources saved across 2024, 2025, and 2026 connect into one Internet memory"
          className="relative mx-auto mt-10 max-w-3xl rounded-[28px] border border-border/50 bg-surface-elevated px-5 py-7 shadow-[0_20px_64px_-40px_rgba(0,0,0,0.2)] sm:mt-14 sm:px-10 sm:py-9"
        >
          <div className="relative mx-auto max-w-xl">
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-[calc(100%-76px)] w-full"
              viewBox="0 0 600 300"
              preserveAspectRatio="none"
            >
              <path
                d="M95 48H470M95 132H470M95 216H470M470 48V258"
                fill="none"
                stroke="var(--border)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M464 250L470 258L476 250"
                fill="none"
                stroke="var(--primary)"
                strokeOpacity=".7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M95 48H470M95 132H470M95 216H470M470 48V258"
                fill="none"
                stroke="var(--primary)"
                strokeOpacity=".48"
                strokeWidth="2"
                strokeDasharray="5 8"
                vectorEffect="non-scaling-stroke"
              />
              {[48, 132, 216].map((y) => (
                <circle
                  key={y}
                  cx="470"
                  cy={y}
                  r="5"
                  fill="var(--surface-elevated)"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            <ol className="relative grid grid-rows-3">
              {years.map((year) => (
                <li
                  key={year}
                  className="flex h-[84px] items-center gap-4 sm:gap-6"
                >
                  <span className="w-14 shrink-0 font-mono text-sm font-medium tracking-wide text-text sm:w-16 sm:text-base">
                    {year}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex-1"
                  />
                  <span className="w-4 shrink-0 sm:w-8" />
                </li>
              ))}
            </ol>

            <div className="relative flex justify-end pr-2 pt-1 sm:pr-4">
              <div className="flex min-w-40 items-center gap-3 rounded-2xl bg-background px-4 py-3 sm:min-w-52 sm:px-5 sm:py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Link2 aria-hidden="true" className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-text">
                    Everything
                  </span>
                  <span className="mt-0.5 block text-xs text-text-muted">
                    connected
                  </span>
                </span>
                <Sparkles
                  aria-hidden="true"
                  className="ml-auto size-4 shrink-0 text-primary/70"
                />
              </div>
            </div>
          </div>

          <p className="mt-7 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted sm:mt-9">
            The journey of a saved idea
          </p>
          <ol
            aria-label="Saved, learned, researched, revisited"
            className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-3"
          >
            {stages.map((stage, index) => (
              <li key={stage} className="flex items-center gap-2 sm:gap-3">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    index === stages.length - 1
                      ? "bg-primary/10 text-primary"
                      : "bg-background text-text-muted"
                  }`}
                >
                  {stage}
                </span>
                {index < stages.length - 1 && (
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3 text-border"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
