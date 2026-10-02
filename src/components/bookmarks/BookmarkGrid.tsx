import { BookmarkCard } from "./BookmarkCard";
import type { Bookmark } from "./types";

type BookmarkGridProps = {
  bookmarks: Bookmark[];
  labelledBy?: string;
  id?: string;
  onFavoriteChange?: (bookmarkId: string, favorite: boolean) => void;
  onUnreadChange?: (bookmarkId: string, unread: boolean) => void;
};

export function BookmarkGrid({
  bookmarks,
  labelledBy,
  id,
  onFavoriteChange,
  onUnreadChange,
}: BookmarkGridProps) {
  return (
    <ul
      id={id}
      aria-labelledby={labelledBy}
      className="grid list-none gap-4 p-0 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"
    >
      {bookmarks.map((bookmark) => (
        <li key={bookmark.id} className="min-w-0">
          <BookmarkCard
            bookmark={bookmark}
            onFavoriteChange={onFavoriteChange}
            onUnreadChange={onUnreadChange}
          />
        </li>
      ))}
    </ul>
  );
}
