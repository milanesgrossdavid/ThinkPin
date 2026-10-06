import {
  createCollection,
  renameCollection,
  setCollectionBookmarkIds,
  type SavedCollection,
} from "../collections";
import type { BookmarkActionResult } from "./result";

function simulateRequest() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 400));
}

export async function mockCreateCollection(
  name: string,
  existingNames: string[],
  description = "",
): Promise<BookmarkActionResult<SavedCollection>> {
  await simulateRequest();
  try {
    return {
      success: true,
      data: createCollection(name, existingNames, description),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "We couldn't create this collection. Please try again.",
    };
  }
}

export async function mockRenameCollection(
  collectionId: string,
  name: string,
  existingNames: string[],
): Promise<BookmarkActionResult<SavedCollection>> {
  await simulateRequest();
  try {
    return {
      success: true,
      data: renameCollection(collectionId, name, existingNames),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "We couldn't rename this collection. Please try again.",
    };
  }
}

export async function mockSetCollectionBookmarkIds(
  collectionId: string,
  bookmarkIds: string[],
): Promise<BookmarkActionResult<{ collectionId: string }>> {
  await simulateRequest();
  try {
    setCollectionBookmarkIds(collectionId, bookmarkIds);
    return { success: true, data: { collectionId } };
  } catch {
    return {
      success: false,
      error: "Check browser storage permissions and try again.",
    };
  }
}
