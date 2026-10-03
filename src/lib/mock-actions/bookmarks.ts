import {
  getBookmarkDetailSnapshot,
  readBookmarkDetailState,
  saveBookmarkImmediately,
  suggestBookmarkOrganization,
  updateBookmarkDetailState,
  updateSavedBookmark,
  type BookmarkSuggestions,
  type BookmarkDetailState,
} from "../bookmarks";

export type BookmarkActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function simulateRequest() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 400));
}

export type MockBookmarkPreview = {
  url: string;
  domain: string;
  title: string;
  description: string;
  collection: string;
  tags: string[];
  intent: BookmarkDetailState["intent"];
};

export async function mockAnalyzeBookmark(
  value: string,
): Promise<BookmarkActionResult<MockBookmarkPreview>> {
  await simulateRequest();
  try {
    const url = new URL(value);
    const suggestions = suggestBookmarkOrganization(
      url.hostname.replace(/^www\./, ""),
    );
    const tags =
      url.hostname.includes("github.com") &&
      /next.?auth|auth/i.test(url.pathname)
        ? ["Next.js", "Authentication", "React"]
        : suggestions.tags;
    const lastSegment = url.pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.replace(/\.[a-z0-9]+$/i, "");
    const title = (lastSegment ?? url.hostname)
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());

    return {
      success: true,
      data: {
        url: url.toString(),
        domain: url.hostname.replace(/^www\./, ""),
        title,
        description: `A link from ${url.hostname.replace(/^www\./, "")}, ready to organize in your memory.`,
        collection: suggestions.collection,
        tags,
        intent: "Research",
      },
    };
  } catch {
    return { success: false, error: "Please enter a valid URL." };
  }
}

export async function mockSaveAnalyzedBookmark(
  preview: MockBookmarkPreview,
): Promise<BookmarkActionResult<{ bookmarkId: string }>> {
  await simulateRequest();
  try {
    const result = saveBookmarkImmediately(preview.url, {
      collection: preview.collection,
      tags: preview.tags,
    });
    updateSavedBookmark(result.bookmark.id, {
      title: preview.title,
      description: preview.description,
      collection: preview.collection,
      tags: preview.tags,
      intent: preview.intent,
    });
    return {
      success: true,
      data: { bookmarkId: result.bookmark.id },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "We couldn't save this link. Check browser storage permissions and try again.",
    };
  }
}

export async function mockSaveBookmark(
  value: string,
  suggestions?: BookmarkSuggestions,
): Promise<BookmarkActionResult<ReturnType<typeof saveBookmarkImmediately>>> {
  await simulateRequest();
  try {
    return {
      success: true,
      data: saveBookmarkImmediately(value, suggestions),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "We couldn't save this link. Check browser storage permissions and try again.",
    };
  }
}

async function updateBookmark(
  bookmarkId: string,
  updates: BookmarkDetailState,
  activity: string,
): Promise<BookmarkActionResult<{ bookmarkId: string }>> {
  await simulateRequest();

  try {
    const current = readBookmarkDetailState(
      getBookmarkDetailSnapshot(bookmarkId),
    );
    updateBookmarkDetailState(bookmarkId, {
      ...updates,
      activity: [
        { action: activity, at: new Date().toISOString() },
        ...(current.activity ?? []),
      ],
    });
    return { success: true, data: { bookmarkId } };
  } catch {
    return {
      success: false,
      error: "Check browser storage permissions and try again.",
    };
  }
}

export function mockToggleFavorite(bookmarkId: string, favorite: boolean) {
  return updateBookmark(
    bookmarkId,
    { favorite },
    favorite ? "Added to favorites" : "Removed from favorites",
  );
}

export function mockSetUnread(bookmarkId: string, unread: boolean) {
  return updateBookmark(
    bookmarkId,
    { unread },
    unread ? "Marked as unread" : "Marked as read",
  );
}

export function mockSetArchived(bookmarkId: string, archived: boolean) {
  return updateBookmark(
    bookmarkId,
    { archived },
    archived ? "Archived" : "Restored from archive",
  );
}

export function mockUpdateBookmarkDetails(
  bookmarkId: string,
  updates: Pick<
    BookmarkDetailState,
    "title" | "description" | "collection" | "tags" | "intent" | "notes"
  >,
) {
  const activity = updates.title || updates.description || updates.intent || updates.notes
    ? "Updated bookmark"
    : updates.collection
      ? `Moved to ${updates.collection}`
      : "Updated tags";
  return updateBookmark(bookmarkId, updates, activity);
}

export function mockSetBookmarkDeleted(bookmarkId: string, deleted: boolean) {
  return updateBookmark(
    bookmarkId,
    { deleted },
    deleted ? "Deleted bookmark" : "Restored bookmark",
  );
}
