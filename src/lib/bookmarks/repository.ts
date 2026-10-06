import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BookmarkDetail,
  BookmarkForIngestion,
  BookmarkListItem,
  BookmarkStatus,
  CreatedBookmark,
} from "./types";

export type CreateBookmarkResult =
  | { duplicate: true; bookmarkId: string }
  | { duplicate: false; bookmark: CreatedBookmark };

function requireBookmarkStatus(value: unknown): BookmarkStatus {
  if (
    value === "pending" ||
    value === "processing" ||
    value === "ready" ||
    value === "failed"
  ) {
    return value;
  }
  throw new Error("Bookmark has an invalid content status.");
}

function relationNames(value: unknown): string[] {
  const records = Array.isArray(value) ? value : [value];
  return records.flatMap((record) =>
    typeof record === "object" &&
    record !== null &&
    "name" in record &&
    typeof record.name === "string"
      ? [record.name]
      : [],
  );
}

export async function listBookmarks(
  supabase: SupabaseClient,
  userId: string,
): Promise<BookmarkListItem[]> {
  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      "id, url, canonical_url, title, description, domain, favicon_url, image_url, content_type, intent, is_favorite, is_archived, is_read, content_status, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  if (!data.length) {
    return [];
  }

  const bookmarkIds = data.map((row) => row.id);
  const [tagResult, collectionResult, noteResult] = await Promise.all([
    supabase
      .from("bookmark_tags")
      .select("bookmark_id, tags(name)")
      .in("bookmark_id", bookmarkIds),
    supabase
      .from("bookmark_collections")
      .select("bookmark_id, collections(name)")
      .in("bookmark_id", bookmarkIds),
    supabase
      .from("notes")
      .select("bookmark_id, content, updated_at")
      .eq("user_id", userId)
      .in("bookmark_id", bookmarkIds)
      .order("updated_at", { ascending: false }),
  ]);

  if (tagResult.error) throw tagResult.error;
  if (collectionResult.error) throw collectionResult.error;
  if (noteResult.error) throw noteResult.error;

  const tagsByBookmark = new Map<string, string[]>();
  for (const row of tagResult.data) {
    const names = tagsByBookmark.get(row.bookmark_id) ?? [];
    names.push(...relationNames(row.tags));
    tagsByBookmark.set(row.bookmark_id, names);
  }

  const collectionByBookmark = new Map<string, string>();
  for (const row of collectionResult.data) {
    const [collectionName] = relationNames(row.collections);
    if (
      !collectionByBookmark.has(row.bookmark_id) &&
      collectionName
    ) {
      collectionByBookmark.set(row.bookmark_id, collectionName);
    }
  }

  const noteByBookmark = new Map<string, string>();
  for (const row of noteResult.data) {
    if (!noteByBookmark.has(row.bookmark_id)) {
      noteByBookmark.set(row.bookmark_id, row.content);
    }
  }

  return data.map((row) => ({
    id: row.id,
    url: row.url,
    canonicalUrl: row.canonical_url,
    title: row.title,
    description: row.description,
    domain: row.domain,
    faviconUrl: row.favicon_url,
    imageUrl: row.image_url,
    contentType: row.content_type,
    intent: row.intent,
    isFavorite: row.is_favorite,
    isArchived: row.is_archived,
    isRead: row.is_read,
    contentStatus: requireBookmarkStatus(row.content_status),
    createdAt: row.created_at,
    tags: tagsByBookmark.get(row.id) ?? [],
    collection: collectionByBookmark.get(row.id) ?? null,
    notes: noteByBookmark.get(row.id) ?? null,
  }));
}

export async function findBookmarkById(
  supabase: SupabaseClient,
  userId: string,
  bookmarkId: string,
): Promise<BookmarkDetail | null> {
  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      "id, url, canonical_url, title, description, domain, image_url, favicon_url, content_status, created_at",
    )
    .eq("id", bookmarkId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [tagResult, collectionResult, noteResult] = await Promise.all([
    supabase
      .from("bookmark_tags")
      .select("tags(name)")
      .eq("bookmark_id", bookmarkId),
    supabase
      .from("bookmark_collections")
      .select("collections(name)")
      .eq("bookmark_id", bookmarkId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notes")
      .select("content")
      .eq("user_id", userId)
      .eq("bookmark_id", bookmarkId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (tagResult.error) throw tagResult.error;
  if (collectionResult.error) throw collectionResult.error;
  if (noteResult.error) throw noteResult.error;

  return {
    id: data.id,
    url: data.url,
    canonicalUrl: data.canonical_url,
    title: data.title,
    description: data.description,
    domain: data.domain,
    imageUrl: data.image_url,
    faviconUrl: data.favicon_url,
    contentStatus: requireBookmarkStatus(data.content_status),
    createdAt: data.created_at,
    tags: relationNames(tagResult.data.map((row) => row.tags)),
    collection: relationNames(collectionResult.data?.collections)[0] ?? null,
    notes: noteResult.data?.content ?? null,
  };
}

export async function updateBookmarkFields(
  supabase: SupabaseClient,
  userId: string,
  bookmarkId: string,
  fields: {
    title?: string;
    description?: string | null;
    intent?: string | null;
    isFavorite?: boolean;
    isRead?: boolean;
    isArchived?: boolean;
  },
) {
  const { error } = await supabase
    .from("bookmarks")
    .update({
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.description !== undefined
        ? { description: fields.description }
        : {}),
      ...(fields.intent !== undefined ? { intent: fields.intent } : {}),
      ...(fields.isFavorite !== undefined
        ? { is_favorite: fields.isFavorite }
        : {}),
      ...(fields.isRead !== undefined ? { is_read: fields.isRead } : {}),
      ...(fields.isArchived !== undefined
        ? { is_archived: fields.isArchived }
        : {}),
    })
    .eq("id", bookmarkId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function deleteBookmark(
  supabase: SupabaseClient,
  userId: string,
  bookmarkId: string,
) {
  const { data, error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", bookmarkId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function replaceBookmarkTags(
  supabase: SupabaseClient,
  userId: string,
  bookmarkId: string,
  names: string[],
) {
  if (names.length === 0) {
    const { error } = await supabase
      .from("bookmark_tags")
      .delete()
      .eq("bookmark_id", bookmarkId);
    if (error) throw error;
    return;
  }

  const tagRows = names.map((name) => ({
    user_id: userId,
    name,
    slug: name.toLocaleLowerCase().replace(/\s+/g, "-"),
  }));
  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .upsert(tagRows, { onConflict: "user_id,slug" })
    .select("id, slug");
  if (tagsError) throw tagsError;

  const tagIds = tags.map((tag) => tag.id);
  const relations = tagIds.map((tagId) => ({
    bookmark_id: bookmarkId,
    tag_id: tagId,
  }));
  const { error: relationError } = await supabase
    .from("bookmark_tags")
    .upsert(relations, { onConflict: "bookmark_id,tag_id" });
  if (relationError) throw relationError;

  const { error: removeError } = await supabase
    .from("bookmark_tags")
    .delete()
    .eq("bookmark_id", bookmarkId)
    .not("tag_id", "in", `(${tagIds.join(",")})`);
  if (removeError) throw removeError;
}

export async function saveBookmarkNote(
  supabase: SupabaseClient,
  userId: string,
  bookmarkId: string,
  content: string,
) {
  const { data: existing, error: findError } = await supabase
    .from("notes")
    .select("id")
    .eq("user_id", userId)
    .eq("bookmark_id", bookmarkId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  if (!content.trim()) {
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("user_id", userId)
      .eq("bookmark_id", bookmarkId);
    if (error) throw error;
    return;
  }

  if (existing) {
    const { error } = await supabase
      .from("notes")
      .update({ content })
      .eq("id", existing.id)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("notes")
    .insert({ user_id: userId, bookmark_id: bookmarkId, content });
  if (error) throw error;
}

export async function replaceBookmarkCollection(
  supabase: SupabaseClient,
  userId: string,
  bookmarkId: string,
  name: string | null,
) {
  if (name === null) {
    const { error } = await supabase
      .from("bookmark_collections")
      .delete()
      .eq("bookmark_id", bookmarkId);
    if (error) throw error;
    return;
  }

  const { data: collection, error: findError } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .maybeSingle();
  if (findError) throw findError;

  let collectionId = collection?.id;
  if (!collectionId) {
    const { data: created, error: createError } = await supabase
      .from("collections")
      .insert({ user_id: userId, name })
      .select("id")
      .single();
    if (createError) throw createError;
    collectionId = created.id;
  }

  const { error: removeError } = await supabase
    .from("bookmark_collections")
    .delete()
    .eq("bookmark_id", bookmarkId);
  if (removeError) throw removeError;

  const { error: insertError } = await supabase
    .from("bookmark_collections")
    .insert({ bookmark_id: bookmarkId, collection_id: collectionId });
  if (insertError) throw insertError;
}

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
  input: {
    userId: string;
    originalUrl: string;
    normalizedUrl: string;
    domain: string;
  },
): Promise<CreateBookmarkResult> {
  const normalizedUrl = input.normalizedUrl;
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
    return {
      duplicate: false,
      bookmark: {
        id: data.id,
        url: data.url,
        canonicalUrl: data.canonical_url,
        domain: data.domain,
        contentStatus: requireBookmarkStatus(data.content_status),
      },
    };
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

export async function findBookmarkStatus(
  supabase: SupabaseClient,
  userId: string,
  bookmarkId: string,
) {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("content_status")
    .eq("id", bookmarkId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  return requireBookmarkStatus(data.content_status);
}

export async function updateBookmarkStatus(
  supabase: SupabaseClient,
  userId: string,
  bookmarkId: string,
  contentStatus: BookmarkStatus,
) {
  const { error } = await supabase
    .from("bookmarks")
    .update({ content_status: contentStatus })
    .eq("id", bookmarkId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function findBookmarkForIngestion(
  supabase: SupabaseClient,
  userId: string,
  bookmarkId: string,
): Promise<BookmarkForIngestion> {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("id, user_id, url, domain")
    .eq("id", bookmarkId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    userId: data.user_id,
    url: data.url,
    domain: data.domain,
  };
}

export async function updateBookmarkMetadata(
  supabase: SupabaseClient,
  bookmarkId: string,
  userId: string,
  metadata: {
    title: string;
    description: string | null;
    imageUrl: string | null;
    faviconUrl: string | null;
    contentStatus: "ready";
    canonicalUrl?: string;
  },
) {
  const { canonicalUrl, ...fields } = metadata;
  const { error } = await supabase
    .from("bookmarks")
    .update({
      title: fields.title,
      description: fields.description,
      image_url: fields.imageUrl,
      favicon_url: fields.faviconUrl,
      content_status: fields.contentStatus,
      ...(canonicalUrl ? { canonical_url: canonicalUrl } : {}),
    })
    .eq("id", bookmarkId)
    .eq("user_id", userId);

  return error;
}
