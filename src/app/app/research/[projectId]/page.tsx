import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResearchWorkspace } from "../../../../components/research/research-workspace";
import { listUserBookmarks } from "../../../../lib/bookmarks/service";
import { createClient } from "../../../../lib/supabase/server";
import { requireAuth } from "../../../../lib/supabase/require-auth";
import type {
  ResearchNote,
  ResearchProject,
  ResearchSource,
} from "../../../../types/research";

export const metadata: Metadata = {
  title: "Research workspace | ThinkPin",
  description: "Explore selected sources and notes in a research workspace.",
};

export default async function ResearchProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireAuth();
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: projectRow, error: projectError } = await supabase
    .from("research_projects")
    .select("id, title, description, status, created_at, updated_at")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) throw new Error("Research project could not be loaded.");
  if (!projectRow) notFound();

  const [{ data: sourceRows, error: sourcesError }, { data: noteRows, error: notesError }, bookmarks] =
    await Promise.all([
      supabase
        .from("research_sources")
        .select(
          "id, project_id, bookmark_id, note, created_at, bookmarks!inner(id, title, description, url, domain, image_url, content_type, is_archived)",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("research_notes")
        .select("id, project_id, content, created_at, updated_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      listUserBookmarks(supabase, user.id),
    ]);
  if (sourcesError || notesError) {
    console.error("Research workspace data could not be loaded.", {
      sourcesError,
      notesError,
    });
    throw new Error("Research workspace data could not be loaded.");
  }

  const project: ResearchProject = {
    id: projectRow.id,
    title: projectRow.title,
    description: projectRow.description ?? undefined,
    status: projectRow.status,
    createdAt: projectRow.created_at,
    updatedAt: projectRow.updated_at,
  };
  const sources = sourceRows
    .map((row) => {
      const bookmark = Array.isArray(row.bookmarks)
        ? row.bookmarks[0]
        : row.bookmarks;
      if (!bookmark) return null;
      return {
        source: {
          id: row.id,
          projectId: row.project_id,
          bookmarkId: row.bookmark_id,
          note: row.note ?? undefined,
          createdAt: row.created_at,
        } satisfies ResearchSource,
        bookmark: {
          id: bookmark.id,
          title: bookmark.title,
          description: bookmark.description,
          url: bookmark.url,
          domain: bookmark.domain,
          imageUrl: bookmark.image_url,
          contentType: bookmark.content_type,
          archived: bookmark.is_archived,
        },
      };
    })
    .filter((row) => row !== null);
  const notes: ResearchNote[] = noteRows.map((note) => ({
    id: note.id,
    projectId: note.project_id,
    content: note.content,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  }));

  return (
    <ResearchWorkspace
      project={project}
      initialSources={sources}
      initialNotes={notes}
      libraryBookmarks={bookmarks
        .filter((bookmark) => !bookmark.isArchived)
        .map((bookmark) => ({
          id: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
          domain: bookmark.domain,
        }))}
    />
  );
}
