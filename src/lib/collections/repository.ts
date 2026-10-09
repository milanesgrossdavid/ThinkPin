import type { SupabaseClient } from "@supabase/supabase-js";

export type PrivateCollectionRecord = {
  id: string;
  name: string;
  description: string;
  visibility: "private" | "shared" | "public";
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  bookmarkIds: string[];
};

export class DuplicateCollectionNameError extends Error {
  constructor() {
    super("A collection with this name already exists.");
    this.name = "DuplicateCollectionNameError";
  }
}

function normalizeName(value: unknown) {
  if (typeof value !== "string") {
    throw new TypeError("Collection name is required.");
  }
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100) {
    throw new TypeError("Collection name must be between 1 and 100 characters.");
  }
  return name;
}

function normalizeDescription(value: unknown) {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > 2_000) {
    throw new TypeError("Collection description must be 2,000 characters or fewer.");
  }
  return value.trim().replace(/\s+/g, " ");
}

function normalizeBookmarkIds(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length > 10_000 ||
    !value.every(
      (id) =>
        typeof id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
    )
  ) {
    throw new TypeError("Collection bookmarks are invalid.");
  }
  return [...new Set(value)];
}

function normalizeUuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new TypeError("Collection or bookmark identifier is invalid.");
  }
  return value;
}

export async function listPrivateCollections(
  supabase: SupabaseClient,
  userId: string,
): Promise<PrivateCollectionRecord[]> {
  const { data: collections, error: collectionError } = await supabase
    .from("collections")
    .select("id, name, description, visibility, cover_image_url, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (collectionError) throw collectionError;
  if (collections.length === 0) return [];

  const ids = collections.map((collection) => collection.id);
  const { data: memberships, error: membershipError } = await supabase
    .from("bookmark_collections")
    .select("collection_id, bookmark_id")
    .in("collection_id", ids);
  if (membershipError) throw membershipError;

  const bookmarksByCollection = new Map<string, string[]>();
  for (const membership of memberships) {
    const bookmarks = bookmarksByCollection.get(membership.collection_id) ?? [];
    bookmarks.push(membership.bookmark_id);
    bookmarksByCollection.set(membership.collection_id, bookmarks);
  }

  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    description: collection.description ?? "",
    visibility: collection.visibility,
    coverImageUrl: collection.cover_image_url,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
    bookmarkIds: bookmarksByCollection.get(collection.id) ?? [],
  }));
}

export async function createPrivateCollection(
  supabase: SupabaseClient,
  userId: string,
  input: { name: unknown; description?: unknown; bookmarkIds?: unknown },
) {
  const name = normalizeName(input.name);
  const description = normalizeDescription(input.description);
  const bookmarkIds = normalizeBookmarkIds(input.bookmarkIds ?? []);
  const { data: existingCollections, error: existingError } = await supabase
    .from("collections")
    .select("name")
    .eq("user_id", userId);
  if (existingError) throw existingError;
  if (
    existingCollections.some(
      (collection) =>
        collection.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  ) {
    throw new DuplicateCollectionNameError();
  }
  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: userId,
      name,
      description,
      visibility: "private",
    })
    .select("id, name, description, visibility, cover_image_url, created_at, updated_at")
    .single();
  if (error) throw error;

  if (bookmarkIds.length > 0) {
    const { error: membershipError } = await supabase.rpc(
      "replace_collection_bookmarks",
      { p_collection_id: data.id, p_bookmark_ids: bookmarkIds },
    );
    if (membershipError) {
      const { error: cleanupError } = await supabase
        .from("collections")
        .delete()
        .eq("id", data.id)
        .eq("user_id", userId);
      if (cleanupError) {
        throw new Error(
          "The collection was created but could not be cleaned up after a membership error.",
          { cause: cleanupError },
        );
      }
      if (membershipError.code === "P0001") {
        throw new TypeError(membershipError.message);
      }
      throw membershipError;
    }
  }
  return data;
}

export async function renamePrivateCollection(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string,
  input: { name: unknown; description?: unknown },
) {
  collectionId = normalizeUuid(collectionId);
  const name = normalizeName(input.name);
  const description = normalizeDescription(input.description);
  const { data: existingCollections, error: existingError } = await supabase
    .from("collections")
    .select("id, name")
    .eq("user_id", userId)
    .neq("id", collectionId);
  if (existingError) throw existingError;
  if (
    existingCollections.some(
      (collection) =>
        collection.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  ) {
    throw new DuplicateCollectionNameError();
  }
  const { data, error } = await supabase
    .from("collections")
    .update({ name, description })
    .eq("id", collectionId)
    .eq("user_id", userId)
    .select("id, name, description, visibility, cover_image_url, created_at, updated_at")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data;
}

export async function replacePrivateCollectionBookmarks(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string,
  input: unknown,
) {
  collectionId = normalizeUuid(collectionId);
  const bookmarkIds = normalizeBookmarkIds(input);
  const { error } = await supabase.rpc("replace_collection_bookmarks", {
    p_collection_id: collectionId,
    p_bookmark_ids: bookmarkIds,
  });
  if (error) {
    if (error.code === "P0001" && error.message.includes("Collection not found")) {
      return false;
    }
    throw error;
  }

  const { data, error: ownershipError } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (ownershipError) throw ownershipError;
  return Boolean(data);
}
