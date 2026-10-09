import { NextResponse } from "next/server";
import { authenticateSupabaseRequest } from "../../../../../lib/supabase/authenticate-request";
import { isSupabaseAuthUnavailable } from "../../../../../lib/supabase/auth-errors";

const statuses = [
  "pending",
  "duplicate_file",
  "duplicate_library",
  "invalid",
  "imported",
  "failed",
] as const;

async function loadImportJob(
  supabase: Awaited<ReturnType<typeof authenticateSupabaseRequest>>["supabase"],
  userId: string,
  jobId: string,
) {
  const { data: job, error } = await supabase
    .from("import_jobs")
    .select("id, status, total_count, created_at, folders")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!job) return null;

  const countResults = await Promise.all(
    statuses.map((status) =>
      supabase
        .from("import_items")
        .select("id", { count: "exact", head: true })
        .eq("job_id", jobId)
        .eq("user_id", userId)
        .eq("status", status),
    ),
  );
  for (const result of countResults) {
    if (result.error) throw result.error;
  }
  const counts = Object.fromEntries(
    statuses.map((status, index) => [status, countResults[index].count ?? 0]),
  );

  const [previewResult, errorsResult] = await Promise.all([
    supabase
      .from("import_items")
      .select("position, title, url, folder_path, status, error")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .limit(12),
    supabase
      .from("import_items")
      .select("position, title, url, error")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .eq("status", "failed")
      .order("position", { ascending: true })
      .limit(20),
  ]);
  if (previewResult.error) throw previewResult.error;
  if (errorsResult.error) throw errorsResult.error;

  return {
    job: { ...job, counts },
    folders: job.folders,
    preview: previewResult.data.map((item) => ({
      ...item,
      folderPath: item.folder_path,
    })),
    errors: errorsResult.data,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { supabase, user } = await authenticateSupabaseRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }
    const { jobId } = await params;
    const result = await loadImportJob(supabase, user.id, jobId);
    if (!result) {
      return NextResponse.json({ error: "Import job not found." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (isSupabaseAuthUnavailable(error)) {
      console.warn("Bookmark import status could not reach Supabase Auth.");
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    console.error("Bookmark import status could not be loaded.", error);
    return NextResponse.json(
      { error: "Import status could not be loaded." },
      { status: 500 },
    );
  }
}
