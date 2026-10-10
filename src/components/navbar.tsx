"use client";

import { useState } from "react";
import { Menu, X } from "lucide";
import { MorphIcon } from "morphicons/react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";

const getStartedClassName =
  "group inline-flex h-9 items-center justify-center gap-2 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-[background-color,transform] active:scale-[0.97] hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Ask your library", href: "#ai" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-surface-elevated lg:apple-translucent">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-14 max-w-container-xl items-center justify-between gap-6 px-5 sm:min-h-16 sm:px-8"
      >
        <Link
          href="/"
          aria-label="ThinkPin home"
          className="inline-flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <Image
            src="/icon-light.svg"
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
            className="size-8 dark:hidden"
            loading="eager"
          />
          <Image
            src="/icon-dark.svg"
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
            className="hidden size-8 dark:block"
            loading="eager"
          />
          <span>ThinkPin</span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] text-text-muted transition-colors hover:text-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-6 lg:flex">
          <ThemeToggle />
          <a
            href="/login"
            className="text-sm font-medium text-text transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Log in
          </a>
          <Link
            href="/onboarding"
            className={getStartedClassName}
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex size-10 items-center justify-center rounded-full text-text transition-colors active:scale-95 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
        >
          <MorphIcon
            icon={menuOpen ? X : Menu}
            size={20}
            spring="snappy"
            reducedMotion="user"
          />
        </button>
      </nav>

      {menuOpen && (
        <div
          id="mobile-navigation"
          className="absolute inset-x-0 top-full border-b border-border/50 bg-surface-elevated px-5 py-4 shadow-lg lg:hidden"
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
              <ThemeToggle />
              <a
                href="/login"
                onClick={closeMenu}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
              >
                Log in
              </a>
              <Link
                href="/onboarding"
                onClick={closeMenu}
                className={getStartedClassName}
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
