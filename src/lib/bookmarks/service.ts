import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalizeUrl } from "../ingestion/canonicalize-url";
import type { MetadataResult } from "../ingestion/metadata";
import type { BookmarkEnrichment } from "../ai/types";
import { normalizeUrl } from "../ingestion/normalize-url";
import {
  createBookmark as insertBookmark,
  findBookmarkById,
  findBookmarkForIngestion,
  findBookmarkStatus,
  listBookmarks,
  saveBookmarkAIEnrichment as persistBookmarkAIEnrichment,
  updateBookmarkMetadata,
  updateBookmarkStatus,
} from "./repository";
import type {
  BookmarkDetail,
  BookmarkForIngestion,
  BookmarkStatus,
  CreatedBookmark,
} from "./types";
import {
  deleteBookmark as removeBookmark,
  replaceBookmarkCollection,
  replaceBookmarkTags,
  saveBookmarkNote,
  updateBookmarkFields,
} from "./repository";
import {
  InvalidBookmarkUrlError,
  validateBookmarkUrl,
} from "./validate-url";

type CreateBookmarkDependencies = {
  userClient: SupabaseClient;
  userId: string;
  initialTitle?: string;
  createAdminClient: () => SupabaseClient;
  publishCreated: (bookmarkId: string, userId: string) => Promise<void>;
  enrichMissingTags: boolean;
};

export type CreateBookmarkOutcome =
  | {
      duplicate: true;
      bookmarkId: string;
      processingQueued: boolean;
    }
  | {
      duplicate: false;
      bookmark: CreatedBookmark;
      processingQueued: boolean;
    };

function needsPlatformMetadataRefresh(bookmark: {
  url: string;
  title: string;
  imageUrl: string | null;
}) {
  const hostname = new URL(bookmark.url).hostname.toLowerCase().replace(/^www\./, "");
  const title = bookmark.title.trim().toLowerCase();

  if (
    hostname === "youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "youtu.be"
  ) {
    return (
      !bookmark.imageUrl ||
      title === hostname ||
      title === "youtube" ||
      title === "www.youtube.com"
    );
  }

  if (
    hostname === "facebook.com" ||
    hostname.endsWith(".facebook.com") ||
    hostname === "fb.watch"
  ) {
    return title === hostname || title === "facebook";
  }

  if (hostname === "medium.com" || hostname.endsWith(".medium.com")) {
    return title === hostname || title === "medium";
  }

  return false;
}

export async function createBookmark(
  dependencies: CreateBookmarkDependencies,
  input: unknown,
): Promise<CreateBookmarkOutcome> {
  const validated = validateBookmarkUrl(input);
  const userId = dependencies.userId;
  const created = await insertBookmark(dependencies.userClient, {
    ...validated,
    normalizedUrl: normalizeUrl(validated.normalizedUrl),
    userId,
    initialTitle: dependencies.initialTitle,
  });

  if (created.duplicate) {
    const status = await findBookmarkStatus(
      dependencies.userClient,
      userId,
      created.bookmarkId,
    );

    const existingBookmark =
      status === "ready"
        ? await findBookmarkById(
            dependencies.userClient,
            userId,
            created.bookmarkId,
          )
        : null;
    const missingEnrichment =
      status === "ready" &&
      dependencies.enrichMissingTags &&
      (!existingBookmark?.tags.length || !existingBookmark.savedReason);
    const stalePlatformMetadata =
      status === "ready" &&
      existingBookmark !== null &&
      needsPlatformMetadataRefresh(existingBookmark);

    if (status !== "failed" && !missingEnrichment && !stalePlatformMetadata) {
      return {
        duplicate: true,
        bookmarkId: created.bookmarkId,
        processingQueued: status === "pending" || status === "processing",
      };
    }

    try {
      await updateBookmarkStatus(
        dependencies.createAdminClient(),
        userId,
        created.bookmarkId,
        "pending",
      );
      await dependencies.publishCreated(created.bookmarkId, userId);
      return {
        duplicate: true,
        bookmarkId: created.bookmarkId,
        processingQueued: true,
      };
    } catch (error) {
      console.error("Bookmark ingestion retry could not be queued.", {
        bookmarkId: created.bookmarkId,
        error,
      });
      await restoreFailedStatus(
        dependencies,
        created.bookmarkId,
        userId,
      );
      return {
        duplicate: true,
        bookmarkId: created.bookmarkId,
        processingQueued: false,
      };
    }
  }

  let processingQueued = true;
  try {
    await dependencies.publishCreated(created.bookmark.id, userId);
  } catch (error) {
    processingQueued = false;
    console.error("Bookmark ingestion event could not be queued.", {
      bookmarkId: created.bookmark.id,
      error,
    });
    await markFailedAfterEnqueueError(
      dependencies,
      created.bookmark.id,
      userId,
    );
  }

  return {
    duplicate: false,
    bookmark: created.bookmark,
    processingQueued,
  };
}

async function markFailedAfterEnqueueError(
  dependencies: CreateBookmarkDependencies,
  bookmarkId: string,
  userId: string,
) {
  try {
    await updateBookmarkStatus(
      dependencies.createAdminClient(),
      userId,
      bookmarkId,
      "failed",
    );
  } catch (error) {
    console.error("Could not mark bookmark ingestion as failed.", {
      bookmarkId,
      error,
    });
  }
}

async function restoreFailedStatus(
  dependencies: CreateBookmarkDependencies,
  bookmarkId: string,
  userId: string,
) {
  try {
    await updateBookmarkStatus(
      dependencies.createAdminClient(),
      userId,
      bookmarkId,
      "failed",
    );
  } catch (error) {
    console.error("Could not restore the failed bookmark status.", {
      bookmarkId,
      error,
    });
  }
}

export function listUserBookmarks(
  userClient: SupabaseClient,
  userId: string,
) {
  return listBookmarks(userClient, userId);
}

export function getUserBookmark(
  userClient: SupabaseClient,
  userId: string,
  bookmarkId: string,
) {
  return findBookmarkById(userClient, userId, bookmarkId);
}

export type UpdateBookmarkInput = {
  title?: string;
  description?: string;
  savedReason?: string;
  collection?: string;
  tags?: string[];
  intent?: string | null;
  notes?: string;
  favorite?: boolean;
  unread?: boolean;
  archived?: boolean;
};

const updateBookmarkKeys = new Set([
  "title",
  "description",
  "savedReason",
  "collection",
  "tags",
  "intent",
  "notes",
  "favorite",
  "unread",
  "archived",
]);

export function parseUpdateBookmarkInput(input: unknown): UpdateBookmarkInput {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !updateBookmarkKeys.has(key))
  ) {
    throw new TypeError("Bookmark update is invalid.");
  }

  const source = input as Record<string, unknown>;
  const result: UpdateBookmarkInput = {};
  for (const key of [
    "title",
    "description",
    "savedReason",
    "collection",
    "notes",
  ] as const) {
    if (key in source) {
      if (typeof source[key] !== "string") {
        throw new TypeError("Bookmark update is invalid.");
      }
      result[key] = source[key];
    }
  }
  if ("tags" in source) {
    if (
      !Array.isArray(source.tags) ||
      !source.tags.every((tag) => typeof tag === "string")
    ) {
      throw new TypeError("Bookmark update is invalid.");
    }
    result.tags = source.tags;
  }
  if ("intent" in source) {
    if (source.intent !== null && typeof source.intent !== "string") {
      throw new TypeError("Bookmark update is invalid.");
    }
    result.intent = source.intent;
  }
  for (const key of ["favorite", "unread", "archived"] as const) {
    if (key in source) {
      if (typeof source[key] !== "boolean") {
        throw new TypeError("Bookmark update is invalid.");
      }
      result[key] = source[key];
    }
  }
  if (Object.keys(result).length === 0) {
    throw new TypeError("Bookmark update is empty.");
  }
  return result;
}

const validBookmarkIntents = new Set([
  "research",
  "learn",
  "buy",
  "reference",
  "project",
  "inspiration",
]);

export async function updateUserBookmark(
  userClient: SupabaseClient,
  userId: string,
  bookmarkId: string,
  input: unknown,
): Promise<BookmarkDetail | null> {
  const updates = parseUpdateBookmarkInput(input);
  const fields: Parameters<typeof updateBookmarkFields>[3] = {};

  if (updates.title !== undefined) {
    const title = updates.title.trim();
    if (!title || title.length > 500) {
      throw new Error("Bookmark title must be between 1 and 500 characters.");
    }
    fields.title = title;
  }
  if (updates.description !== undefined) {
    if (updates.description.length > 10000) {
      throw new Error("Bookmark description must be 10,000 characters or fewer.");
    }
    fields.description = updates.description.trim() || null;
  }
  if (updates.savedReason !== undefined) {
    if (updates.savedReason.length > 1_000) {
      throw new Error("Saved reason must be 1,000 characters or fewer.");
    }
    fields.savedReason = updates.savedReason.trim() || null;
  }
  if (updates.intent !== undefined) {
    const intent = updates.intent?.trim().toLocaleLowerCase() ?? null;
    if (intent && !validBookmarkIntents.has(intent)) {
      throw new Error("Bookmark intent is invalid.");
    }
    fields.intent = intent;
  }
  if (updates.favorite !== undefined) fields.isFavorite = updates.favorite;
  if (updates.unread !== undefined) fields.isRead = !updates.unread;
  if (updates.archived !== undefined) fields.isArchived = updates.archived;

  if (Object.keys(fields).length > 0) {
    await updateBookmarkFields(userClient, userId, bookmarkId, fields);
  }

  if (updates.tags !== undefined) {
    const uniqueTags = new Map<string, string>();
    for (const value of updates.tags) {
      const tag = value.trim().replace(/^#/, "");
      if (tag) uniqueTags.set(tag.toLocaleLowerCase(), tag);
    }
    const tags = [...uniqueTags.values()];
    if (tags.length > 30 || tags.some((tag) => tag.length > 80)) {
      throw new Error("A bookmark can have up to 30 tags of 80 characters each.");
    }
    await replaceBookmarkTags(userClient, userId, bookmarkId, tags);
  }
  if (updates.collection !== undefined) {
    const collection = updates.collection.trim();
    if (!collection || collection.length > 100) {
      throw new Error("Collection name must be between 1 and 100 characters.");
    }
    await replaceBookmarkCollection(
      userClient,
      userId,
      bookmarkId,
      collection === "Unsorted" ? null : collection,
    );
  }
  if (updates.notes !== undefined) {
    if (updates.notes.length > 100000) {
      throw new Error("Bookmark notes must be 100,000 characters or fewer.");
    }
    await saveBookmarkNote(userClient, userId, bookmarkId, updates.notes);
  }

  return findBookmarkById(userClient, userId, bookmarkId);
}

export async function deleteUserBookmark(
  userClient: SupabaseClient,
  userId: string,
  bookmarkId: string,
) {
  return removeBookmark(userClient, userId, bookmarkId);
}

export function getBookmarkForIngestion(
  adminClient: SupabaseClient,
  bookmarkId: string,
  userId: string,
) {
  return findBookmarkForIngestion(adminClient, userId, bookmarkId);
}

export function setBookmarkContentStatus(
  adminClient: SupabaseClient,
  bookmarkId: string,
  userId: string,
  status: BookmarkStatus,
) {
  return updateBookmarkStatus(adminClient, userId, bookmarkId, status);
}

export async function saveBookmarkMetadata(
  adminClient: SupabaseClient,
  bookmark: BookmarkForIngestion,
  metadata: MetadataResult,
) {
  const canonicalUrl = canonicalizeUrl(bookmark.url, metadata.canonicalUrl);
  const hasMetadata = Boolean(
    metadata.title !== bookmark.domain ||
      metadata.description ||
      metadata.image ||
      metadata.siteName,
  );
  const fields = {
    title:
      metadata.title && metadata.title !== bookmark.domain
        ? metadata.title
        : bookmark.title || bookmark.domain,
    description: metadata.description,
    imageUrl: metadata.image,
    faviconUrl: metadata.favicon,
    contentStatus: "processing" as const,
  };

  const error = await updateBookmarkMetadata(adminClient, bookmark.id, bookmark.userId, {
    ...fields,
    canonicalUrl,
  });

  if (error?.code === "23505") {
    console.warn(
      "Bookmark canonical URL already belongs to another bookmark.",
      { bookmarkId: bookmark.id },
    );
    const metadataError = await updateBookmarkMetadata(
      adminClient,
      bookmark.id,
      bookmark.userId,
      fields,
    );
    if (metadataError) {
      throw metadataError;
    }
  } else if (error) {
    throw error;
  }

  if (!hasMetadata) {
    console.warn("Bookmark page returned fallback-only metadata.", {
      bookmarkId: bookmark.id,
    });
  }

  return { hasMetadata };
}

export async function saveBookmarkAIEnrichment(
  adminClient: SupabaseClient,
  bookmark: BookmarkForIngestion,
  enrichment: BookmarkEnrichment,
) {
  const validContentTypes = new Set([
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
  const validIntents = new Set([
    "research",
    "learn",
    "reference",
    "inspiration",
    "buy",
    "project",
    "read-later",
    "watch-later",
    "other",
  ]);
  const title = enrichment.title.trim();
  const description = enrichment.description.trim();
  const tags = [...new Map(
    enrichment.tags
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter((tag) => tag.length > 0 && tag.length <= 80)
      .map((tag) => [tag.toLocaleLowerCase(), tag]),
  ).values()].slice(0, 10);

  if (
    !validContentTypes.has(enrichment.contentType) ||
    !validIntents.has(enrichment.intent) ||
    title.length > 500 ||
    description.length > 1_000
  ) {
    throw new Error("Bookmark AI enrichment contains invalid metadata.");
  }

  await persistBookmarkAIEnrichment(
    adminClient,
    bookmark.userId,
    bookmark.id,
    {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      savedReason: enrichment.savedReason.trim().slice(0, 300),
      contentType: enrichment.contentType,
      intent: enrichment.intent,
      tags,
      suggestedCollection: bookmark.collections.find(
        (collection) =>
          collection.toLocaleLowerCase() ===
          enrichment.suggestedCollection?.toLocaleLowerCase(),
      ) ?? null,
    },
  );
}

export { InvalidBookmarkUrlError };
