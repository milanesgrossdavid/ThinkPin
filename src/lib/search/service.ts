import { getAIProvider } from "../ai/router";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AIProviderUnavailableError,
  type AIEmbeddingResult,
} from "../ai/types";
import {
  findBookmarkIdsMissingEmbeddings,
  searchBookmarks,
  recordSearchEmbeddingUsage,
} from "./repository";
import type { SearchBookmark, SearchFilters, SearchMode } from "./types";

const contentTypes = new Set([
  "article",
  "video",
  "repository",
  "product",
  "tool",
  "social",
  "document",
  "image",
  "other",
]);

export class InvalidSearchError extends Error {}
export class SearchReindexUnavailableError extends Error {}

export function parseSearchFilters(input: Record<string, string | null>): SearchFilters {
  const filters: SearchFilters = {};
  if (input.contentType) {
    if (!contentTypes.has(input.contentType)) {
      throw new InvalidSearchError("Content type filter is invalid.");
    }
    filters.contentType = input.contentType;
  }

  for (const [key, target] of [
    ["favorite", "isFavorite"],
    ["read", "isRead"],
  ] as const) {
    const value = input[key];
    if (value !== null) {
      if (value !== "true" && value !== "false") {
        throw new InvalidSearchError(`${key} filter must be true or false.`);
      }
      filters[target] = value === "true";
    }
  }

  for (const key of ["collection", "tag"] as const) {
    const value = input[key]?.trim();
    if (value) {
      if (value.length > 100) {
        throw new InvalidSearchError(`${key} filter is too long.`);
      }
      filters[key] = value ?? undefined;
    }
  }

  if (input.createdAfter) {
    if (!Number.isFinite(Date.parse(input.createdAfter))) {
      throw new InvalidSearchError("createdAfter must be a valid date.");
    }
    filters.createdAfter = new Date(input.createdAfter).toISOString();
  }

  filters.limit = 30;
  return filters;
}

export async function searchUserBookmarks(
  supabase: SupabaseClient,
  adminClient: SupabaseClient | null,
  userId: string,
  queryInput: unknown,
  modeInput: unknown,
  filters: SearchFilters,
): Promise<{ query: string; mode: SearchMode; results: SearchBookmark[]; relatedTopics: string[] }> {
  if (typeof queryInput !== "string") {
    throw new InvalidSearchError("Search query is required.");
  }
  const query = queryInput.trim();
  if (!query || query.length > 200) {
    throw new InvalidSearchError("Search query must be between 1 and 200 characters.");
  }
  if (
    modeInput !== "keyword" &&
    modeInput !== "full-text" &&
    modeInput !== "semantic" &&
    modeInput !== "hybrid"
  ) {
    throw new InvalidSearchError("Search mode is invalid.");
  }
  const mode = modeInput;

  let queryEmbedding: AIEmbeddingResult | null = null;
  if (mode === "semantic" || mode === "hybrid") {
    const provider = getAIProvider("embedding");
    if (!provider) {
      throw new AIProviderUnavailableError(
        "Semantic search is disabled. Set AI_EMBEDDING_PROVIDER=ollama to use local embeddings.",
      );
    }
    if (!adminClient) {
      throw new Error("Semantic search requires the Supabase service configuration.");
    }
    queryEmbedding = await provider.generateEmbedding({
      input: [query],
    });
    await recordSearchEmbeddingUsage(adminClient, {
      userId,
      embedding: queryEmbedding,
    });
  }

  let results: SearchBookmark[];
  if (mode === "hybrid") {
    const [fullTextResults, semanticResults] = await Promise.all([
      searchBookmarks(supabase, {
        query,
        mode: "full-text",
        queryEmbedding: null,
        filters,
      }),
      searchBookmarks(supabase, {
        query,
        mode: "semantic",
        queryEmbedding,
        filters,
      }),
    ]);
    results = interleaveRankedResults(fullTextResults, semanticResults, filters.limit ?? 30);
  } else {
    results = await searchBookmarks(supabase, {
      query,
      mode,
      queryEmbedding,
      filters,
    });
  }
  const topics = new Map<string, number>();
  for (const result of results) {
    for (const topic of [...result.tags, ...(result.collection ? [result.collection] : [])]) {
      topics.set(topic, (topics.get(topic) ?? 0) + 1);
    }
  }

  return {
    query,
    mode,
    results,
    relatedTopics: [...topics.entries()]
      .sort((first, second) => second[1] - first[1])
      .slice(0, 6)
      .map(([topic]) => topic),
  };
}

export async function enqueueMissingBookmarkEmbeddings(
  supabase: SupabaseClient,
  userId: string,
  publish: (bookmarkId: string, userId: string) => Promise<void>,
) {
  const provider = getAIProvider("embedding");
  if (!provider) {
    throw new SearchReindexUnavailableError(
      "Semantic indexing is disabled. Configure Ollama to create local embeddings.",
    );
  }

  const bookmarkIds = await findBookmarkIdsMissingEmbeddings(
    supabase,
    userId,
  );
  for (const bookmarkId of bookmarkIds) {
    await publish(bookmarkId, userId);
  }

  return { queued: bookmarkIds.length };
}

function interleaveRankedResults(
  fullTextResults: SearchBookmark[],
  semanticResults: SearchBookmark[],
  limit: number,
) {
  const merged = new Map<string, SearchBookmark>();
  const resultCount = Math.max(fullTextResults.length, semanticResults.length);
  for (let index = 0; index < resultCount && merged.size < limit; index += 1) {
    for (const candidate of [
      fullTextResults[index],
      semanticResults[index],
    ]) {
      if (!candidate) {
        continue;
      }
      const existing = merged.get(candidate.id);
      if (existing) {
        existing.matchedFields = [
          ...new Set([...existing.matchedFields, ...candidate.matchedFields]),
        ];
      } else if (merged.size < limit) {
        merged.set(candidate.id, { ...candidate });
      }
    }
  }
  return [...merged.values()];
}
