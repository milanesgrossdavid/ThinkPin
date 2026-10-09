import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createBookmark } from "../../../../../../lib/bookmarks/service";
import { replaceBookmarkCollection } from "../../../../../../lib/bookmarks/repository";
import { getAIProvider } from "../../../../../../lib/ai/router";
import { bookmarkCreated } from "../../../../../../lib/inngest/events";
import { inngest } from "../../../../../../lib/inngest/client";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import { authenticateSupabaseRequest } from "../../../../../../lib/supabase/authenticate-request";
import { isSupabaseAuthUnavailable } from "../../../../../../lib/supabase/auth-errors";

const BATCH_SIZE = 5;

function collectionName(folderPath: unknown) {
  if (!Array.isArray(folderPath)) return null;
  const names = folderPath.filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );
  if (names.length === 0) return null;

  const selected = [names[names.length - 1].slice(0, 100)];
  for (let index = names.length - 2; index >= 0; index -= 1) {
    const candidate = [names[index], ...selected].join(" / ");
    if (candidate.length > 100) break;
    selected.unshift(names[index]);
  }
  return selected.join(" / ");
}

async function countItems(
  supabase: Awaited<ReturnType<typeof authenticateSupabaseRequest>>["supabase"],
  userId: string,
  jobId: string,
  status: string,
) {
  const { count, error } = await supabase
    .from("import_items")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .eq("status", status);
  if (error) throw error;
  return count ?? 0;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { supabase, user } = await authenticateSupabaseRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }
    const userId = user.id;
    const { jobId } = await params;
    let retryFailed = false;
    try {
      const body: unknown = await request.json();
      if (
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body) ||
        Object.keys(body).some((key) => key !== "retryFailed") ||
        ("retryFailed" in body && typeof body.retryFailed !== "boolean")
      ) {
        return NextResponse.json({ error: "Invalid import request." }, { status: 400 });
      }
      retryFailed =
        "retryFailed" in body ? Boolean(body.retryFailed) : false;
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .select("id, status")
      .eq("id", jobId)
      .eq("user_id", userId)
      .maybeSingle();
    if (jobError) throw jobError;
    if (!job) {
      return NextResponse.json({ error: "Import job not found." }, { status: 404 });
    }
    if (job.status === "completed" && !retryFailed) {
      return NextResponse.json({ hasMore: false, ...(await loadCounts()) });
    }

    const { error: updateJobError } = await supabase
      .from("import_jobs")
      .update({ status: "processing" })
      .eq("id", jobId)
      .eq("user_id", userId);
    if (updateJobError) throw updateJobError;

    if (retryFailed) {
      const { error } = await supabase
        .from("import_items")
        .update({ status: "pending", error: null })
        .eq("job_id", jobId)
        .eq("user_id", userId)
        .eq("status", "failed");
      if (error) throw error;
    }

    let itemsQuery = supabase
      .from("import_items")
      .select("id, position, url, normalized_url, title, folder_path, status, bookmark_id")
      .eq("job_id", jobId)
      .eq("user_id", userId);
    itemsQuery = itemsQuery.eq("status", "pending");
    const { data: items, error: itemsError } = await itemsQuery
      .order("position", { ascending: true })
      .limit(BATCH_SIZE);
    if (itemsError) throw itemsError;

    for (const item of items) {
      let bookmarkId = item.bookmark_id;
      try {
        if (!bookmarkId) {
          const result = await createBookmark(
            {
              userClient: supabase,
              userId,
              initialTitle: item.title,
              createAdminClient,
              enrichMissingTags: getAIProvider("bookmark-enrichment") !== null,
              publishCreated: async (createdBookmarkId, userId) => {
                await inngest.send(
                  bookmarkCreated.create({
                    bookmarkId: createdBookmarkId,
                    userId,
                  }),
                );
              },
            },
            item.url,
          );
          if (result.duplicate) {
            const { error } = await supabase
              .from("import_items")
              .update({
                status: "duplicate_library",
                bookmark_id: result.bookmarkId,
                error: null,
              })
              .eq("id", item.id)
              .eq("user_id", userId);
            if (error) throw error;
            continue;
          }
          bookmarkId = result.bookmark.id;
          const { error } = await supabase
            .from("import_items")
            .update({ bookmark_id: bookmarkId })
            .eq("id", item.id)
            .eq("user_id", userId);
          if (error) throw error;
        }

        const collection = collectionName(item.folder_path);
        if (collection) {
          await replaceBookmarkCollection(
            supabase,
            userId,
            bookmarkId,
            collection,
          );
        }
        const { error } = await supabase
          .from("import_items")
          .update({ status: "imported", error: null })
          .eq("id", item.id)
          .eq("user_id", userId);
        if (error) throw error;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Bookmark could not be imported.";
        const { error: saveError } = await supabase
          .from("import_items")
          .update({ status: "failed", error: message })
          .eq("id", item.id)
          .eq("user_id", userId);
        if (saveError) throw saveError;
        console.error("A browser bookmark import item failed.", {
          jobId,
          position: item.position,
          error,
        });
      }
    }

    const counts = await loadCounts();
    const hasMore = counts.pending > 0;
    const status = hasMore
      ? "processing"
      : counts.failed > 0
        ? "completed_with_errors"
        : "completed";
    const { error: finalStatusError } = await supabase
      .from("import_jobs")
      .update({ status })
      .eq("id", jobId)
      .eq("user_id", userId);
    if (finalStatusError) throw finalStatusError;

    revalidatePath("/app/bookmarks");
    revalidatePath("/app/collections");
    revalidatePath("/app");
    return NextResponse.json({ hasMore, status, counts });

    async function loadCounts() {
      const [pending, duplicateFile, duplicateLibrary, invalid, imported, failed] =
        await Promise.all([
          countItems(supabase, userId, jobId, "pending"),
          countItems(supabase, userId, jobId, "duplicate_file"),
          countItems(supabase, userId, jobId, "duplicate_library"),
          countItems(supabase, userId, jobId, "invalid"),
          countItems(supabase, userId, jobId, "imported"),
          countItems(supabase, userId, jobId, "failed"),
        ]);
      return {
        pending,
        duplicateFile,
        duplicateLibrary,
        duplicates: duplicateFile + duplicateLibrary,
        invalid,
        imported,
        failed,
      };
    }
  } catch (error) {
    if (isSupabaseAuthUnavailable(error)) {
      console.warn("Bookmark import batch could not reach Supabase Auth.");
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    console.error("Bookmark import batch failed.", error);
    return NextResponse.json(
      { error: "The import batch could not be processed. You can safely resume it." },
      { status: 500 },
    );
  }
}
