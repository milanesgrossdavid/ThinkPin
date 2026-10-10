import { describe, expect, it } from "vitest";
import {
  clearPendingBookmark,
  pendingBookmarkStorageKey,
  readPendingBookmark,
  savePendingBookmark,
} from "../../src/lib/bookmarks/pending-bookmark";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("pending onboarding bookmark", () => {
  it("normalizes and persists an HTTP bookmark separately until account sync", () => {
    const storage = createStorage();

    expect(savePendingBookmark(storage, "example.com/article")).toBe(
      "https://example.com/article",
    );
    expect(storage.getItem(pendingBookmarkStorageKey)).toBe(
      "https://example.com/article",
    );
    expect(readPendingBookmark(storage)).toBe("https://example.com/article");
  });

  it("clears only the URL that was successfully synchronized", () => {
    const storage = createStorage();
    savePendingBookmark(storage, "https://example.com/first");

    expect(
      clearPendingBookmark(storage, "https://example.com/another"),
    ).toBe(false);
    expect(readPendingBookmark(storage)).toBe("https://example.com/first");
    expect(
      clearPendingBookmark(storage, "https://example.com/first"),
    ).toBe(true);
    expect(readPendingBookmark(storage)).toBeNull();
  });

  it.each([
    "javascript:alert(1)",
    "https://user:password@example.com/",
    "http://",
    `https://example.com/${"a".repeat(2048)}`,
  ])("rejects invalid or unsafe bookmark URL %s", (url) => {
    expect(() => savePendingBookmark(createStorage(), url)).toThrow();
  });
});
