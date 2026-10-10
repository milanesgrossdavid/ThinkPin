import { normalizeBookmarkUrl } from "../bookmarks";
import { validateBookmarkUrl } from "./validate-url";

export const pendingBookmarkStorageKey = "thinkpin-pending-bookmark";

type BookmarkStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function savePendingBookmark(storage: BookmarkStorage, value: string) {
  const url = validateBookmarkUrl(
    normalizeBookmarkUrl(value).toString(),
  ).normalizedUrl;
  storage.setItem(pendingBookmarkStorageKey, url);
  return url;
}

export function readPendingBookmark(storage: BookmarkStorage) {
  const value = storage.getItem(pendingBookmarkStorageKey);
  if (value === null) return null;
  return validateBookmarkUrl(value).normalizedUrl;
}

export function clearPendingBookmark(
  storage: BookmarkStorage,
  expectedUrl: string,
) {
  const current = storage.getItem(pendingBookmarkStorageKey);
  if (current !== expectedUrl) return false;
  storage.removeItem(pendingBookmarkStorageKey);
  return true;
}
