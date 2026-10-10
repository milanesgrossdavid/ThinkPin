import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, House } from "lucide-react";
import { ThemeToggle } from "../components/theme-toggle";

export const metadata: Metadata = {
  title: "Page not found | ThinkPin",
  description: "The page you were looking for could not be found.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col bg-background px-5 py-5 text-text sm:px-8 sm:py-8">
      <header className="mx-auto flex w-full max-w-container-xl items-center justify-between">
        <Link
          href="/"
          className="rounded-sm text-base font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          ThinkPin
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center py-16">
        <section
          aria-labelledby="not-found-title"
          className="max-w-xl text-center"
        >
          <p className="font-mono text-sm font-medium tracking-[0.2em] text-primary">
            404
          </p>
          <h1
            id="not-found-title"
            data-page-title
            className="mt-4 font-heading text-4xl leading-tight tracking-tight sm:text-6xl"
          >
            This page isn&apos;t here.
          </h1>
          <p data-page-summary className="mt-4 text-base leading-7 text-text-muted">
            The link may be outdated, or the page may have moved. You can head
            back to ThinkPin or start by saving a link.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-text transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Go home
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <House aria-hidden="true" className="size-4" />
              Save a link
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
