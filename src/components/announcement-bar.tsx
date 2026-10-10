type AnnouncementBarProps = {
  message?: string;
  actionLabel?: string;
  href?: string;
};

export function AnnouncementBar({
  message = "Your useful links, finally organized",
  actionLabel = "See how it works",
  href = "#how-it-works",
}: AnnouncementBarProps) {
  return (
    <aside
      aria-label="Announcement"
      className="flex min-h-9 flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#1d1d1f] px-4 py-1.5 text-center text-xs leading-5 text-white dark:bg-white dark:text-[#1d1d1f]"
    >
      <span>
        <span aria-hidden="true" className="mr-2">
          ✦
        </span>
        {message}
      </span>
      <a
        className="shrink-0 font-medium text-white/80 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:text-[#1d1d1f]/70 dark:hover:text-[#1d1d1f] dark:focus-visible:outline-[#1d1d1f]"
        href={href}
      >
        {actionLabel}
        <span aria-hidden="true" className="ml-1">
          →
        </span>
      </a>
    </aside>
  );
}
