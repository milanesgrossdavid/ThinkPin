import { BookmarkCard } from "./BookmarkCard";
import type { Bookmark, BookmarkView } from "./types";

type BookmarkListProps = {
  bookmarks: Bookmark[];
  labelledBy?: string;
  id?: string;
  variant?: Exclude<BookmarkView, "grid">;
  onFavoriteChange?: (bookmarkId: string, favorite: boolean) => void;
  onUnreadChange?: (bookmarkId: string, unread: boolean) => void;
};

export function BookmarkList({
  bookmarks,
  labelledBy,
  id,
  variant = "list",
  onFavoriteChange,
  onUnreadChange,
}: BookmarkListProps) {
  return (
    <ul
      id={id}
      aria-labelledby={labelledBy}
      className={`m-0 list-none p-0 ${
        variant === "compact" ? "space-y-1.5" : "space-y-3"
      }`}
    >
      {bookmarks.map((bookmark) => (
        <li key={bookmark.id}>
          <BookmarkCard
            bookmark={bookmark}
            variant={variant}
            onFavoriteChange={onFavoriteChange}
            onUnreadChange={onUnreadChange}
          />
        </li>
      ))}
    </ul>
  );
}
