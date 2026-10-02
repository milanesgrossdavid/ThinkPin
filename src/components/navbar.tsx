"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#resources" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="relative z-20 border-b border-border bg-surface-elevated">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-16 max-w-container-xl items-center justify-between gap-6 px-5 sm:px-8"
      >
        <Link
          href="/"
          aria-label="Memory home"
          className="inline-flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight text-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <Image
            src="/icon-light.svg"
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            className="size-9 dark:hidden"
          />
          <Image
            src="/icon-dark.svg"
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            className="hidden size-9 dark:block"
          />
          <span>ThinkPin</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-text-muted transition-colors hover:text-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-5 md:flex">
          <a
            href="#login"
            className="text-sm font-medium text-text transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Log in
          </a>
          <a
            href="#get-started"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Get started
          </a>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex size-9 items-center justify-center rounded-md text-text transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
        >
          {menuOpen ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
        </button>
      </nav>

      {menuOpen && (
        <div
          id="mobile-navigation"
          className="absolute inset-x-0 top-full border-b border-border bg-surface-elevated px-5 py-4 shadow-md md:hidden"
        >
          <div className="mx-auto flex max-w-container-xl flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-md px-3 py-2.5 text-sm text-text transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-border pt-3">
              <a
                href="#login"
                onClick={closeMenu}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
              >
                Log in
              </a>
              <a
                href="#get-started"
                onClick={closeMenu}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Get started
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
