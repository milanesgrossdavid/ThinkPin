type AnnouncementBarProps = {
  message?: string;
  actionLabel?: string;
  href?: string;
};

export function AnnouncementBar({
  message = "Your Internet, finally organized",
  actionLabel = "See how it works",
  href = "#how-it-works",
}: AnnouncementBarProps) {
  return (
    <aside
      aria-label="Announcement"
      className="flex min-h-9 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-primary px-4 py-2 text-center text-[13px] leading-5 text-primary-foreground"
    >
      <span>
        <span aria-hidden="true" className="mr-2">
          ✦
        </span>
        {message}
      </span>
      <a
        className="shrink-0 font-medium underline decoration-primary-foreground/50 underline-offset-2 transition-opacity hover:opacity-80 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
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
