import Link from "next/link";
import { ArrowRight, Braces, Sparkles } from "lucide-react";

const suggestions = [
  {
    title: "AI Tools",
    count: 24,
    reason: "Based on your recent saves",
    icon: Sparkles,
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    href: "/app?topic=ai-tools",
  },
  {
    title: "Web Development",
    count: 86,
    reason: "You frequently save content here",
    icon: Braces,
    tone: "bg-primary/10 text-primary",
    href: "/app?topic=web-development",
  },
];

export function SuggestedForYou() {
  return (
    <section
      aria-labelledby="suggested-for-you-title"
      className="px-5 pb-12 sm:px-8 sm:pb-16 lg:px-12"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="mb-5 sm:mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            A little more to explore
          </p>
          <h2
            id="suggested-for-you-title"
            className="mt-1.5 text-xl font-semibold tracking-[-0.035em] text-text sm:text-2xl"
          >
            Suggested for you
          </h2>
          <p className="mt-1.5 text-sm text-text-muted">
            Based on what you&apos;ve been saving
          </p>
        </div>

        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-4">
          {suggestions.map((suggestion) => {
            const Icon = suggestion.icon;

            return (
              <li key={suggestion.title}>
                <Link
                  href={suggestion.href}
                  aria-label={`Explore ${suggestion.title}, ${suggestion.count} saved items. ${suggestion.reason}`}
                  className="group flex min-h-32 items-center gap-4 rounded-3xl border border-border/60 bg-surface-elevated p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-36 sm:gap-5 sm:p-5"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${suggestion.tone}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold tracking-[-0.02em] text-text sm:text-lg">
                      {suggestion.title}
                    </span>
                    <span className="mt-1 block text-sm font-medium text-text">
                      {suggestion.count} saved items
                    </span>
                    <span className="mt-1.5 block text-xs leading-5 text-text-muted">
                      {suggestion.reason}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-transform group-hover:translate-x-0.5 sm:text-sm">
                    Explore
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
