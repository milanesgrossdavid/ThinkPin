import {
  mockSetArchived,
  mockSetBookmarkDeleted,
  mockSetUnread,
  mockToggleFavorite,
  mockUpdateBookmarkDetails,
} from "./mock-actions/bookmarks";
import type { BookmarkDetailState } from "./bookmarks";

export type BookmarkActions = {
  setFavorite: (bookmarkId: string, favorite: boolean) => Promise<boolean>;
  setUnread: (bookmarkId: string, unread: boolean) => Promise<boolean>;
  setArchived: (bookmarkId: string, archived: boolean) => Promise<boolean>;
  updateDetails: (
    bookmarkId: string,
    updates: Pick<
      BookmarkDetailState,
      "title" | "description" | "collection" | "tags" | "intent" | "notes"
    >,
  ) => Promise<boolean>;
  setDeleted: (bookmarkId: string, deleted: boolean) => Promise<boolean>;
};

type Notify = {
  success: (title: string) => void;
  error: (title: string, description: string) => void;
};

export function createLocalBookmarkActions(notify: Notify): BookmarkActions {
  async function run(
    action:
      | ReturnType<typeof mockToggleFavorite>
      | ReturnType<typeof mockSetUnread>
      | ReturnType<typeof mockUpdateBookmarkDetails>
      | ReturnType<typeof mockSetBookmarkDeleted>,
    successMessage: string | null,
  ): Promise<boolean> {
    try {
      const result = await action;
      if (!result.success) {
        notify.error("Couldn't update this bookmark", result.error);
        return false;
      }
      if (successMessage) {
        notify.success(successMessage);
      }
      return true;
    } catch (error) {
      notify.error(
        "Couldn't update this bookmark",
        error instanceof Error
          ? error.message
          : "Check browser storage permissions and try again.",
      );
      return false;
    }
  }

  return {
    setFavorite(bookmarkId, favorite) {
      return run(
        mockToggleFavorite(bookmarkId, favorite),
        favorite ? "Added to favorites" : "Removed from favorites",
      );
    },
    setUnread(bookmarkId, unread) {
      return run(
        mockSetUnread(bookmarkId, unread),
        unread ? "Marked as unread" : "Marked as read",
      );
    },
    setArchived(bookmarkId, archived) {
      return run(
        mockSetArchived(bookmarkId, archived),
        archived ? "Archived" : "Restored from archive",
      );
    },
    updateDetails(bookmarkId, updates) {
      return run(
        mockUpdateBookmarkDetails(bookmarkId, updates),
        updates.notes !== undefined
          ? updates.notes.trim()
            ? "Note added"
            : "Note removed"
          : updates.title ||
              updates.description !== undefined ||
              updates.intent !== undefined
            ? "Changes saved"
          : updates.collection
            ? `Bookmark moved to ${updates.collection}`
            : "Tags updated",
      );
    },
    setDeleted(bookmarkId, deleted) {
      return run(
        mockSetBookmarkDeleted(bookmarkId, deleted),
        deleted ? null : "Bookmark restored",
      );
    },
  };
}
