import type { SupabaseClient } from "@supabase/supabase-js";
import { getAIProvider } from "../ai/router";
import { AIProviderUnavailableError } from "../ai/types";
import { recordProviderUsage } from "../ai/usage";
import { buildAskContext } from "./context-builder";
import {
  AskSearchIndexUnavailableError,
  recordAskUsage,
  retrieveAskChunks,
  retrieveAskMetadataFallback,
} from "./repository";
import type { AskResponse, AskRetrievedChunk } from "./types";

export class InvalidAskQuestionError extends Error {}

export async function askUserLibrary(
  supabase: SupabaseClient,
  adminClient: SupabaseClient,
  userId: string,
  questionInput: unknown,
): Promise<AskResponse> {
  if (typeof questionInput !== "string") {
    throw new InvalidAskQuestionError("Enter a question about your library.");
  }
  const query = questionInput.trim().replace(/\s+/g, " ");
  if (!query || query.length > 1_000) {
    throw new InvalidAskQuestionError(
      "Your question must be between 1 and 1,000 characters.",
    );
  }

  const embeddingProvider = getAIProvider("embedding");
  if (!embeddingProvider) {
    throw new AIProviderUnavailableError(
      "Ask Your Library needs an embedding provider. Set AI_EMBEDDING_PROVIDER=ollama to use local embeddings.",
    );
  }
  const answerProvider = getAIProvider("answer");
  if (!answerProvider) {
    throw new AIProviderUnavailableError(
      "Ask Your Library needs a text answer provider. Set AI_ANSWER_PROVIDER=ollama.",
    );
  }

  const embedding = await embeddingProvider.generateEmbedding({
    input: [query],
  });
  if (
    embedding.embeddings.length !== 1 ||
    embedding.embeddings[0].length !== embedding.dimensions
  ) {
    throw new AIProviderUnavailableError(
      "The embedding provider returned an invalid query embedding.",
    );
  }

  let chunks: AskRetrievedChunk[];
  try {
    chunks = await retrieveAskChunks(supabase, query, embedding);
  } catch (error) {
    if (!(error instanceof AskSearchIndexUnavailableError)) {
      throw error;
    }
    console.warn(
      "Ask Your Library chunk index is unavailable; trying bookmark metadata search.",
    );
    chunks = [];
  }
  const metadataMatches = await retrieveAskMetadataFallback(supabase, query);
  const metadataBookmarkIds = new Set(
    metadataMatches.map((candidate) => candidate.bookmarkId),
  );
  const candidates = [
    ...metadataMatches,
    ...chunks.filter(
      (candidate) => !metadataBookmarkIds.has(candidate.bookmarkId),
    ),
  ];
  const context = buildAskContext(candidates);
  if (context.sources.length === 0) {
    await recordProviderUsage(adminClient, {
      userId,
      provider: embedding.provider,
      model: embedding.model,
      actionType: "semantic_search",
      inputTokens: embedding.inputTokens,
      estimatedCostUsd: embedding.estimatedCostUsd,
      requestId: embedding.requestId,
    });

    return {
      query,
      answer:
        "No encontré suficiente información en tu biblioteca para responder esta pregunta.",
      sources: [],
    };
  }

  const answer = await answerProvider.answerQuestion({
    question: query,
    context: context.text,
  });
  await recordAskUsage(adminClient, userId, embedding, answer);
  const answerText = answer.answer.replace(
    /\[(\d+)\]/g,
    (citation, index: string) =>
      Number(index) <= context.sources.length ? citation : "",
  );
  return {
    query,
    answer: answerText,
    sources: context.sources,
  };
}
