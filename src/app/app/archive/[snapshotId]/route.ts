import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";

type SnapshotFileRow = {
  storage_path: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ snapshotId: string }> },
) {
  const { snapshotId } = await context.params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      snapshotId,
    )
  ) {
    return new NextResponse("Snapshot not found.", { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    console.error("Snapshot viewer authentication failed.", authError);
    return new NextResponse("Could not authenticate request.", { status: 500 });
  }
  if (!user) return new NextResponse("Authentication required.", { status: 401 });

  const { data: snapshot, error } = await supabase
    .from("web_snapshots")
    .select("storage_path")
    .eq("id", snapshotId)
    .maybeSingle();
  if (error) {
    console.error("Snapshot record could not be loaded.", error);
    return new NextResponse("Snapshot could not be loaded.", { status: 500 });
  }
  if (!snapshot) return new NextResponse("Snapshot not found.", { status: 404 });

  const { data: file, error: downloadError } = await createAdminClient()
    .storage.from("snapshots")
    .download((snapshot as SnapshotFileRow).storage_path);
  if (downloadError) {
    console.error("Snapshot file could not be loaded.", {
      snapshotId,
      downloadError,
    });
    return new NextResponse("Archived page could not be loaded.", {
      status: 500,
    });
  }

  return new NextResponse(await file.text(), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; media-src data:; base-uri 'none'; form-action 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "private, no-store",
    },
  });
}
