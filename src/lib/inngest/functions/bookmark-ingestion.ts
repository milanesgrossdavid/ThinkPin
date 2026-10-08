import { inngest } from "../client";
import { bookmarkCreated } from "../events";
import { createAdminClient } from "../../supabase/admin";
import { extractMetadata } from "../../ingestion/metadata";
import { chunkContent } from "../../ingestion/chunk-content";
import {
  loadContentChunks,
  recordEmbeddingUsage,
  saveContentDocument,
  saveContentEmbeddings,
} from "../../ingestion/repository";
import { hashNormalizedContent } from "../../ingestion/hash-content";
import { getAIProvider } from "../../ai/router";
import type { AIEmbeddingResult } from "../../ai/types";
import {
  getBookmarkForIngestion,
  saveBookmarkAIEnrichment,
  saveBookmarkMetadata,
  setBookmarkContentStatus,
} from "../../bookmarks/service";

function platformContentType(url: string) {
  const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtu.be") {
    return "video" as const;
  }
  if (
    hostname === "fb.watch" ||
    hostname === "facebook.com" ||
    hostname.endsWith(".facebook.com")
  ) {
    return "social" as const;
  }
  if (
    hostname === "medium.com" ||
    hostname.endsWith(".medium.com")
  ) {
    return "article" as const;
  }
  return null;
}

function isYouTubeUrl(url: string) {
  const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  return (
    hostname === "youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "youtu.be"
  );
}

export const bookmarkIngestion = inngest.createFunction(
  {
    id: "bookmark-ingestion",
    name: "Bookmark ingestion",
    triggers: [{ event: bookmarkCreated }],
    retries: 3,
    onFailure: async ({ event, step }) => {
      const { bookmarkId, userId } = event.data.event.data;
      await step.run("mark-bookmark-failed", async () => {
        await setBookmarkContentStatus(
          createAdminClient(),
          bookmarkId,
          userId,
          "failed",
        );
      });
    },
  },
  async ({ event, step }) => {
    const bookmark = await step.run("load-bookmark", () =>
      getBookmarkForIngestion(
        createAdminClient(),
        event.data.bookmarkId,
        event.data.userId,
      ),
    );

    await step.run("mark-bookmark-processing", async () => {
      await setBookmarkContentStatus(
        createAdminClient(),
        bookmark.id,
        bookmark.userId,
        "processing",
      );
    });

    const metadata = await step.run("extract-page-metadata", () =>
      extractMetadata(bookmark.url),
    );

    await step.run("save-page-metadata", () =>
      saveBookmarkMetadata(createAdminClient(), bookmark, metadata),
    );

    const content = metadata.content ||
      [metadata.title, metadata.description, bookmark.url]
        .filter(Boolean)
        .join("\n");
    const chunks = chunkContent(content);
    const savedDocument = await step.run("save-content-document-and-chunks", () =>
      saveContentDocument(createAdminClient(), {
        bookmarkId: bookmark.id,
        content,
        contentHash: hashNormalizedContent(content),
        chunks,
      }),
    );

    const embeddingProvider = getAIProvider("embedding");
    let embeddingResult: AIEmbeddingResult | null = null;
    if (embeddingProvider) {
      const generatedEmbeddingResult = await step.run(
        "generate-content-embeddings",
        async () => {
          const contentChunks = await loadContentChunks(
            createAdminClient(),
            savedDocument.documentId,
          );
          const result = await embeddingProvider.generateEmbedding({
            input: contentChunks.map((chunk) => chunk.content),
          });
          if (result.embeddings.length !== contentChunks.length) {
            throw new Error("Embedding provider returned an incomplete result.");
          }
          return result;
        },
      );
      embeddingResult = generatedEmbeddingResult;

      await step.run("save-content-embeddings", () =>
        saveContentEmbeddings(
          createAdminClient(),
          savedDocument.documentId,
          generatedEmbeddingResult,
        ),
      );
    } else {
      console.info(
        "Skipped bookmark embeddings because AI_EMBEDDING_PROVIDER is disabled.",
        { bookmarkId: bookmark.id },
      );
    }

    await step.run("mark-bookmark-ready", () =>
      setBookmarkContentStatus(
        createAdminClient(),
        bookmark.id,
        bookmark.userId,
        "ready",
      ),
    );

    if (embeddingResult) {
      try {
        await step.run("record-embedding-usage", () =>
          recordEmbeddingUsage(createAdminClient(), {
            userId: bookmark.userId,
            embedding: embeddingResult,
          }),
        );
      } catch (error) {
        console.error(
          "Embedding usage could not be recorded after indexing succeeded.",
          { bookmarkId: bookmark.id, error },
        );
      }
    }

    try {
      const enrichmentProvider = getAIProvider("bookmark-enrichment");
      if (enrichmentProvider) {
        const generatedEnrichment = await step.run(
          "generate-bookmark-enrichment",
          () =>
            enrichmentProvider.enrichBookmark({
              url: bookmark.url,
              title: metadata.title || bookmark.domain,
              description: metadata.description,
              content: metadata.content,
              collections: bookmark.collections,
            }),
        );
        const enrichment = {
          ...generatedEnrichment,
          contentType:
            platformContentType(bookmark.url) ??
            generatedEnrichment.contentType,
          ...(isYouTubeUrl(bookmark.url) ? { title: metadata.title } : {}),
        };
        await step.run("save-bookmark-enrichment", () =>
          saveBookmarkAIEnrichment(createAdminClient(), bookmark, enrichment),
        );
      } else {
        console.info(
          "Skipped bookmark text enrichment because AI_BOOKMARK_ENRICHMENT_PROVIDER is disabled.",
          { bookmarkId: bookmark.id },
        );
      }
    } catch (error) {
      console.error(
        "Optional bookmark AI enrichment failed; continuing deterministic ingestion.",
        { bookmarkId: bookmark.id, error },
      );
    }

    return { bookmarkId: bookmark.id, contentStatus: "ready" };
  },
);
