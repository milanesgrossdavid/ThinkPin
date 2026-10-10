import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const searchBookmarks = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/search/repository", () => ({
  searchBookmarks,
  findBookmarkIdsMissingEmbeddings: vi.fn(),
  recordSearchEmbeddingUsage: vi.fn(),
}));

import { searchUserBookmarks } from "../../src/lib/search/service";

describe("bookmark search integration", () => {
  beforeEach(() => searchBookmarks.mockReset());

  it("returns matching bookmarks and ranks related topics by frequency", async () => {
    searchBookmarks.mockResolvedValue([
      {
        id: "bookmark-1",
        title: "Memory systems",
        tags: ["memory", "research"],
        collection: "Reading",
      },
      {
        id: "bookmark-2",
        title: "Knowledge management",
        tags: ["memory"],
        collection: "Reading",
      },
    ]);

    const result = await searchUserBookmarks(
      {} as SupabaseClient,
      null,
      "user-1",
      "  memory ",
      "keyword",
      { limit: 30 },
    );

    expect(result).toMatchObject({
      query: "memory",
      mode: "keyword",
      relatedTopics: ["memory", "Reading", "research"],
    });
    expect(result.results).toHaveLength(2);
    expect(searchBookmarks).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ query: "memory", mode: "keyword" }),
    );
  });
});
