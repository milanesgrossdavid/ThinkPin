import type { AskContext, AskRetrievedChunk, AskSource } from "./types";

const MAX_SOURCES = 5;
const MAX_CHUNKS = 8;
const MAX_CHUNKS_PER_SOURCE = 2;
const MAX_CONTEXT_CHARACTERS = 10_000;

export function buildAskContext(chunks: AskRetrievedChunk[]): AskContext {
  const sourcesByBookmark = new Map<string, AskSource>();
  const chunksPerBookmark = new Map<string, number>();
  const contextParts: string[] = [];
  let contextLength = 0;

  for (const chunk of chunks) {
    if (contextParts.length >= MAX_CHUNKS) break;
    const sourceChunkCount = chunksPerBookmark.get(chunk.bookmarkId) ?? 0;
    const existingSource = sourcesByBookmark.get(chunk.bookmarkId);

    if (!existingSource) {
      if (sourcesByBookmark.size >= MAX_SOURCES) continue;
    } else if (sourceChunkCount >= MAX_CHUNKS_PER_SOURCE) {
      continue;
    }

    const sourceNumber =
      existingSource
        ? [...sourcesByBookmark.keys()].indexOf(chunk.bookmarkId) + 1
        : sourcesByBookmark.size + 1;
    const title = existingSource?.title ?? chunk.title;
    const url = existingSource?.url ?? chunk.url;
    const prefix = `[${sourceNumber}] ${title}\nURL: ${url}\nExcerpt: `;
    const available = MAX_CONTEXT_CHARACTERS - contextLength - prefix.length;
    if (available <= 0) break;

    const excerpt = chunk.content.trim().slice(0, available);
    if (!excerpt) continue;
    const part = `${prefix}${excerpt}`;
    contextParts.push(part);
    contextLength += part.length + 2;
    chunksPerBookmark.set(chunk.bookmarkId, sourceChunkCount + 1);
    if (existingSource) {
      existingSource.relevanceScore = Math.max(
        existingSource.relevanceScore,
        chunk.relevanceScore,
      );
    } else {
      sourcesByBookmark.set(chunk.bookmarkId, {
        bookmarkId: chunk.bookmarkId,
        title: chunk.title,
        url: chunk.url,
        domain: chunk.domain,
        relevanceScore: chunk.relevanceScore,
        ...(chunk.chunkId ? { chunkId: chunk.chunkId } : {}),
      });
    }
  }

  return {
    text: contextParts.join("\n\n"),
    sources: [...sourcesByBookmark.values()],
  };
}
