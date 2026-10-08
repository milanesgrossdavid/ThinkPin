import type { SupabaseClient } from "@supabase/supabase-js";
import { getAIProvider } from "../ai/router";
import type { AIEmbeddingResult } from "../ai/types";
import { formatVector } from "../ai/vector";
import { rankResurfacingCandidates } from "./ranking";
import type {
  ResurfacingBookmark,
  ResurfacingCandidate,
} from "./types";

const RECENT_SIGNAL_DAYS = 7;
const RECENT_SIGNAL_LIMIT = 20;
const CANDIDATE_LIMIT = 40;
const FEEDBACK_TABLE = "resurfacing_feedback";

type BookmarkRow = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  domain: string;
  content_type: string;
  intent: string | null;
  content_status: string;
  created_at: string;
  last_opened_at: string | null;
  bookmark_tags: { tags: { name: string } | null }[] | null;
  bookmark_collections: { collections: { name: string } | null }[] | null;
};

export type ResurfacingResult = {
  candidates: ResurfacingCandidate[];
  error?: string;
};

function bookmarkFromRow(row: BookmarkRow): ResurfacingBookmark {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url,
    domain: row.domain,
    contentType: row.content_type,
    intent: row.intent,
    contentStatus: row.content_status,
    createdAt: row.created_at,
    lastOpenedAt: row.last_opened_at,
    tags: (row.bookmark_tags ?? [])
      .flatMap((relation) => (relation.tags ? [relation.tags.name] : [])),
    collection: row.bookmark_collections?.[0]?.collections?.name ?? null,
  };
}

async function loadBookmarks(
  supabase: SupabaseClient,
  userId: string,
  options: { createdAfter?: string; createdBefore?: string; limit: number },
): Promise<ResurfacingBookmark[]> {
  let query = supabase
    .from("bookmarks")
    .select(
      "id,title,description,url,domain,content_type,intent,content_status,created_at,last_opened_at,bookmark_tags(tags(name)),bookmark_collections(collections(name))",
    )
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(options.limit);
  if (options.createdAfter) query = query.gte("created_at", options.createdAfter);
  if (options.createdBefore) query = query.lt("created_at", options.createdBefore);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as BookmarkRow[]).map(bookmarkFromRow);
}

function buildInterestProfile(signals: ResurfacingBookmark[]): string {
  return signals
    .map((signal) =>
      [
        signal.title,
        signal.description,
        signal.tags.join(", "),
        signal.intent,
      ]
        .filter(Boolean)
        .join(". "),
    )
    .join("\n")
    .slice(0, 8000);
}

function buildKeywordQuery(signals: ResurfacingBookmark[]): string {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    const terms = [
      ...signal.tags,
      signal.intent ?? "",
      ...signal.title.split(/[^\p{L}\p{N}]+/u),
    ];
    for (const term of terms) {
      const normalized = term.toLocaleLowerCase().trim();
      if (normalized.length > 2) {
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      }
    }
  }
  return [...counts]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 8)
    .map(([term]) => `"${term.replaceAll('"', "")}"`)
    .join(" OR ");
}

async function createInterestEmbedding(
  profile: string,
): Promise<AIEmbeddingResult | null> {
  const provider = getAIProvider("embedding");
  if (!provider || !profile.trim()) return null;
  return provider.generateEmbedding({ input: [profile] });
}

export async function getResurfacingCandidates(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResurfacingResult> {
  const recentAfter = new Date(
    Date.now() - RECENT_SIGNAL_DAYS * 86_400_000,
  ).toISOString();
  const recentSignals = await loadBookmarks(supabase, userId, {
    createdAfter: recentAfter,
    limit: RECENT_SIGNAL_LIMIT,
  });
  if (recentSignals.length === 0) return { candidates: [] };

  const cutoff = new Date(
    Date.now() - 30 * 86_400_000,
  ).toISOString();
  const profile = buildInterestProfile(recentSignals);
  const semanticScores = new Map<string, number>();
  const candidateIds = new Set<string>();

  const embedding = await createInterestEmbedding(profile);
  const keywordQuery = buildKeywordQuery(recentSignals);
  const { data: matches, error: searchError } = await supabase.rpc(
    "search_resurfacing_candidates",
    {
      p_query: keywordQuery || null,
      p_query_embedding: embedding?.embeddings[0]
        ? formatVector(embedding.embeddings[0], embedding.dimensions)
        : null,
      p_limit: CANDIDATE_LIMIT,
    },
  );
  if (searchError) {
    if (searchError.code === "PGRST202" || searchError.code === "42883") {
      return {
        candidates: [],
        error:
          "Smart Resurfacing needs its database migration. Apply the latest Supabase migrations to enable recommendations.",
      };
    }
    throw searchError;
  }
  for (const match of (matches ?? []) as {
    bookmark_id: string;
    similarity: number;
  }[]) {
    candidateIds.add(match.bookmark_id);
    semanticScores.set(match.bookmark_id, Number(match.similarity));
  }

  const excludedQuery = supabase
    .from(FEEDBACK_TABLE)
    .select("bookmark_id")
    .eq("user_id", userId);
  const { data: feedback, error: feedbackError } = await excludedQuery;
  if (feedbackError) {
    if (
      feedbackError.code === "PGRST205" ||
      feedbackError.code === "42P01" ||
      feedbackError.code === "42703"
    ) {
      return {
        candidates: [],
        error:
          "Smart Resurfacing needs its database migration. Apply the latest Supabase migrations to enable recommendations.",
      };
    }
    throw feedbackError;
  }
  const excludedBookmarkIds = new Set(
    (feedback ?? []).map((row) => row.bookmark_id as string),
  );
  const eligibleIds = [...candidateIds].filter(
    (id) => !excludedBookmarkIds.has(id),
  );
  if (eligibleIds.length === 0) return { candidates: [] };

  const { data: rows, error: bookmarksError } = await supabase
    .from("bookmarks")
    .select(
      "id,title,description,url,domain,content_type,intent,content_status,created_at,last_opened_at,bookmark_tags(tags(name)),bookmark_collections(collections(name))",
    )
    .eq("user_id", userId)
    .eq("is_archived", false)
    .in("id", eligibleIds)
    .lt("created_at", cutoff);
  if (bookmarksError) throw bookmarksError;

  return {
    candidates: rankResurfacingCandidates({
      candidates: ((rows ?? []) as unknown as BookmarkRow[]).map(
        bookmarkFromRow,
      ),
      recentSignals,
      semanticScores,
      excludedBookmarkIds,
    }),
  };
}
