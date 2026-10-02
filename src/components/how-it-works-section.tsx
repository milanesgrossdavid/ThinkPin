const steps = [
  {
    number: "01",
    label: "Save",
    description: "Save anything from the web.",
    topics: ["Articles", "Videos", "Tools", "Products", "Research", "Ideas"],
  },
  {
    number: "02",
    label: "Understand",
    description: "Your library understands what you saved.",
    topics: ["Topics", "Content", "Intent", "Context"],
  },
  {
    number: "03",
    label: "Connect",
    description: "Related things are connected automatically.",
    topics: ["Topics", "Bookmarks", "Collections", "Ideas"],
  },
  {
    number: "04",
    label: "Remember",
    description: "Find what matters when you need it.",
    topics: ["Search", "AI", "Research", "Rediscovery"],
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="bg-background px-5 py-20 sm:px-8 sm:py-28 lg:py-32"
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
            From saving links
            <br className="hidden sm:block" /> to remembering knowledge.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-text-muted sm:text-lg sm:leading-8">
            Every link you save becomes part of your personal Internet memory.
          </p>
        </div>

        <ol className="mt-12 grid gap-3 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {steps.map((step) => (
            <li
              key={step.number}
              className="group relative flex min-h-64 flex-col rounded-xl border border-border/80 bg-surface-elevated p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md sm:p-6"
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
                    className="rounded-full border border-border/80 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-text-muted"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
