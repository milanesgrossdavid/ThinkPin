"use client";

import {
  getCollectionsSnapshot,
  getMembershipsSnapshot,
  loadCollections,
  loadMemberships,
  replacePrivateCollectionsCache,
  type CollectionMemberships,
  type SavedCollection,
} from "../collections";
import {
  getBookmarkDetailSnapshot,
  getBookmarksSnapshot,
  loadSavedBookmarks,
  readBookmarkDetailState,
} from "../bookmarks";

type PrivateCollectionResponse = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  bookmarkIds: string[];
};

let synchronization: Promise<void> | null = null;

async function requestCollections(
  url: string,
  init?: RequestInit,
): Promise<PrivateCollectionResponse[]> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  const result: unknown = await response.json();
  if (
    !response.ok ||
    typeof result !== "object" ||
    result === null ||
    !("collections" in result) ||
    !Array.isArray(result.collections)
  ) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "Collections could not be synchronized.";
    throw new Error(message);
  }
  return result.collections as PrivateCollectionResponse[];
}

function updateCache(collections: PrivateCollectionResponse[]) {
  const saved: SavedCollection[] = collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    description: collection.description,
    createdAt: collection.createdAt,
  }));
  const memberships: CollectionMemberships = Object.fromEntries(
    collections.map((collection) => [collection.id, collection.bookmarkIds]),
  );
  replacePrivateCollectionsCache(saved, memberships);
}

export function syncPrivateCollections(): Promise<void> {
  if (synchronization) return synchronization;

  synchronization = (async () => {
    let collections = await requestCollections("/api/collections", {
      cache: "no-store",
    });

    const existingNames = new Set(
      collections.map((collection) => collection.name.toLocaleLowerCase()),
    );
    const legacyCollections = loadCollections(getCollectionsSnapshot()).filter(
      (collection) => !existingNames.has(collection.name.toLocaleLowerCase()),
    );
    if (legacyCollections.length > 0) {
      const legacyMemberships = loadMemberships(getMembershipsSnapshot());
      const bookmarks = loadSavedBookmarks(getBookmarksSnapshot());
      collections = await requestCollections("/api/collections", {
        method: "POST",
        body: JSON.stringify({
          operation: "migrate",
          collections: legacyCollections,
          memberships: Object.fromEntries(
            legacyCollections.map((collection) => {
              if (Object.hasOwn(legacyMemberships, collection.id)) {
                return [collection.id, legacyMemberships[collection.id]];
              }
              return [
                collection.id,
                bookmarks
                  .filter((bookmark) => {
                    const details = readBookmarkDetailState(
                      getBookmarkDetailSnapshot(bookmark.id),
                    );
                    return (
                      !details?.archived &&
                      !details?.deleted &&
                      (details?.collection ?? bookmark.collection).toLocaleLowerCase() ===
                        collection.name.toLocaleLowerCase()
                    );
                  })
                  .map((bookmark) => bookmark.id),
              ];
            }),
          ),
        }),
      });
    }

    updateCache(collections);
  })().finally(() => {
    synchronization = null;
  });
  return synchronization;
}

export async function mutatePrivateCollection(
  operation: "create" | "rename" | "members",
  input: Record<string, unknown>,
) {
  const response = await fetch("/api/collections", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation, ...input }),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "The collection could not be saved.";
    throw new Error(message);
  }
  if (synchronization) {
    try {
      await synchronization;
    } catch (error) {
      console.warn("Initial collection synchronization failed before refresh.", error);
    }
  }
  await syncPrivateCollections();
}
