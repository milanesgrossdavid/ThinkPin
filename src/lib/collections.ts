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

export function defaultCollectionId(name: string) {
  return `default-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

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

export function setCollectionBookmarkIds(
  collectionId: string,
  bookmarkIds: string[],
) {
  const memberships = loadMemberships(getMembershipsSnapshot());
  memberships[collectionId] = [...new Set(bookmarkIds)];
  window.localStorage.setItem(
    collectionMembershipsStorageKey,
    JSON.stringify(memberships),
  );
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

function saveCollections(collections: SavedCollection[]) {
  window.localStorage.setItem(collectionsStorageKey, JSON.stringify(collections));
  window.dispatchEvent(new Event(collectionsChangedEvent));
}

export function createCollection(
  name: string,
  existingNames: string[],
  description = "",
) {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!normalizedName) {
    throw new Error("Enter a name for this collection.");
  }
  if (
    existingNames.some(
      (existingName) =>
        existingName.toLowerCase() === normalizedName.toLowerCase(),
    )
  ) {
    throw new Error("A collection with this name already exists.");
  }

  const collections = loadCollections(getCollectionsSnapshot());
  const collection: SavedCollection = {
    id: window.crypto.randomUUID(),
    name: normalizedName,
    createdAt: new Date().toISOString(),
    description: description.trim().replace(/\s+/g, " "),
  };
  saveCollections([...collections, collection]);
  return collection;
}

export function renameCollection(
  collectionId: string,
  name: string,
  existingNames: string[],
) {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!normalizedName) {
    throw new Error("Enter a name for this collection.");
  }
  if (
    existingNames.some(
      (existingName) =>
        existingName.toLowerCase() === normalizedName.toLowerCase(),
    )
  ) {
    throw new Error("A collection with this name already exists.");
  }

  const collections = loadCollections(getCollectionsSnapshot());
  const index = collections.findIndex((item) => item.id === collectionId);
  if (index === -1) {
    throw new Error("This collection can no longer be found.");
  }

  const previousName = collections[index].name;
  collections[index] = { ...collections[index], name: normalizedName };

  const bookmarkData = window.localStorage.getItem("thinkpin-bookmarks");
  const parsedBookmarks: unknown = bookmarkData
    ? JSON.parse(bookmarkData)
    : [];
  if (!Array.isArray(parsedBookmarks)) {
    throw new Error("Saved bookmark data is invalid.");
  }
  const updatedBookmarks = parsedBookmarks.map((bookmark) => {
    if (
      typeof bookmark !== "object" ||
      bookmark === null ||
      !("collection" in bookmark) ||
      bookmark.collection !== previousName
    ) {
      return bookmark;
    }
    return { ...bookmark, collection: normalizedName };
  });

  const detailPrefix = "thinkpin-bookmarks:detail:";
  const detailKeys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(detailPrefix)) {
      detailKeys.push(key);
    }
  }
  const detailUpdates = detailKeys.flatMap((key) => {
    const value = window.localStorage.getItem(key);
    if (!value) {
      return [];
    }
    let detail: unknown;
    try {
      detail = JSON.parse(value);
    } catch {
      throw new Error("Saved bookmark details are invalid.");
    }
    if (
      typeof detail !== "object" ||
      detail === null ||
      Array.isArray(detail)
    ) {
      throw new Error("Saved bookmark details are invalid.");
    }
    if (!("collection" in detail) || detail.collection !== previousName) {
      return [];
    }
    return [
      [
        key,
        JSON.stringify({ ...detail, collection: normalizedName }),
      ] as const,
    ];
  });

  saveCollections(collections);
  window.localStorage.setItem(
    "thinkpin-bookmarks",
    JSON.stringify(updatedBookmarks),
  );
  window.dispatchEvent(new Event("thinkpin:bookmarks-change"));
  detailUpdates.forEach(([key, value]) => {
    window.localStorage.setItem(key, value);
  });
  if (detailUpdates.length > 0) {
    window.dispatchEvent(new Event("thinkpin:bookmark-detail-change"));
  }
  return collections[index];
}
