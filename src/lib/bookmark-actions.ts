"use client";

import {
  deleteBookmarkAction,
  updateBookmarkAction,
} from "../app/actions/bookmarks";
import {
  removeSavedBookmark,
  updateBookmarkDetailState,
  updateSavedBookmark,
  type BookmarkDetailState,
} from "./bookmarks";

export type BookmarkActions = {
  setFavorite: (bookmarkId: string, favorite: boolean) => Promise<boolean>;
  setUnread: (
    bookmarkId: string,
    unread: boolean,
    notifyUser?: boolean,
  ) => Promise<boolean>;
  setArchived: (bookmarkId: string, archived: boolean) => Promise<boolean>;
  updateDetails: (
    bookmarkId: string,
    updates: Pick<
      BookmarkDetailState,
      | "title"
      | "description"
      | "collection"
      | "tags"
      | "intent"
      | "notes"
      | "savedReason"
    >,
  ) => Promise<boolean>;
  setDeleted: (bookmarkId: string, deleted: boolean) => Promise<boolean>;
};

type Notify = {
  success: (title: string) => void;
  error: (title: string, description: string) => void;
};

export function createBookmarkActions(notify: Notify): BookmarkActions {
  async function update(
    bookmarkId: string,
    updates: BookmarkDetailState,
    successMessage: string | null,
  ) {
    try {
      const result = await updateBookmarkAction(bookmarkId, updates);
      if (!result.ok) {
        notify.error("Couldn't update this bookmark", result.error);
        return false;
      }

      try {
        updateBookmarkDetailState(bookmarkId, updates);
        updateSavedBookmark(bookmarkId, {
          ...(updates.title !== undefined ? { title: updates.title } : {}),
          ...(updates.description !== undefined
            ? { description: updates.description }
            : {}),
          ...(updates.savedReason !== undefined
            ? { savedReason: updates.savedReason }
            : {}),
          ...(updates.collection !== undefined
            ? { collection: updates.collection }
            : {}),
          ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
          ...(updates.intent !== undefined ? { intent: updates.intent ?? undefined } : {}),
          ...(updates.favorite !== undefined
            ? { favorite: updates.favorite }
            : {}),
          ...(updates.archived !== undefined
            ? { archived: updates.archived }
            : {}),
        });
      } catch (error) {
        console.error(
          "Bookmark was persisted but its browser cache could not be updated.",
          error,
        );
      }

      if (successMessage) notify.success(successMessage);
      return true;
    } catch (error) {
      notify.error(
        "Couldn't update this bookmark",
        error instanceof Error
          ? error.message
          : "Try again in a moment.",
      );
      return false;
    }
  }

  return {
    setFavorite(bookmarkId, favorite) {
      return update(
        bookmarkId,
        { favorite },
        favorite ? "Added to favorites" : "Removed from favorites",
      );
    },
    setUnread(bookmarkId, unread, notifyUser = true) {
      return update(
        bookmarkId,
        { unread },
        notifyUser
          ? unread
            ? "Marked as unread"
            : "Marked as read"
          : null,
      );
    },
    setArchived(bookmarkId, archived) {
      return update(
        bookmarkId,
        { archived },
        archived ? "Archived" : "Restored from archive",
      );
    },
    updateDetails(bookmarkId, updates) {
      return update(
        bookmarkId,
        updates,
        updates.notes !== undefined
          ? updates.notes.trim()
            ? "Note added"
            : "Note removed"
          : updates.title ||
              updates.description !== undefined ||
              updates.savedReason !== undefined ||
              updates.intent !== undefined
            ? "Changes saved"
            : updates.collection
              ? `Moved to ${updates.collection}`
              : "Tags updated",
      );
    },
    async setDeleted(bookmarkId, deleted) {
      if (!deleted) {
        notify.error(
          "Couldn't restore this bookmark",
          "Deleted bookmarks can't be restored.",
        );
        return false;
      }

      try {
        const result = await deleteBookmarkAction(bookmarkId);
        if (!result.ok) {
          notify.error("Couldn't delete this bookmark", result.error);
          return false;
        }
        try {
          removeSavedBookmark(bookmarkId);
        } catch (error) {
          console.error(
            "Bookmark was deleted but its browser cache could not be updated.",
            error,
          );
        }
        return true;
      } catch (error) {
        notify.error(
          "Couldn't delete this bookmark",
          error instanceof Error ? error.message : "Try again in a moment.",
        );
        return false;
      }
    },
  };
}
