import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const repository = vi.hoisted(() => ({
  createBookmark: vi.fn(),
  findBookmarkById: vi.fn(),
  findBookmarkStatus: vi.fn(),
  replaceBookmarkTags: vi.fn(),
}));

vi.mock("../../src/lib/bookmarks/repository", () => ({
  createBookmark: repository.createBookmark,
  findBookmarkById: repository.findBookmarkById,
  findBookmarkStatus: repository.findBookmarkStatus,
  replaceBookmarkTags: repository.replaceBookmarkTags,
  updateBookmarkFields: vi.fn(),
}));

import {
  createBookmark,
  updateUserBookmark,
} from "../../src/lib/bookmarks/service";

const userClient = {} as SupabaseClient;
const createdBookmark = {
  id: "bookmark-1",
  url: "https://example.com/article",
  canonicalUrl: null,
  domain: "example.com",
  contentStatus: "pending" as const,
};

describe("bookmark service integration", () => {
  beforeEach(() => {
    repository.createBookmark.mockReset();
    repository.findBookmarkById.mockReset();
    repository.findBookmarkStatus.mockReset();
    repository.replaceBookmarkTags.mockReset();
  });

  it("creates a bookmark, normalizes its URL, and queues ingestion", async () => {
    repository.createBookmark.mockResolvedValue({
      duplicate: false,
      bookmark: createdBookmark,
    });
    const publishCreated = vi.fn().mockResolvedValue(undefined);

    const result = await createBookmark(
      {
        userClient,
        userId: "user-1",
        createAdminClient: () => userClient,
        publishCreated,
        enrichMissingTags: false,
      },
      "https://example.com/article?utm_source=mail#intro",
    );

    expect(result).toMatchObject({
      duplicate: false,
      bookmark: createdBookmark,
      processingQueued: true,
    });
    expect(repository.createBookmark).toHaveBeenCalledWith(
      userClient,
      expect.objectContaining({
        normalizedUrl: "https://example.com/article",
        userId: "user-1",
      }),
    );
    expect(publishCreated).toHaveBeenCalledWith("bookmark-1", "user-1");
  });

  it("returns an existing bookmark without queuing duplicate ingestion", async () => {
    repository.createBookmark.mockResolvedValue({
      duplicate: true,
      bookmarkId: "bookmark-1",
    });
    repository.findBookmarkStatus.mockResolvedValue("ready");
    repository.findBookmarkById.mockResolvedValue({
      id: "bookmark-1",
      url: createdBookmark.url,
      canonicalUrl: null,
      title: "An article",
      description: null,
      domain: "example.com",
      contentType: "article",
      intent: "learn",
      imageUrl: null,
      faviconUrl: null,
      contentStatus: "ready",
      createdAt: "2026-10-10T00:00:00.000Z",
      tags: ["engineering"],
      collection: null,
      savedReason: "Reference",
      notes: null,
    });
    const publishCreated = vi.fn();

    const result = await createBookmark(
      {
        userClient,
        userId: "user-1",
        createAdminClient: () => userClient,
        publishCreated,
        enrichMissingTags: false,
      },
      createdBookmark.url,
    );

    expect(result).toMatchObject({
      duplicate: true,
      bookmarkId: "bookmark-1",
      processingQueued: false,
    });
    expect(publishCreated).not.toHaveBeenCalled();
  });

  it("deduplicates and normalizes tags before assigning them", async () => {
    repository.findBookmarkById.mockResolvedValue({ id: "bookmark-1" });

    await updateUserBookmark(userClient, "user-1", "bookmark-1", {
      tags: [" #Design ", "design", " Reading "],
    });

    expect(repository.replaceBookmarkTags).toHaveBeenCalledWith(
      userClient,
      "user-1",
      "bookmark-1",
      ["design", "Reading"],
    );
  });
});
