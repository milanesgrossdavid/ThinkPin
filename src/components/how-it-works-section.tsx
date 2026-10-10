const steps = [
  {
    number: "01",
    label: "Save",
    description: "Paste a link and keep it in your library.",
    topics: ["Articles", "Videos", "Tools", "Products", "More"],
  },
  {
    number: "02",
    label: "Organize",
    description: "Add tags and collections, or enable AI organization.",
    topics: ["Tags", "Collections", "Favorites", "Notes"],
  },
  {
    number: "03",
    label: "Find it again",
    description: "Search your library or ask questions about saved links.",
    topics: ["Keyword search", "Semantic search*", "Ask Your Library*"],
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      data-scroll-reveal
      className="bg-surface-elevated px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            How it works
          </p>
          <h2
            id="how-it-works-title"
            className="mt-4 font-heading text-4xl leading-[1.02] tracking-tight text-text sm:text-5xl md:text-6xl"
          >
            Save now.
            <br className="hidden sm:block" /> Find it when it matters.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-text-muted sm:text-lg sm:leading-8">
            Keep useful links together, then return to them by search, tags, or
            collections. AI features are available when enabled for your plan.
          </p>
        </div>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-[24px] border border-border/50 bg-border/50 sm:mt-16 sm:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.number}
              className="group relative flex min-h-64 flex-col bg-surface-elevated p-5 transition-colors duration-200 hover:bg-surface sm:p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium tracking-wide text-primary">
                  {step.number}
                </span>
                <span
                  aria-hidden="true"
                  className="h-px w-10 bg-border transition-colors group-hover:bg-primary/50"
                />
              </div>
              <h3 className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {step.label}
              </h3>
              <p className="mt-3 max-w-[15rem] text-lg font-medium leading-snug tracking-tight text-text sm:text-xl">
                {step.description}
              </p>
              <ul
                aria-label={`${step.label} concepts`}
                className="mt-auto flex flex-wrap gap-1.5 pt-6"
              >
                {step.topics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-text-muted"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-center text-xs text-text-muted">
          *AI organization, semantic search, and Ask Your Library depend on
          plan access and provider configuration.
        </p>
      </div>
    </section>
  );
}
