import { Search } from "lucide-react";

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
              <span
                role="img"
                aria-label="David"
                title="David"
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-xs font-semibold text-text lg:hidden"
              >
                D
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-semibold leading-tight tracking-[-0.045em] text-text sm:mt-2 sm:text-4xl">
              Your Internet Memory
            </h1>
            <p className="mt-1 max-w-xl text-xs leading-5 text-text-muted sm:mt-2 sm:text-base sm:leading-6">
              Everything you&apos;ve saved, understood, and connected.
            </p>
          </div>

          <div className="flex w-full items-center gap-2 lg:w-auto lg:gap-3">
            <label className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
              <span className="sr-only">Search your memory</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-text-muted"
              />
              <input
                type="search"
                placeholder="Search your memory..."
                className="h-10 w-full rounded-full border border-border/70 bg-surface-elevated pl-10 pr-3 text-xs text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/10 sm:h-11 sm:pr-4 sm:text-sm"
              />
            </label>

            <span
              role="img"
              aria-label="David"
              title="David"
              className="hidden size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-sm font-semibold text-text lg:flex"
            >
              D
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
