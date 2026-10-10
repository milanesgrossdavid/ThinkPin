import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPrivateCollection } from "../../src/lib/collections/repository";

describe("collection persistence integration", () => {
  it("saves a normalized collection and assigns its bookmark memberships", async () => {
    const insertedCollection = {
      id: "collection-1",
      name: "Research",
      description: "Useful links",
      visibility: "private",
      cover_image_url: null,
      created_at: "2026-10-10T00:00:00.000Z",
      updated_at: "2026-10-10T00:00:00.000Z",
    };
    const existingQuery = {
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const insertQuery = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: insertedCollection,
          error: null,
        }),
      }),
    };
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue(existingQuery),
        insert: vi.fn().mockReturnValue(insertQuery),
      })),
      rpc: vi.fn().mockResolvedValue({ error: null }),
    } as unknown as SupabaseClient;

    const result = await createPrivateCollection(supabase, "user-1", {
      name: "  Research  ",
      description: " Useful   links ",
      bookmarkIds: [
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000001",
      ],
    });

    expect(result).toEqual(insertedCollection);
    expect(supabase.from).toHaveBeenCalledWith("collections");
    expect(supabase.rpc).toHaveBeenCalledWith("replace_collection_bookmarks", {
      p_collection_id: "collection-1",
      p_bookmark_ids: ["00000000-0000-4000-8000-000000000001"],
    });
  });
});
