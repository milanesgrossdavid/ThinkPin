import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIEmbeddingResult } from "../ai/types";
import { formatVector } from "../ai/vector";
import type {
  RelatedBookmark,
  SearchBookmark,
  SearchFilters,
  SearchMode,
} from "./types";

type SearchRow = {
  id: string;
  url: string;
  canonical_url: string | null;
  title: string;
  description: string | null;
  domain: string;
  favicon_url: string | null;
  image_url: string | null;
  content_type: string;
  intent: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  is_read: boolean;
  content_status: string;
  created_at: string;
  tags: string[];
  collection: string | null;
  notes: string | null;
  score: number;
  matched_fields: string[];
};

type RelatedBookmarkRow = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  domain: string;
  image_url: string | null;
  content_type: string;
  created_at: string;
  tags: string[] | null;
  similarity: number;
};

export async function hasBookmarkEmbeddings(
  supabase: SupabaseClient,
  bookmarkId: string,
) {
  const { data: documents, error: documentsError } = await supabase
    .from("content_documents")
    .select("id")
    .eq("bookmark_id", bookmarkId);
  if (documentsError) throw documentsError;
  if (documents.length === 0) return false;

  const { data, error } = await supabase
    .from("content_chunks")
    .select("id")
    .in(
      "document_id",
      documents.map((document) => document.id),
    )
    .not("embedding", "is", null)
    .limit(1);
  if (error) throw error;
  return data.length > 0;
}

export async function findRelatedBookmarks(
  supabase: SupabaseClient,
  bookmarkId: string,
  limit = 6,
  minimumSimilarity = 0.35,
): Promise<RelatedBookmark[]> {
  const { data, error } = await supabase.rpc("find_related_bookmarks", {
    p_bookmark_id: bookmarkId,
    p_limit: limit,
    p_min_similarity: minimumSimilarity,
  });
  if (error) throw error;

  return ((data ?? []) as RelatedBookmarkRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url,
    domain: row.domain,
    imageUrl: row.image_url,
    contentType: row.content_type,
    createdAt: row.created_at,
    tags: row.tags ?? [],
    similarity: Number(row.similarity),
  }));
}

export async function searchBookmarks(
  supabase: SupabaseClient,
  input: {
    query: string;
    mode: SearchMode;
    queryEmbedding: AIEmbeddingResult | null;
    filters: SearchFilters;
  },
): Promise<SearchBookmark[]> {
  const { data, error } = await supabase.rpc("search_bookmarks", {
    p_query: input.query,
    p_mode: input.mode,
    p_query_embedding: input.queryEmbedding?.embeddings[0]
      ? formatVector(
          input.queryEmbedding.embeddings[0],
          input.queryEmbedding.dimensions,
        )
      : null,
    p_content_type: input.filters.contentType ?? null,
    p_is_favorite: input.filters.isFavorite ?? null,
    p_is_read: input.filters.isRead ?? null,
    p_collection: input.filters.collection ?? null,
    p_tag: input.filters.tag ?? null,
    p_created_after: input.filters.createdAfter ?? null,
    p_limit: input.filters.limit ?? 30,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SearchRow[]).map((row) => ({
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
    contentStatus: row.content_status,
    createdAt: row.created_at,
    tags: row.tags ?? [],
    collection: row.collection,
    notes: row.notes,
    score: row.score,
    matchedFields: row.matched_fields ?? [],
  }));
}

export async function recordSearchEmbeddingUsage(
  adminClient: SupabaseClient,
  input: {
    userId: string;
    embedding: AIEmbeddingResult;
  },
) {
  const { error } = await adminClient.from("ai_usage").insert({
    user_id: input.userId,
    provider: input.embedding.provider,
    model: input.embedding.model,
    action_type: "semantic_search",
    input_tokens: input.embedding.inputTokens,
    output_tokens: 0,
    request_id: input.embedding.requestId ?? null,
  });
  if (error) {
    throw error;
  }
}

export async function findBookmarkIdsMissingEmbeddings(
  supabase: SupabaseClient,
  userId: string,
  limit = 10,
) {
  const batchSize = 500;
  const missingBookmarkIds: string[] = [];

  for (let offset = 0; missingBookmarkIds.length < limit; offset += batchSize) {
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (bookmarksError) {
      throw bookmarksError;
    }
    if (bookmarks.length === 0) {
      break;
    }

    const bookmarkIds = bookmarks.map((bookmark) => bookmark.id);
    const { data: documents, error: documentsError } = await supabase
      .from("content_documents")
      .select("id, bookmark_id")
      .in("bookmark_id", bookmarkIds);
    if (documentsError) {
      throw documentsError;
    }

    if (documents.length > 0) {
      const { data: embeddedChunks, error: chunksError } = await supabase
        .from("content_chunks")
        .select("document_id")
        .in(
          "document_id",
          documents.map((document) => document.id),
        )
        .not("embedding", "is", null);
      if (chunksError) {
        throw chunksError;
      }

      const indexedDocumentIds = new Set(
        embeddedChunks.map((chunk) => chunk.document_id),
      );
      const indexedBookmarkIds = new Set(
        documents
          .filter((document) => indexedDocumentIds.has(document.id))
          .map((document) => document.bookmark_id),
      );
      missingBookmarkIds.push(
        ...bookmarkIds.filter((bookmarkId) => !indexedBookmarkIds.has(bookmarkId)),
      );
    } else {
      missingBookmarkIds.push(...bookmarkIds);
    }

    if (bookmarks.length < batchSize) {
      break;
    }
  }

  return missingBookmarkIds.slice(0, limit);
}
