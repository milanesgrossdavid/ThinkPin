import type { SupabaseClient } from "@supabase/supabase-js";
import { formatVector } from "../ai/vector";
import type { AIEmbeddingResult } from "../ai/types";

export async function saveContentDocument(
  supabase: SupabaseClient,
  input: {
    bookmarkId: string;
    content: string;
    contentHash: string;
    chunks: string[];
  },
) {
  const words = input.content.match(/\S+/g)?.length ?? 0;
  const { data: document, error: documentError } = await supabase
    .from("content_documents")
    .upsert(
      {
        bookmark_id: input.bookmarkId,
        content: input.content,
        content_hash: input.contentHash,
        word_count: words,
        reading_time_minutes: Math.ceil(words / 200),
      },
      { onConflict: "bookmark_id" },
    )
    .select("id")
    .single();

  if (documentError) {
    throw documentError;
  }

  if (input.chunks.length > 0) {
    const chunkRows = input.chunks.map((content, chunkIndex) => ({
      document_id: document.id,
      chunk_index: chunkIndex,
      content,
      token_count: Math.ceil(content.length / 4),
      embedding: null,
    }));
    const { error: chunkError } = await supabase
      .from("content_chunks")
      .upsert(chunkRows, { onConflict: "document_id,chunk_index" });
    if (chunkError) {
      throw chunkError;
    }
  }

  const { error: staleChunkError } = await supabase
    .from("content_chunks")
    .delete()
    .eq("document_id", document.id)
    .gte("chunk_index", input.chunks.length);
  if (staleChunkError) {
    throw staleChunkError;
  }

  return { documentId: document.id };
}

export async function loadContentChunks(
  supabase: SupabaseClient,
  documentId: string,
) {
  const { data, error } = await supabase
    .from("content_chunks")
    .select("chunk_index, content")
    .eq("document_id", documentId)
    .order("chunk_index");
  if (error) {
    throw error;
  }
  return data;
}

export async function saveContentEmbeddings(
  supabase: SupabaseClient,
  documentId: string,
  result: AIEmbeddingResult,
) {
  const { data: chunks, error: chunksError } = await supabase
    .from("content_chunks")
    .select("chunk_index, content, token_count")
    .eq("document_id", documentId)
    .order("chunk_index");
  if (chunksError) {
    throw chunksError;
  }
  if (chunks.length !== result.embeddings.length) {
    throw new Error(
      "Embedding count does not match the saved content chunk count.",
    );
  }

  const rows = chunks.map((chunk) => {
    const embedding = result.embeddings[chunk.chunk_index];
    if (!embedding) {
      throw new Error(
        `Embedding is missing for content chunk ${chunk.chunk_index}.`,
      );
    }

    return {
      document_id: documentId,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      token_count: chunk.token_count,
      embedding: formatVector(embedding, result.dimensions),
    };
  });
  const { error } = await supabase
    .from("content_chunks")
    .upsert(rows, { onConflict: "document_id,chunk_index" });
  if (error) {
    throw error;
  }
}

export async function recordEmbeddingUsage(
  supabase: SupabaseClient,
  input: {
    userId: string;
    embedding: AIEmbeddingResult;
  },
) {
  const { error } = await supabase.from("ai_usage").insert({
    user_id: input.userId,
    provider: input.embedding.provider,
    model: input.embedding.model,
    action_type: "embedding",
    input_tokens: input.embedding.inputTokens,
    output_tokens: 0,
    request_id: input.embedding.requestId ?? null,
  });
  if (error) {
    throw error;
  }
}
