"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { captureWebPage } from "../../lib/ingestion/metadata";
import { hashNormalizedContent } from "../../lib/ingestion/hash-content";
import { diffReadableText } from "../../lib/web-archive/text-diff";
import { createAdminClient } from "../../lib/supabase/admin";
import { createClient } from "../../lib/supabase/server";
import type {
  WebArchiveCaptureResult,
  WebSnapshot,
} from "../../types/web-snapshot";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return { supabase, user };
}

export async function getBookmarkArchiveHistoryAction(
  bookmarkId: string,
): Promise<{ ok: true; snapshots: WebSnapshot[] } | { ok: false; error: string }> {
  if (!isUuid(bookmarkId)) {
    return { ok: false, error: "Invalid bookmark." };
  }

  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) return { ok: false, error: "Authentication is required." };
    const { data: bookmark, error: bookmarkError } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("id", bookmarkId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (bookmarkError) throw bookmarkError;
    if (!bookmark) return { ok: false, error: "Bookmark not found." };

    const { data, error } = await supabase
      .from("web_snapshots")
      .select(
        "id,bookmark_id,page_url,page_title,page_description,content_hash,word_count,captured_at",
      )
      .eq("bookmark_id", bookmarkId)
      .order("captured_at", { ascending: false });
    if (error) {
      if (
        error.code === "PGRST205" ||
        error.code === "PGRST204" ||
        error.code === "42703"
      ) {
        return {
          ok: false,
          error:
            "Apply the Web Archive database migrations to enable snapshot history.",
        };
      }
      throw error;
    }
    return {
      ok: true,
      snapshots: (data ?? []).map((row) => ({
        id: row.id,
        bookmarkId: row.bookmark_id,
        pageUrl: row.page_url ?? "",
        pageTitle: row.page_title ?? "Archived page",
        pageDescription: row.page_description,
        contentHash: row.content_hash ?? undefined,
        wordCount: row.word_count ?? 0,
        capturedAt: row.captured_at,
      })),
    };
  } catch (error) {
    console.error("Web Archive history could not be loaded.", {
      bookmarkId,
      error,
    });
    return {
      ok: false,
      error: "Could not load snapshot history. Please try again.",
    };
  }
}

export async function captureBookmarkArchiveAction(
  bookmarkId: string,
): Promise<WebArchiveCaptureResult> {
  if (!isUuid(bookmarkId)) {
    return { ok: false, error: "Invalid bookmark." };
  }
  try {
    return await captureBookmarkArchive(bookmarkId);
  } catch (error) {
    console.error("Web Archive capture could not be completed.", {
      bookmarkId,
      error,
    });
    return {
      ok: false,
      error: "Could not archive this page. Please try again.",
    };
  }
}

async function captureBookmarkArchive(
  bookmarkId: string,
): Promise<WebArchiveCaptureResult> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return { ok: false, error: "Authentication is required." };

  const { data: bookmark, error: bookmarkError } = await supabase
    .from("bookmarks")
    .select("id,url")
    .eq("id", bookmarkId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (bookmarkError) throw bookmarkError;
  if (!bookmark) return { ok: false, error: "Bookmark not found." };

  let captured: Awaited<ReturnType<typeof captureWebPage>>;
  try {
    captured = await captureWebPage(bookmark.url);
  } catch (error) {
    console.error("Web Archive capture failed.", {
      bookmarkId,
      error,
    });
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not capture this page.",
    };
  }

  const content = captured.metadata.content;
  if (!content) {
    return {
      ok: false,
      error: "Could not extract readable text from this page.",
    };
  }
  const contentHash = hashNormalizedContent(content);

  const { data: latest, error: latestError } = await supabase
    .from("web_snapshots")
    .select(
      "id,bookmark_id,storage_path,page_url,page_title,page_description,content_hash,word_count,captured_at",
    )
    .eq("bookmark_id", bookmarkId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) {
    if (
      latestError.code === "PGRST205" ||
      latestError.code === "PGRST204" ||
      latestError.code === "42703"
    ) {
      return {
        ok: false,
        error:
          "Apply the Web Archive database migrations to enable page capture.",
      };
    }
    throw latestError;
  }
  if (latest?.content_hash === contentHash) {
    return { ok: true, status: "unchanged" };
  }

  const snapshotId = randomUUID();
  const storagePath = `${user.id}/${bookmarkId}/${snapshotId}/page.html`;
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from("snapshots")
    .upload(storagePath, Buffer.from(captured.html, "utf8"), {
      contentType: "text/html; charset=utf-8",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const words = content.match(/\S+/g)?.length ?? 0;
  const { error: insertError } = await adminClient
    .from("web_snapshots")
    .insert({
      id: snapshotId,
      bookmark_id: bookmarkId,
      storage_path: storagePath,
      text_content: content,
      content_hash: contentHash,
      page_url: captured.finalUrl,
      page_title: captured.metadata.title,
      page_description: captured.metadata.description,
      word_count: words,
    });
  if (insertError) {
    const { error: cleanupError } = await adminClient.storage
      .from("snapshots")
      .remove([storagePath]);
    if (cleanupError) {
      console.error("Orphaned Web Archive file could not be removed.", {
        storagePath,
        cleanupError,
      });
    }
    throw insertError;
  }

  revalidatePath(`/app/bookmarks/${bookmarkId}`);
  return {
    ok: true,
    status: "captured",
  };
}

export async function compareBookmarkSnapshotsAction(
  bookmarkId: string,
  olderSnapshotId: string,
  newerSnapshotId: string,
): Promise<
  | {
      ok: true;
      older: Pick<WebSnapshot, "id" | "pageTitle" | "capturedAt">;
      newer: Pick<WebSnapshot, "id" | "pageTitle" | "capturedAt">;
      diff: ReturnType<typeof diffReadableText>;
    }
  | { ok: false; error: string }
> {
  if (
    !isUuid(bookmarkId) ||
    !isUuid(olderSnapshotId) ||
    !isUuid(newerSnapshotId) ||
    olderSnapshotId === newerSnapshotId
  ) {
    return { ok: false, error: "Invalid snapshot." };
  }

  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) return { ok: false, error: "Authentication is required." };
    const { data: bookmark, error: bookmarkError } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("id", bookmarkId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (bookmarkError) throw bookmarkError;
    if (!bookmark) return { ok: false, error: "Bookmark not found." };

    const { data: snapshotRows, error: snapshotsError } = await supabase
      .from("web_snapshots")
      .select("id,page_title,text_content,captured_at")
      .eq("bookmark_id", bookmarkId)
      .in("id", [olderSnapshotId, newerSnapshotId]);
    if (snapshotsError) throw snapshotsError;
    if (!snapshotRows || snapshotRows.length !== 2) {
      return { ok: false, error: "One or both snapshots were not found." };
    }
    const olderRow = snapshotRows.find((row) => row.id === olderSnapshotId);
    const newerRow = snapshotRows.find((row) => row.id === newerSnapshotId);
    if (!olderRow || !newerRow) {
      return { ok: false, error: "One or both snapshots were not found." };
    }
    if (olderRow.captured_at > newerRow.captured_at) {
      return {
        ok: false,
        error: "Choose the earlier snapshot before the later snapshot.",
      };
    }
    const olderText = olderRow.text_content ?? "";
    const newerText = newerRow.text_content ?? "";
    if (!olderText || !newerText) {
      return {
        ok: false,
        error:
          "Readable text is missing from one of these snapshots, so they cannot be compared.",
      };
    }

    return {
      ok: true,
      older: {
        id: olderRow.id,
        pageTitle: olderRow.page_title ?? "Archived page",
        capturedAt: olderRow.captured_at,
      },
      newer: {
        id: newerRow.id,
        pageTitle: newerRow.page_title ?? "Archived page",
        capturedAt: newerRow.captured_at,
      },
      diff: diffReadableText(olderText, newerText),
    };
  } catch (error) {
    if (error instanceof RangeError) {
      return {
        ok: false,
        error:
          "These snapshots are too long for a detailed comparison. Try choosing snapshots with shorter readable text.",
      };
    }
    console.error("Web Archive comparison failed.", {
      bookmarkId,
      olderSnapshotId,
      newerSnapshotId,
      error,
    });
    return {
      ok: false,
      error: "Could not compare these snapshots. Please try again.",
    };
  }
}
