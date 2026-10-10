import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { authenticateSupabaseRequest } from "../../../../lib/supabase/authenticate-request";
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ITEMS,
  parseBrowserBookmarks,
} from "../../../../lib/import/browser-bookmarks";
import { isSupabaseAuthUnavailable } from "../../../../lib/supabase/auth-errors";

export const runtime = "nodejs";

const MAX_MULTIPART_OVERHEAD = 128 * 1024;
const INSERT_BATCH_SIZE = 500;
const LOOKUP_BATCH_SIZE = 250;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await authenticateSupabaseRequest(request);
    if (!user) return jsonError("Authentication is required.", 401);

    const contentLength = Number(request.headers.get("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_IMPORT_FILE_BYTES + MAX_MULTIPART_OVERHEAD
    ) {
      return jsonError("The export file must be 5 MB or smaller.", 413);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError("Upload a valid HTML bookmark export.", 400);
    }
    const file = formData.get("file");
    if (
      !file ||
      typeof file === "string" ||
      !("size" in file) ||
      !("text" in file)
    ) {
      return jsonError("Choose an HTML bookmark export file.", 400);
    }
    if (file.size <= 0) return jsonError("The selected file is empty.", 400);
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return jsonError("The export file must be 5 MB or smaller.", 413);
    }
    if (!/\.(html?|htm)$/i.test(file.name)) {
      return jsonError("Choose a .html or .htm bookmark export.", 415);
    }

    const html = await file.text();
    let items;
    try {
      items = parseBrowserBookmarks(html);
    } catch (error) {
      return jsonError(
        error instanceof Error
          ? error.message
          : "The bookmark export could not be parsed.",
        400,
      );
    }
    if (items.length > MAX_IMPORT_ITEMS) {
      return jsonError(
        `The export exceeds the ${MAX_IMPORT_ITEMS.toLocaleString()} bookmark limit.`,
        413,
      );
    }

    const uniqueUrls = [
      ...new Set(
        items.flatMap((item) =>
          item.status === "pending" && item.normalizedUrl
            ? [item.normalizedUrl]
            : [],
        ),
      ),
    ];
    const existingUrls = new Set<string>();
    for (let index = 0; index < uniqueUrls.length; index += LOOKUP_BATCH_SIZE) {
      const batch = uniqueUrls.slice(index, index + LOOKUP_BATCH_SIZE);
      const [normalizedResult, canonicalResult] = await Promise.all([
        supabase
          .from("bookmarks")
          .select("normalized_url")
          .eq("user_id", user.id)
          .in("normalized_url", batch),
        supabase
          .from("bookmarks")
          .select("canonical_url")
          .eq("user_id", user.id)
          .in("canonical_url", batch),
      ]);
      if (normalizedResult.error) throw normalizedResult.error;
      if (canonicalResult.error) throw canonicalResult.error;
      normalizedResult.data.forEach((row) => existingUrls.add(row.normalized_url));
      canonicalResult.data.forEach((row) => {
        if (row.canonical_url) existingUrls.add(row.canonical_url);
      });
    }

    const seenUrls = new Set<string>();
    const classifiedItems = items.map((item) => {
      if (item.status === "invalid" || !item.normalizedUrl) return item;
      if (seenUrls.has(item.normalizedUrl)) {
        return { ...item, status: "duplicate_file" as const };
      }
      seenUrls.add(item.normalizedUrl);
      if (existingUrls.has(item.normalizedUrl)) {
        return { ...item, status: "duplicate_library" as const };
      }
      return item;
    });

    const folderPaths = [
      ...new Set(
        classifiedItems
          .filter((item) => item.folderPath.length > 0)
          .map((item) => item.folderPath.join(" / ")),
      ),
    ];

    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .insert({
        user_id: user.id,
        source: "browser_html",
        status: "review",
        total_count: classifiedItems.length,
        folders: folderPaths,
      })
      .select("id, status, total_count, created_at")
      .single();
    if (jobError) throw jobError;

    try {
      for (
        let index = 0;
        index < classifiedItems.length;
        index += INSERT_BATCH_SIZE
      ) {
        const batch = classifiedItems.slice(index, index + INSERT_BATCH_SIZE);
        const { error } = await supabase.from("import_items").insert(
          batch.map((item) => ({
            job_id: job.id,
            user_id: user.id,
            position: item.position,
            url: item.url,
            normalized_url: item.normalizedUrl,
            title: item.title,
            folder_path: item.folderPath,
            status: item.status,
            error: item.error,
          })),
        );
        if (error) throw error;
      }
    } catch (error) {
      const { error: cleanupError } = await supabase
        .from("import_jobs")
        .delete()
        .eq("id", job.id)
        .eq("user_id", user.id);
      if (cleanupError) {
        console.error("Failed to clean up an incomplete bookmark import job.", {
          jobId: job.id,
          cleanupError,
        });
      }
      throw error;
    }

    const counts = classifiedItems.reduce(
      (result, item) => {
        result[item.status] += 1;
        return result;
      },
      {
        pending: 0,
        duplicate_file: 0,
        duplicate_library: 0,
        invalid: 0,
      },
    );
    return NextResponse.json(
      {
        job: { ...job, counts },
        folders: folderPaths,
        preview: classifiedItems.slice(0, 12).map((item) => ({
          position: item.position,
          title: item.title,
          url: item.url,
          folderPath: item.folderPath,
          status: item.status,
          error: item.error,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    if (isSupabaseAuthUnavailable(error)) {
      console.warn("Bookmark import could not reach Supabase Auth.");
      return jsonError(
        "Authentication is temporarily unavailable. Please try again.",
        503,
      );
    }
    console.error("Browser bookmark import preview failed.", error);
    Sentry.captureMessage("Browser bookmark import preview failed.", {
      level: "error",
      tags: { operation: "bookmark_import" },
    });
    return jsonError("The bookmark export could not be prepared.", 500);
  }
}
