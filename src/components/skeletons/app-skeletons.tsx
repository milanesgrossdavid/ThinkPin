function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-lg bg-border/70 ${className}`}
    />
  );
}

function SkeletonRegion({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <main
      aria-busy="true"
      aria-label={label}
      className="min-h-svh bg-background px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:px-12"
    >
      {children}
    </main>
  );
}

export function BookmarkSkeleton({ variant = "grid" }: { variant?: "grid" | "list" }) {
  return (
    <article
      aria-hidden="true"
      className={`overflow-hidden rounded-3xl border border-border/60 bg-surface-elevated p-4 shadow-sm ${
        variant === "list" ? "flex items-center gap-4" : ""
      }`}
    >
      <SkeletonBlock
        className={
          variant === "list"
            ? "size-20 shrink-0 rounded-2xl"
            : "aspect-[1.8/1] w-full rounded-2xl"
        }
      />
      <div className={`${variant === "list" ? "min-w-0 flex-1" : "mt-4"} space-y-3`}>
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-2/3" />
        <div className="flex gap-2 pt-1">
          <SkeletonBlock className="h-6 w-16 rounded-full" />
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-14 rounded-full" />
        </div>
      </div>
    </article>
  );
}

export function BookmarkGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <BookmarkSkeleton key={index} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <SkeletonRegion label="Loading dashboard">
      <header className="border-b border-border/60 pb-8">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="mt-4 h-9 w-72 max-w-full" />
        <SkeletonBlock className="mt-3 h-4 w-96 max-w-full" />
      </header>
      <div className="mx-auto mt-7 grid max-w-container-xl grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonBlock key={index} className="h-24 rounded-3xl" />
        ))}
      </div>
      <div className="mx-auto mt-9 max-w-container-xl">
        <SkeletonBlock className="mb-5 h-6 w-44" />
        <BookmarkGridSkeleton count={3} />
      </div>
    </SkeletonRegion>
  );
}

export function LibrarySkeleton() {
  return (
    <SkeletonRegion label="Loading library">
      <header className="border-b border-border/60 pb-8">
        <SkeletonBlock className="h-3 w-32" />
        <SkeletonBlock className="mt-4 h-9 w-60" />
        <SkeletonBlock className="mt-3 h-4 w-48" />
      </header>
      <div className="mx-auto mt-7 max-w-container-xl">
        <SkeletonBlock className="h-14 w-full rounded-3xl" />
        <div className="mt-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 7 }, (_, index) => (
            <SkeletonBlock key={index} className="h-9 w-20 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="mt-6 flex justify-between">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-9 w-40 rounded-full" />
        </div>
        <div className="mt-5">
          <BookmarkGridSkeleton />
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function BookmarkDetailSkeleton() {
  return (
    <SkeletonRegion label="Loading bookmark details">
      <div className="mx-auto max-w-5xl">
        <SkeletonBlock className="h-9 w-28 rounded-full" />
        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <SkeletonBlock className="aspect-[1.9/1] w-full rounded-3xl" />
            <SkeletonBlock className="mt-6 h-9 w-4/5" />
            <SkeletonBlock className="mt-4 h-4 w-44" />
            <SkeletonBlock className="mt-6 h-4 w-full" />
            <SkeletonBlock className="mt-2 h-4 w-5/6" />
            <SkeletonBlock className="mt-8 h-36 w-full rounded-3xl" />
          </div>
          <aside className="space-y-4">
            <SkeletonBlock className="h-48 rounded-3xl" />
            <SkeletonBlock className="h-32 rounded-3xl" />
          </aside>
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function CollectionsSkeleton() {
  return (
    <SkeletonRegion label="Loading collections">
      <header className="border-b border-border/60 pb-8">
        <SkeletonBlock className="h-3 w-32" />
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <SkeletonBlock className="h-9 w-56" />
            <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />
          </div>
          <SkeletonBlock className="h-11 w-40 rounded-full" />
        </div>
      </header>
      <div className="mx-auto mt-7 max-w-container-xl">
        <SkeletonBlock className="h-14 w-full rounded-3xl" />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-3xl border border-border/60 bg-surface-elevated p-4"
            >
              <SkeletonBlock className="aspect-[1.8/1] rounded-2xl" />
              <SkeletonBlock className="mt-4 h-5 w-2/3" />
              <SkeletonBlock className="mt-3 h-3 w-1/3" />
              <SkeletonBlock className="mt-4 h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function SearchSkeleton() {
  return (
    <SkeletonRegion label="Loading search">
      <header>
        <SkeletonBlock className="h-3 w-32" />
        <SkeletonBlock className="mt-4 h-9 w-40" />
        <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />
      </header>
      <SkeletonBlock className="mt-8 h-14 w-full rounded-3xl" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBlock key={index} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="mx-auto mt-8 max-w-container-xl">
        <SkeletonBlock className="mb-5 h-6 w-28" />
        <BookmarkGridSkeleton count={4} />
      </div>
    </SkeletonRegion>
  );
}

export function CollectionDetailSkeleton() {
  return (
    <SkeletonRegion label="Loading collection">
      <div className="mx-auto max-w-container-xl">
        <SkeletonBlock className="h-9 w-28 rounded-full" />
        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <SkeletonBlock className="h-9 w-64 max-w-full" />
            <SkeletonBlock className="mt-3 h-4 w-28" />
            <SkeletonBlock className="mt-3 h-4 w-96 max-w-full" />
          </div>
          <SkeletonBlock className="h-11 w-40 rounded-full" />
        </div>
        <SkeletonBlock className="mt-8 h-12 w-full rounded-2xl" />
        <div className="mt-6">
          <BookmarkGridSkeleton />
        </div>
      </div>
    </SkeletonRegion>
  );
}
