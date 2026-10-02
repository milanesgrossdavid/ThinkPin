import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Database,
  Link2,
  Sparkles,
  Triangle,
} from "lucide-react";

const sources = [
  { name: "OpenAI documentation", domain: "platform.openai.com", icon: Sparkles },
  { name: "LangChain", domain: "langchain.com", icon: Link2 },
  { name: "Supabase", domain: "supabase.com", icon: Database },
  { name: "Vercel", domain: "vercel.com", icon: Triangle },
];

export function AskLibrarySection() {
  return (
    <section
      aria-labelledby="ask-library-title"
      className="bg-background px-5 py-20 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Answers from your saved resources
          </p>
          <h2
            id="ask-library-title"
            className="mt-4 font-heading text-4xl leading-[1.02] tracking-tight text-text sm:text-5xl md:text-6xl"
          >
            Ask your Internet memory.
          </h2>
        </div>

        <div
          role="region"
          aria-label="Example answer based on your saved library"
          className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border/80 bg-surface-elevated shadow-xl ring-1 ring-text/[0.03] sm:mt-14"
        >
          <div className="border-b border-border p-4 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
              <BookOpen aria-hidden="true" className="size-4 text-primary" />
              Your library
            </div>
            <div className="mt-4 rounded-xl border border-border bg-background/70 px-4 py-4 sm:px-5 sm:py-5">
              <p className="text-sm leading-6 text-text sm:text-base sm:leading-7">
                What tools did I save for building AI applications?
              </p>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-7">
            <div className="mb-5 flex justify-center" aria-hidden="true">
              <span className="flex size-8 items-center justify-center rounded-full border border-primary/15 bg-primary/[0.06] text-primary">
                <ArrowDown className="size-4" />
              </span>
            </div>

            <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  <Sparkles aria-hidden="true" className="size-4" />
                  Based on your saved resources
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  14 related resources
                </span>
              </div>
              <p className="mt-4 text-base font-medium leading-relaxed text-text sm:text-lg">
                I found 14 resources related to AI application development.
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Here are a few from your library:
              </p>

              <div className="mt-6 border-t border-border/80 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Sources
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {sources.map((source) => {
                    const Icon = source.icon;

                    return (
                      <li key={source.name}>
                        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-surface-elevated px-3 py-2.5">
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
          </div>
        </div>
      </div>
    </section>
  );
}
