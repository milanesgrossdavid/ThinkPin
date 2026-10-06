export type BookmarkActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
