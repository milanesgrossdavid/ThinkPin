const categories = [
  "Articles",
  "Videos",
  "Research",
  "Tools",
  "Ideas",
  "Products",
];

export function TrustSection() {
  return (
    <section
      aria-labelledby="trust-section-title"
      className="border-y border-border/70 bg-surface-elevated px-5 py-9 sm:px-8 sm:py-10"
    >
      <div className="mx-auto flex max-w-container-xl flex-col items-center gap-5 text-center sm:gap-6">
        <h2
          id="trust-section-title"
          className="text-sm font-medium tracking-wide text-text-muted sm:text-base"
        >
          Built for everything you don&apos;t want to forget.
        </h2>
        <ul
          aria-label="Things you can save"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium text-text sm:gap-x-5 sm:text-[15px]"
        >
          {categories.map((category, index) => (
            <li key={category} className="inline-flex items-center gap-x-3 sm:gap-x-5">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="text-primary/60"
                >
                  ·
                </span>
              )}
              <span>{category}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
