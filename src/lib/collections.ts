export const collectionsStorageKey = "thinkpin-collections";
export const collectionMembershipsStorageKey = "thinkpin-collection-memberships";
const collectionsChangedEvent = "thinkpin:collections-change";
const membershipsChangedEvent = "thinkpin:collection-memberships-change";

export type SavedCollection = {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
};

export type CollectionMemberships = Record<string, string[]>;

export function subscribeToMemberships(onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === collectionMembershipsStorageKey || event.key === null) {
      onChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(membershipsChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(membershipsChangedEvent, onChange);
  };
}

export function getMembershipsSnapshot() {
  try {
    return window.localStorage.getItem(collectionMembershipsStorageKey) ?? "";
  } catch {
    return null;
  }
}

export function getServerMembershipsSnapshot() {
  return "";
}

export function loadMemberships(snapshot: string | null): CollectionMemberships {
  if (!snapshot) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new Error("Collection memberships data is invalid.");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    !Object.values(parsed).every(
      (bookmarkIds) =>
        Array.isArray(bookmarkIds) &&
        bookmarkIds.every((bookmarkId) => typeof bookmarkId === "string"),
    )
  ) {
    throw new Error("Collection memberships data is invalid.");
  }
  return parsed as CollectionMemberships;
}

export function bookmarkIdsForCollection(
  collectionId: string,
  collectionName: string,
  bookmarks: Array<{ id: string; topic: string }>,
  memberships: CollectionMemberships,
) {
  if (Object.hasOwn(memberships, collectionId)) {
    return new Set(memberships[collectionId]);
  }
  return new Set(
    bookmarks
      .filter((bookmark) => bookmark.topic === collectionName)
      .map((bookmark) => bookmark.id),
  );
}

export function replacePrivateCollectionsCache(
  collections: SavedCollection[],
  memberships: CollectionMemberships,
) {
  window.localStorage.setItem(collectionsStorageKey, JSON.stringify(collections));
  window.localStorage.setItem(
    collectionMembershipsStorageKey,
    JSON.stringify(memberships),
  );
  window.dispatchEvent(new Event(collectionsChangedEvent));
  window.dispatchEvent(new Event(membershipsChangedEvent));
}

export function subscribeToCollections(onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === collectionsStorageKey || event.key === null) {
      onChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(collectionsChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(collectionsChangedEvent, onChange);
  };
}

export function getCollectionsSnapshot() {
  try {
    return window.localStorage.getItem(collectionsStorageKey) ?? "";
  } catch {
    return null;
  }
}

export function getServerCollectionsSnapshot() {
  return "";
}

export function loadCollections(snapshot: string | null): SavedCollection[] {
  if (!snapshot) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new Error("Saved collections data is invalid.");
  }

  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string" &&
        "name" in item &&
        typeof item.name === "string" &&
        "createdAt" in item &&
        typeof item.createdAt === "string" &&
        (!("description" in item) || typeof item.description === "string"),
    )
  ) {
    throw new Error("Saved collections data is invalid.");
  }

  return parsed;
}
