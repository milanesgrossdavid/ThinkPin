import type { SupabaseClient } from "@supabase/supabase-js";
import { formatVector } from "../ai/vector";
import type { AIAnswerResult, AIEmbeddingResult } from "../ai/types";
import { searchBookmarks } from "../search/repository";
import type { SearchBookmark } from "../search/types";
import type { AskRetrievedChunk } from "./types";

type AskChunkRow = {
  chunk_id: string | null;
  bookmark_id: string;
  title: string;
  url: string;
  domain: string;
  content: string;
  relevance_score: number;
};

export class AskSearchIndexUnavailableError extends Error {}

function metadataFallbackQuery(query: string): string | null {
  const normalized = query.toLocaleLowerCase();
  if (
    /\b(github|repositorio|repositorios|repository|repositories|repo)\b/.test(
      normalized,
    )
  ) {
    return "github";
  }
  if (/\b(youtube|video|videos)\b/.test(normalized)) return "youtube";
  if (/\b(medium|articulo|artículos|article|articles)\b/.test(normalized)) {
    return "medium";
  }
  if (
    /\b(facebook|post|posts|publicacion|publicaciones)\b/.test(normalized)
  ) {
    return "facebook";
  }
  return null;
}

function bookmarkMetadataChunk(bookmark: SearchBookmark): AskRetrievedChunk {
  const content = [
    `Saved bookmark: ${bookmark.title}`,
    `Type: ${bookmark.contentType}`,
    `Domain: ${bookmark.domain}`,
    `URL: ${bookmark.url}`,
    bookmark.description ? `Description: ${bookmark.description}` : "",
    bookmark.tags.length ? `Tags: ${bookmark.tags.join(", ")}` : "",
    bookmark.collection ? `Collection: ${bookmark.collection}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    chunkId: null,
    bookmarkId: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    domain: bookmark.domain,
    content,
    relevanceScore: Math.max(bookmark.score, 0.01),
  };
}

export async function retrieveAskMetadataFallback(
  supabase: SupabaseClient,
  query: string,
): Promise<AskRetrievedChunk[]> {
  const fallbackQuery = metadataFallbackQuery(query);
  if (!fallbackQuery) return [];

  const bookmarks = await searchBookmarks(supabase, {
    query: fallbackQuery,
    mode: "keyword",
    queryEmbedding: null,
    filters: { limit: 10 },
  });
  return bookmarks.map(bookmarkMetadataChunk);
}

export async function retrieveAskChunks(
  supabase: SupabaseClient,
  query: string,
  embedding: AIEmbeddingResult,
): Promise<AskRetrievedChunk[]> {
  const { data, error } = await supabase.rpc("search_bookmark_chunks", {
    p_query: query,
    p_query_embedding: formatVector(
      embedding.embeddings[0],
      embedding.dimensions,
    ),
    p_limit: 40,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new AskSearchIndexUnavailableError(
        "Ask Your Library database setup is missing. Apply the latest Supabase migrations and try again.",
      );
    }
    throw error;
  }

  return ((data ?? []) as AskChunkRow[]).map((row) => ({
    chunkId: row.chunk_id,
    bookmarkId: row.bookmark_id,
    title: row.title,
    url: row.url,
    domain: row.domain,
    content: row.content,
    relevanceScore: Number(row.relevance_score),
  }));
}

export async function recordAskUsage(
  adminClient: SupabaseClient,
  userId: string,
  embedding: AIEmbeddingResult,
  answer: AIAnswerResult,
) {
  const { error } = await adminClient.from("ai_usage").insert([
    {
      user_id: userId,
      provider: embedding.provider,
      model: embedding.model,
      action_type: "semantic_search",
      input_tokens: embedding.inputTokens,
      output_tokens: 0,
      request_id: embedding.requestId ?? null,
    },
    {
      user_id: userId,
      provider: answer.provider,
      model: answer.model,
      action_type: "ai_answer",
      input_tokens: answer.inputTokens,
      output_tokens: answer.outputTokens,
    },
  ]);
  if (error) throw error;
}
