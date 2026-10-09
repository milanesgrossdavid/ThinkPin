import {
  Activity,
  BookOpenCheck,
  FlaskConical,
  Scale,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { DashboardAccountButton } from "./dashboard-account-button";
import { CreditBalance } from "../billing/credit-balance";

export function DashboardHeader() {
  return (
    <header className="border-b border-border/60 bg-background px-4 py-4 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <div className="mx-auto max-w-container-xl">
        <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-text-muted sm:text-sm">
                Good morning, David
              </p>
              <div className="flex items-center gap-2">
                <CreditBalance />
                <Link
                  href="/app/billing"
                  className="rounded-full px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Plan &amp; billing
                </Link>
                <DashboardAccountButton />
              </div>
            </div>
            <h1 className="mt-1.5 text-2xl font-semibold leading-tight tracking-[-0.045em] text-text sm:mt-2 sm:text-4xl">
              Your Internet Memory
            </h1>
            <p className="mt-1 max-w-xl text-xs leading-5 text-text-muted sm:mt-2 sm:text-base sm:leading-6">
              Everything you&apos;ve saved, understood, and connected.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end lg:gap-3">
            <div className="flex w-full items-center gap-2 lg:w-auto lg:gap-3">
              <Link
                href="/app/search"
                aria-label="Search your memory. Open command menu with Command K."
                className="group relative flex h-10 min-w-0 flex-1 items-center rounded-full border border-border/70 bg-surface-elevated pl-10 pr-3 text-xs text-text-muted outline-none transition-[border-color,box-shadow] hover:border-primary/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-11 sm:pr-3 sm:text-sm lg:w-64 lg:flex-none"
              >
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-text-muted"
                />
                <span className="min-w-0 flex-1 truncate">
                  Search your memory...
                </span>
                <kbd className="hidden shrink-0 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-text-muted sm:inline-flex">
                  ⌘ K
                </kbd>
              </Link>

              <Link
                href="/app/ask"
                aria-label="Ask your library"
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-11 sm:px-4 sm:text-sm"
              >
                <Sparkles aria-hidden="true" className="size-4" />
                <span>Ask</span>
              </Link>
            </div>

            <nav
              aria-label="Explore"
              className="flex w-full items-center gap-1 sm:justify-end sm:gap-2 lg:w-auto lg:gap-3"
            >
              <Link
                href="/app/research"
                aria-label="Research projects"
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-surface-elevated px-2 text-[11px] font-medium text-text transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-none sm:gap-2 sm:px-4 sm:text-sm"
              >
                <FlaskConical aria-hidden="true" className="size-4" />
                <span>Research</span>
              </Link>

              <Link
                href="/app/decisions"
                aria-label="Decision boards"
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-surface-elevated px-2 text-[11px] font-medium text-text transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-none sm:gap-2 sm:px-4 sm:text-sm"
              >
                <Scale aria-hidden="true" className="size-4" />
                <span>Decisions</span>
              </Link>

              <Link
                href="/app/learn"
                aria-label="Learning paths"
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-surface-elevated px-2 text-[11px] font-medium text-text transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-none sm:gap-2 sm:px-4 sm:text-sm"
              >
                <BookOpenCheck aria-hidden="true" className="size-4" />
                <span>Learn</span>
              </Link>
              <Link
                href="/app/library-health"
                aria-label="Library Health"
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-surface-elevated px-2 text-[11px] font-medium text-text transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-none sm:gap-2 sm:px-4 sm:text-sm"
              >
                <Activity aria-hidden="true" className="size-4" />
                <span>Health</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
