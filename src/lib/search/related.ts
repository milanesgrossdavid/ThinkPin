import type { SupabaseClient } from "@supabase/supabase-js";
import { getAIProvider } from "../ai/router";
import {
  findRelatedBookmarks,
  hasBookmarkEmbeddings,
} from "./repository";
import type { RelatedBookmark } from "./types";

type RelatedIndexingDependencies = {
  adminClient: SupabaseClient;
  publishCreated: (bookmarkId: string, userId: string) => Promise<void>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InvalidRelatedBookmarkIdError extends Error {}
export class RelatedBookmarkNotFoundError extends Error {}
export class RelatedSearchIndexUnavailableError extends Error {}

function isRelatedSearchSchemaError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "PGRST202" ||
      error.code === "42883" ||
      error.code === "42703" ||
      error.code === "42P01")
  );
}

export type RelatedBookmarksResult =
  | { status: "ready"; results: RelatedBookmark[] }
  | { status: "not-indexed"; results: []; message?: string }
  | { status: "indexing"; results: [] };

export async function getRelatedBookmarks(
  supabase: SupabaseClient,
  userId: string,
  bookmarkIdInput: unknown,
  indexing?: RelatedIndexingDependencies,
  retryFailedIndexing = false,
): Promise<RelatedBookmarksResult> {
  if (
    typeof bookmarkIdInput !== "string" ||
    !UUID_PATTERN.test(bookmarkIdInput)
  ) {
    throw new InvalidRelatedBookmarkIdError("Bookmark ID is invalid.");
  }

  try {
    const { data: bookmark, error: bookmarkError } = await supabase
      .from("bookmarks")
      .select("id, is_archived, content_status")
      .eq("id", bookmarkIdInput)
      .eq("user_id", userId)
      .maybeSingle();
    if (bookmarkError) throw bookmarkError;
    if (!bookmark || bookmark.is_archived) {
      throw new RelatedBookmarkNotFoundError("Bookmark not found.");
    }

    if (!(await hasBookmarkEmbeddings(supabase, bookmark.id))) {
      if (bookmark.content_status === "pending" || bookmark.content_status === "processing") {
        return { status: "indexing", results: [] };
      }

      const embeddingProvider = getAIProvider("embedding");
      if (!embeddingProvider) {
        return {
          status: "not-indexed",
          results: [],
          message:
            "Semantic indexing is disabled. Configure an embedding provider to find related bookmarks.",
        };
      }

      const canRetry =
        bookmark.content_status === "ready" ||
        (bookmark.content_status === "failed" && retryFailedIndexing);
      if (!canRetry || !indexing) {
        return {
          status: "not-indexed",
          results: [],
          message:
            "This bookmark could not be indexed. Try indexing your saved bookmarks from Semantic Search.",
        };
      }

      const { data: claimedBookmark, error: claimError } = await indexing.adminClient
        .from("bookmarks")
        .update({ content_status: "pending" })
        .eq("id", bookmark.id)
        .eq("user_id", userId)
        .eq("content_status", bookmark.content_status)
        .select("id")
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimedBookmark) {
        return { status: "indexing", results: [] };
      }

      try {
        await indexing.publishCreated(bookmark.id, userId);
      } catch (error) {
        const { error: restoreError } = await indexing.adminClient
          .from("bookmarks")
          .update({ content_status: "failed" })
          .eq("id", bookmark.id)
          .eq("user_id", userId)
          .eq("content_status", "pending");
        if (restoreError) {
          console.error("Could not restore bookmark status after indexing enqueue failed.", {
            bookmarkId: bookmark.id,
            error: restoreError,
          });
        }
        throw error;
      }

      return { status: "indexing", results: [] };
    }

    const results = await findRelatedBookmarks(
      supabase,
      bookmark.id,
      6,
      0.35,
    );
    return { status: "ready", results };
  } catch (error) {
    if (isRelatedSearchSchemaError(error)) {
      throw new RelatedSearchIndexUnavailableError(
        "Related bookmarks database setup is missing. Apply the latest Supabase migrations and try again.",
      );
    }
    throw error;
  }
}
