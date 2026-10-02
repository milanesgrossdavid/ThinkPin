import Link from "next/link";

type FooterLink = {
  label: string;
  href?: string;
};

const linkGroups: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Search", href: "#search" },
      { label: "AI", href: "#ai" },
      { label: "Extension" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help", href: "#faq-title" },
      { label: "Documentation", href: "#how-it-works" },
      { label: "Changelog", href: "#timeline-title" },
      { label: "Guides", href: "#use-cases-title" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#memory-title" },
      { label: "Blog" },
      { label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#faq-privacy" },
      { label: "Terms" },
      { label: "Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-elevated px-5 pb-6 pt-12 sm:px-8 sm:pb-8 sm:pt-16">
      <div className="mx-auto max-w-container-xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))] lg:gap-8">
          <div>
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              ThinkPin
            </Link>
            <p className="mt-2 text-sm text-text-muted">
              Your Internet, remembered.
            </p>
          </div>

          {linkGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-text">
                {group.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a
                        href={link.href}
                        className="text-sm text-text-muted transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <span
                        aria-disabled="true"
                        title="Coming soon"
                        className="cursor-not-allowed text-sm text-text-muted/60"
                      >
                        {link.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-5 sm:mt-14 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
          <p className="text-xs text-text-muted">
            © 2026 ThinkPin. All rights reserved.
          </p>
          <div
            role="group"
            aria-label="Social profiles coming soon"
            className="flex items-center gap-5"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted/70">
              X
            </span>
            <span className="text-xs font-medium text-text-muted/70">
              GitHub
            </span>
            <span className="text-xs font-medium text-text-muted/70">
              Instagram
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
