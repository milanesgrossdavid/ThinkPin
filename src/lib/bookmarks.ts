export const bookmarksStorageKey = "thinkpin-bookmarks";

export type BookmarkIntent =
  | "Research"
  | "Learn"
  | "Buy"
  | "Reference"
  | "Project"
  | "Inspiration";

export type BookmarkDetailActivity = {
  action: string;
  at: string;
};

export type BookmarkDetailState = {
  title?: string;
  description?: string;
  favorite?: boolean;
  unread?: boolean;
  archived?: boolean;
  deleted?: boolean;
  notes?: string;
  intent?: BookmarkIntent;
  collection?: string;
  tags?: string[];
  activity?: BookmarkDetailActivity[];
};

export type SavedBookmark = {
  id: string;
  url: string;
  domain: string;
  savedAt: string;
  title: string;
  description: string;
  collection: string;
  tags: string[];
  intent?: BookmarkIntent;
  favorite?: boolean;
  archived?: boolean;
};

export type BookmarkSuggestions = {
  collection: string;
  tags: string[];
};

type StoredBookmark = Record<string, unknown> & { url: string };
const bookmarkIntents: BookmarkIntent[] = [
  "Research",
  "Learn",
  "Buy",
  "Reference",
  "Project",
  "Inspiration",
];
const bookmarksChangedEvent = "thinkpin:bookmarks-change";
const bookmarkDetailChangedEvent = "thinkpin:bookmark-detail-change";

function bookmarkDetailStorageKey(bookmarkId: string) {
  return `${bookmarksStorageKey}:detail:${bookmarkId}`;
}

export function subscribeToBookmarkDetail(
  bookmarkId: string,
  onChange: () => void,
) {
  function handleStorage(event: StorageEvent) {
    if (
      event.key === bookmarkDetailStorageKey(bookmarkId) ||
      event.key === null
    ) {
      onChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(bookmarkDetailChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(bookmarkDetailChangedEvent, onChange);
  };
}

export function subscribeToBookmarkDetails(onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (
      event.key?.startsWith(`${bookmarksStorageKey}:detail:`) ||
      event.key === null
    ) {
      onChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(bookmarkDetailChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(bookmarkDetailChangedEvent, onChange);
  };
}

export function getBookmarkDetailsSnapshot() {
  try {
    const prefix = `${bookmarksStorageKey}:detail:`;
    const details: Array<[string, string]> = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(prefix)) {
        const value = window.localStorage.getItem(key);
        if (value !== null) {
          details.push([key.slice(prefix.length), value]);
        }
      }
    }
    return JSON.stringify(details);
  } catch {
    return null;
  }
}

export function getServerBookmarkDetailsSnapshot() {
  return "[]";
}

export function getBookmarkDetailSnapshot(bookmarkId: string) {
  try {
    return window.localStorage.getItem(bookmarkDetailStorageKey(bookmarkId)) ?? "";
  } catch {
    return null;
  }
}

export function getServerBookmarkDetailSnapshot() {
  return "";
}

export function readBookmarkDetailState(snapshot: string | null): BookmarkDetailState {
  if (!snapshot) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("Saved bookmark details are invalid.");
    }

    const value = parsed as Record<string, unknown>;
    const state: BookmarkDetailState = {};
    if (typeof value.title === "string") state.title = value.title;
    if (typeof value.description === "string") {
      state.description = value.description;
    }
    if (typeof value.favorite === "boolean") state.favorite = value.favorite;
    if (typeof value.unread === "boolean") state.unread = value.unread;
    if (typeof value.archived === "boolean") state.archived = value.archived;
    if (typeof value.deleted === "boolean") state.deleted = value.deleted;
    if (typeof value.notes === "string") state.notes = value.notes;
    if (isBookmarkIntent(value.intent)) state.intent = value.intent;
    if (typeof value.collection === "string") {
      state.collection = value.collection;
    }
    if (Array.isArray(value.tags)) {
      state.tags = value.tags.filter(
        (tag): tag is string => typeof tag === "string",
      );
    }
    if (Array.isArray(value.activity)) {
      state.activity = value.activity.filter(
        (entry): entry is BookmarkDetailActivity =>
          typeof entry === "object" &&
          entry !== null &&
          "action" in entry &&
          typeof entry.action === "string" &&
          "at" in entry &&
          typeof entry.at === "string",
      );
    }
    return state;
  } catch {
    throw new Error("Saved bookmark details are invalid.");
  }
}

export function updateBookmarkDetailState(
  bookmarkId: string,
  updates: BookmarkDetailState,
) {
  const key = bookmarkDetailStorageKey(bookmarkId);
  const current = readBookmarkDetailState(
    window.localStorage.getItem(key),
  );
  const next = { ...current, ...updates };
  const bookmarks = readBookmarks();
  const bookmarkIndex = bookmarks.findIndex(
    (bookmark) => bookmark.id === bookmarkId,
  );

  window.localStorage.setItem(key, JSON.stringify(next));
  if (bookmarkIndex !== -1) {
    bookmarks[bookmarkIndex] = {
      ...bookmarks[bookmarkIndex],
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.description !== undefined
        ? { description: updates.description }
        : {}),
      ...(updates.favorite !== undefined
        ? { favorite: updates.favorite }
        : {}),
      ...(updates.archived !== undefined
        ? { archived: updates.archived }
        : {}),
      ...(updates.unread !== undefined ? { unread: updates.unread } : {}),
      ...(updates.collection !== undefined
        ? { collection: updates.collection }
        : {}),
      ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
      ...(updates.intent !== undefined ? { intent: updates.intent } : {}),
    };
    writeBookmarks(bookmarks);
  }
  window.dispatchEvent(new Event(bookmarkDetailChangedEvent));
}

export function subscribeToBookmarks(onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === bookmarksStorageKey || event.key === null) {
      onChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(bookmarksChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(bookmarksChangedEvent, onChange);
  };
}

export function getBookmarksSnapshot() {
  try {
    return window.localStorage.getItem(bookmarksStorageKey) ?? "";
  } catch {
    return null;
  }
}

export function getServerBookmarksSnapshot() {
  return "";
}

function writeBookmarks(bookmarks: StoredBookmark[]) {
  window.localStorage.setItem(bookmarksStorageKey, JSON.stringify(bookmarks));
  window.dispatchEvent(new Event(bookmarksChangedEvent));
}

function isBookmarkIntent(value: unknown): value is BookmarkIntent {
  return (
    typeof value === "string" &&
    bookmarkIntents.some((intent) => intent === value)
  );
}

export function normalizeBookmarkUrl(value: string) {
  const input = value.trim();
  const url = new URL(
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input) ? input : `https://${input}`,
  );

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Enter a valid web link that starts with http or https.");
  }

  return url;
}

export function suggestBookmarkOrganization(domain: string): BookmarkSuggestions {
  const hostname = domain.toLowerCase();

  if (hostname.includes("github.com")) {
    return {
      collection: "Development",
      tags: ["Development", "Open source", "Reference"],
    };
  }
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    return {
      collection: "Learning",
      tags: ["Video", "Learning", "Watch later"],
    };
  }
  if (
    hostname.includes("amazon.") ||
    hostname.includes("etsy.") ||
    hostname.includes("shop")
  ) {
    return {
      collection: "Things to buy",
      tags: ["Shopping", "Product", "Compare"],
    };
  }

  return {
    collection: "Read later",
    tags: [hostname.split(".")[0], "Read later", "Reference"],
  };
}

function readBookmarks(
  saved: string | null = window.localStorage.getItem(bookmarksStorageKey),
): StoredBookmark[] {
  let parsed: unknown;
  try {
    parsed = saved ? JSON.parse(saved) : [];
  } catch {
    throw new Error("Stored bookmark data is invalid.");
  }

  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (bookmark) =>
        typeof bookmark === "object" &&
        bookmark !== null &&
        "url" in bookmark &&
        typeof bookmark.url === "string",
    )
  ) {
    throw new Error("Stored bookmark data is invalid.");
  }

  return parsed;
}

function titleFromUrl(url: URL) {
  const lastSegment = url.pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/\.[a-z0-9]+$/i, "");

  if (!lastSegment) {
    return url.hostname.replace(/^www\./, "");
  }

  let decodedSegment = lastSegment;
  try {
    decodedSegment = decodeURIComponent(lastSegment);
  } catch {
    decodedSegment = lastSegment;
  }

  return decodedSegment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function loadSavedBookmarks(
  snapshot?: string | null,
): SavedBookmark[] {
  return readBookmarks(snapshot).map((bookmark) => {
    const url = normalizeBookmarkUrl(bookmark.url);

    return {
      id:
        typeof bookmark.id === "string"
          ? bookmark.id
          : `saved-${encodeURIComponent(url.toString())}`,
      url: url.toString(),
      domain:
        typeof bookmark.domain === "string"
          ? bookmark.domain
          : url.hostname.replace(/^www\./, ""),
      savedAt:
        typeof bookmark.savedAt === "string"
          ? bookmark.savedAt
          : new Date().toISOString(),
      title:
        typeof bookmark.title === "string"
          ? bookmark.title
          : titleFromUrl(url),
      description:
        typeof bookmark.description === "string" ? bookmark.description : "",
      collection:
        typeof bookmark.collection === "string"
          ? bookmark.collection
          : "Unsorted",
      tags: Array.isArray(bookmark.tags)
        ? bookmark.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      ...(typeof bookmark.favorite === "boolean"
        ? { favorite: bookmark.favorite }
        : {}),
      ...(typeof bookmark.archived === "boolean"
        ? { archived: bookmark.archived }
        : {}),
      ...(isBookmarkIntent(bookmark.intent)
        ? { intent: bookmark.intent }
        : {}),
    };
  });
}

export function saveBookmarkImmediately(
  value: string,
  suggestions?: BookmarkSuggestions,
) {
  const url = normalizeBookmarkUrl(value);
  const normalizedUrl = url.toString();
  const bookmarks = readBookmarks();
  const existingIndex = bookmarks.findIndex((bookmark) => {
    try {
      return normalizeBookmarkUrl(bookmark.url).toString() === normalizedUrl;
    } catch {
      return false;
    }
  });

  if (existingIndex !== -1) {
    const existing = bookmarks[existingIndex];
    const saved: SavedBookmark = {
      id:
        typeof existing.id === "string" ? existing.id : window.crypto.randomUUID(),
      url: normalizedUrl,
      domain: url.hostname.replace(/^www\./, ""),
      savedAt:
        typeof existing.savedAt === "string"
          ? existing.savedAt
          : new Date().toISOString(),
      title: typeof existing.title === "string" ? existing.title : titleFromUrl(url),
      description:
        typeof existing.description === "string" ? existing.description : "",
      collection:
        typeof existing.collection === "string" ? existing.collection : "Unsorted",
      tags: Array.isArray(existing.tags)
        ? existing.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      ...(isBookmarkIntent(existing.intent) ? { intent: existing.intent } : {}),
    };
    bookmarks[existingIndex] = { ...existing, ...saved };
    writeBookmarks(bookmarks);
    return { bookmark: saved, alreadySaved: true };
  }

  const bookmark: SavedBookmark = {
    id: window.crypto.randomUUID(),
    url: normalizedUrl,
    domain: url.hostname.replace(/^www\./, ""),
    savedAt: new Date().toISOString(),
    title: titleFromUrl(url),
    description: "",
    collection: suggestions?.collection ?? "Unsorted",
    tags: suggestions?.tags ?? [],
  };
  bookmarks.unshift(bookmark);
  writeBookmarks(bookmarks);

  return { bookmark, alreadySaved: false };
}

export function updateSavedBookmark(
  bookmarkId: string,
  updates: Partial<
    Pick<SavedBookmark, "title" | "description" | "collection" | "tags" | "intent">
  >,
) {
  const bookmarks = readBookmarks();
  const index = bookmarks.findIndex((bookmark) => bookmark.id === bookmarkId);

  if (index === -1) {
    throw new Error("The saved bookmark could not be found.");
  }

  bookmarks[index] = { ...bookmarks[index], ...updates };
  writeBookmarks(bookmarks);
}
