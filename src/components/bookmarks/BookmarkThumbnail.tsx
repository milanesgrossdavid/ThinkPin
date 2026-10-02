import type { LucideIcon } from "lucide-react";

type BookmarkThumbnailProps = {
  icon: LucideIcon;
  topic: string;
  artwork: string;
  thumbnailUrl?: string;
  variant?: "grid" | "list" | "compact";
};

export function BookmarkThumbnail({
  icon: Icon,
  topic,
  artwork,
  thumbnailUrl,
  variant = "grid",
}: BookmarkThumbnailProps) {
  const isGrid = variant === "grid";
  const isCompact = variant === "compact";

  return (
    <div
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br ${artwork} ${
        isGrid
          ? "aspect-video w-full rounded-t-3xl"
          : isCompact
            ? "size-9 rounded-lg"
            : "size-12 rounded-xl sm:size-14"
      }`}
    >
      {thumbnailUrl && (
        // Remote Open Graph thumbnails may come from any site; keep native loading unoptimized.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
      {isGrid && (
        <>
          <div className="absolute size-36 rounded-full border border-text/5" />
          <div className="absolute size-24 rounded-full border border-text/5" />
        </>
      )}
      <span
        className={`relative flex items-center justify-center border border-white/60 bg-white/70 text-text shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10 dark:text-text ${
          isGrid ? "size-12 rounded-xl" : isCompact ? "size-6 rounded-md" : "size-7 rounded-lg"
        }`}
      >
        <Icon
          aria-hidden="true"
          className={isGrid ? "size-5" : isCompact ? "size-3.5" : "size-3.5"}
        />
      </span>
      {isGrid && (
        <span className="absolute bottom-3 left-3 rounded-full border border-border/40 bg-surface-elevated/85 px-2.5 py-1 text-[10px] font-medium text-text-muted backdrop-blur-sm">
          {topic}
        </span>
      )}
    </div>
  );
}
