import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeUrl } from "../ingestion/normalize-url";
import type { ValidatedBookmarkUrl } from "./validate-url";

type BookmarkRow = {
  id: string;
  url: string;
  canonical_url: string | null;
  normalized_url: string;
  domain: string;
  content_status: "pending" | "processing" | "ready" | "failed";
};

type CreateBookmarkInput = ValidatedBookmarkUrl & {
  userId: string;
};

export type CreateBookmarkResult =
  | { duplicate: true; bookmarkId: string }
  | { duplicate: false; bookmark: BookmarkRow };

export async function findBookmarkByUrl(
  supabase: SupabaseClient,
  userId: string,
  canonicalUrl: string,
  normalizedUrl: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("canonical_url", canonicalUrl)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: normalizedMatch, error: normalizedError } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("normalized_url", normalizedUrl)
    .maybeSingle();

  if (normalizedError) {
    throw normalizedError;
  }

  return normalizedMatch;
}

export async function createBookmark(
  supabase: SupabaseClient,
  input: CreateBookmarkInput,
): Promise<CreateBookmarkResult> {
  const normalizedUrl = normalizeUrl(input.normalizedUrl);
  const existing = await findBookmarkByUrl(
    supabase,
    input.userId,
    normalizedUrl,
    normalizedUrl,
  );

  if (existing) {
    return { duplicate: true, bookmarkId: existing.id };
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: input.userId,
      url: input.originalUrl,
      normalized_url: normalizedUrl,
      title: input.domain,
      domain: input.domain,
      content_status: "pending",
      is_favorite: false,
      is_archived: false,
      is_read: false,
    })
    .select("id, url, canonical_url, normalized_url, domain, content_status")
    .single();

  if (!error) {
    return { duplicate: false, bookmark: data };
  }

  if (error.code === "23505") {
    const duplicate = await findBookmarkByUrl(
      supabase,
      input.userId,
      normalizedUrl,
      normalizedUrl,
    );

    if (duplicate) {
      return { duplicate: true, bookmarkId: duplicate.id };
    }
  }

  throw error;
}
