import Link from "next/link";

type FooterLink = {
  label: string;
  href: string;
};

const linkGroups: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Ask Your Library", href: "#ai" },
      { label: "FAQ", href: "#faq" },
      { label: "Privacy", href: "#faq-privacy" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Get started", href: "/onboarding" },
      { label: "Log in", href: "/login" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-surface-elevated px-5 pb-6 pt-10 sm:px-8 sm:pb-8 sm:pt-16">
      <div className="mx-auto max-w-container-xl">
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-8 sm:gap-y-10 lg:grid-cols-[1.4fr_repeat(2,minmax(0,1fr))] lg:gap-8">
          <div className="col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight text-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              ThinkPin
            </Link>
            <p className="mt-2 max-w-60 text-sm leading-6 text-text-muted">
              Your Internet, remembered.
            </p>
          </div>

          {linkGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-xs font-semibold tracking-[-0.01em] text-text">
                {group.title}
              </h2>
              <ul className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-text-muted transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-9 flex flex-col gap-4 border-t border-border/60 pt-5 sm:mt-14 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
          <p className="text-xs leading-5 text-text-muted">
            © 2026 ThinkPin. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
