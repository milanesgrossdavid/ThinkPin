import type { DashboardStats } from "@/types";

export type { DashboardStats } from "../../types/dashboard";

const statLabels = [
  { key: "bookmarkCount", label: "Bookmarks" },
  { key: "collectionCount", label: "Collections" },
  { key: "topicCount", label: "Topics" },
] as const;

export function StatsOverview({ stats }: { stats: DashboardStats }) {
  return (
    <section
      aria-label="Your memory at a glance"
      className="px-5 py-6 sm:px-8 sm:py-8 lg:px-12"
    >
      <div className="mx-auto grid max-w-container-xl grid-cols-3 gap-2.5 sm:gap-4">
        {statLabels.map(({ key, label }) => (
          <article
            key={key}
            className="min-w-0 rounded-2xl border border-border/60 bg-surface-elevated p-3.5 shadow-sm sm:rounded-3xl sm:p-6 sm:flex "
          >
            <p className="text-2xl font-semibold leading-none tracking-[-0.04em] text-text tabular-nums text-center sm:text-left sm:text-3xl sm:mr-2">
              {stats[key].toLocaleString()}
            </p>
            <h2 className="mt-2 text-[11px] font-medium leading-4 text-text-muted text-center sm:text-left sm:mt-3 sm:text-sm ">
              {label}
            </h2>
          </article>
        ))}
      </div>
    </section>
  );
}