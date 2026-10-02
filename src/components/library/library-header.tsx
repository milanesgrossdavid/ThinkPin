import Link from "next/link";
import { Plus } from "lucide-react";

type LibraryHeaderProps = {
  itemCount: number;
};

export function LibraryHeader({ itemCount }: LibraryHeaderProps) {
  return (
    <header className="border-b border-border/60 bg-background px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <div className="mx-auto flex max-w-container-xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Your Internet Memory
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-4xl">
            Your Library
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-muted sm:text-base">
            <span className="font-medium tabular-nums text-text">
              {itemCount.toLocaleString()}
            </span>{" "}
            things you&apos;ve saved
          </p>
        </div>

        <Link
          href="/save"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-11 sm:gap-2 sm:px-5"
        >
          <Plus aria-hidden="true" className="size-4 sm:size-5" />
          <span>Save</span>
        </Link>
      </div>
    </header>
  );
}
