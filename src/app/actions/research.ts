"use server";

import { revalidatePath } from "next/cache";
import { getAIProvider } from "../../lib/ai/router";
import { AIProviderUnavailableError } from "../../lib/ai/types";
import type {
  ResearchNote,
  ResearchProject,
  ResearchProjectStatus,
  ResearchSource,
} from "../../types/research";
import { createClient } from "../../lib/supabase/server";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type ProjectBookmark = {
  bookmarkId: string;
  title: string;
  url: string;
  domain: string;
};

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Authentication is required.");
  return { supabase, user };
}

function toProject(row: {
  id: string;
  title: string;
  description: string | null;
  status: ResearchProjectStatus;
  created_at: string;
  updated_at: string;
}): ResearchProject {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createResearchProjectAction(
  titleInput: string,
  descriptionInput: string,
): Promise<ActionResult<ResearchProject>> {
  try {
    const title = titleInput.trim();
    const description = descriptionInput.trim();
    if (!title || title.length > 160 || description.length > 1_000) {
      return { ok: false, error: "Check the title and description lengths." };
    }
    const { supabase, user } = await getAuthenticatedClient();
    const { data, error } = await supabase
      .from("research_projects")
      .insert({
        user_id: user.id,
        title,
        description: description || null,
      })
      .select("id, title, description, status, created_at, updated_at")
      .single();
    if (error) throw error;
    return { ok: true, data: toProject(data) };
  } catch (error) {
    console.error("Research project could not be created.", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Research project could not be created.",
    };
  }
}

export async function updateResearchProjectStatusAction(
  projectId: string,
  status: ResearchProjectStatus,
): Promise<ActionResult<null>> {
  try {
    if (!["active", "completed", "archived"].includes(status)) {
      return { ok: false, error: "Research project status is invalid." };
    }
    const { supabase } = await getAuthenticatedClient();
    const { error } = await supabase
      .from("research_projects")
      .update({ status })
      .eq("id", projectId);
    if (error) throw error;
    return { ok: true, data: null };
  } catch (error) {
    console.error("Research project status could not be updated.", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Research project status could not be updated.",
    };
  }
}

export async function deleteResearchProjectAction(
  projectId: string,
): Promise<ActionResult<null>> {
  try {
    if (typeof projectId !== "string" || !projectId.trim()) {
      return { ok: false, error: "Research project ID is invalid." };
    }
    const { supabase } = await getAuthenticatedClient();
    const { data, error } = await supabase
      .from("research_projects")
      .delete()
      .eq("id", projectId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return {
        ok: false,
        error: "Research project was not found or could not be deleted.",
      };
    }

    revalidatePath("/app/research");
    revalidatePath(`/app/research/${projectId}`);
    return { ok: true, data: null };
  } catch (error) {
    console.error("Research project could not be deleted.", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Research project could not be deleted.",
    };
  }
}

export async function addResearchSourceAction(
  projectId: string,
  bookmarkId: string,
): Promise<ActionResult<ResearchSource>> {
  try {
    const { supabase } = await getAuthenticatedClient();
    const { data, error } = await supabase
      .from("research_sources")
      .insert({ project_id: projectId, bookmark_id: bookmarkId })
      .select("id, project_id, bookmark_id, note, created_at")
      .single();
    if (error) throw error;
    return {
      ok: true,
      data: {
        id: data.id,
        projectId: data.project_id,
        bookmarkId: data.bookmark_id,
        note: data.note ?? undefined,
        createdAt: data.created_at,
      },
    };
  } catch (error) {
    console.error("Research source could not be added.", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Research source could not be added.",
    };
  }
}

export async function removeResearchSourceAction(
  sourceId: string,
): Promise<ActionResult<null>> {
  try {
    const { supabase } = await getAuthenticatedClient();
    const { error } = await supabase
      .from("research_sources")
      .delete()
      .eq("id", sourceId);
    if (error) throw error;
    return { ok: true, data: null };
  } catch (error) {
    console.error("Research source could not be removed.", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Research source could not be removed.",
    };
  }
}

export async function createResearchNoteAction(
  projectId: string,
  contentInput: string,
): Promise<ActionResult<ResearchNote>> {
  try {
    const content = contentInput.trim();
    if (!content || content.length > 10_000) {
      return {
        ok: false,
        error: "A note must contain between 1 and 10,000 characters.",
      };
    }
    const { supabase } = await getAuthenticatedClient();
    const { data, error } = await supabase
      .from("research_notes")
      .insert({ project_id: projectId, content })
      .select("id, project_id, content, created_at, updated_at")
      .single();
    if (error) throw error;
    return {
      ok: true,
      data: {
        id: data.id,
        projectId: data.project_id,
        content: data.content,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (error) {
    console.error("Research note could not be created.", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Research note could not be created.",
    };
  }
}

export async function removeResearchNoteAction(
  noteId: string,
): Promise<ActionResult<null>> {
  try {
    const { supabase } = await getAuthenticatedClient();
    const { error } = await supabase
      .from("research_notes")
      .delete()
      .eq("id", noteId);
    if (error) throw error;
    return { ok: true, data: null };
  } catch (error) {
    console.error("Research note could not be removed.", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Research note could not be removed.",
    };
  }
}

export async function generateResearchSummaryAction(
  projectId: string,
): Promise<
  ActionResult<{
    summary: string;
    sources: ProjectBookmark[];
  }>
> {
  try {
    const { supabase } = await getAuthenticatedClient();
    const { data: project, error: projectError } = await supabase
      .from("research_projects")
      .select("id, title, description")
      .eq("id", projectId)
      .single();
    if (projectError) throw projectError;

    const { data: projectSources, error: sourcesError } = await supabase
      .from("research_sources")
      .select(
        "bookmark_id, bookmarks!inner(id, title, url, domain, is_archived)",
      )
      .eq("project_id", projectId);
    if (sourcesError) throw sourcesError;

    const sources = projectSources
      .map((row) => {
        const bookmark = Array.isArray(row.bookmarks)
          ? row.bookmarks[0]
          : row.bookmarks;
        if (!bookmark || bookmark.is_archived) return null;
        return {
          bookmarkId: row.bookmark_id,
          title: bookmark.title,
          url: bookmark.url,
          domain: bookmark.domain,
        };
      })
      .filter((source): source is ProjectBookmark => source !== null)
      .slice(0, 8);

    if (sources.length === 0) {
      return {
        ok: false,
        error: "Add at least one active bookmark as a source before generating a report.",
      };
    }

    const answerProvider = getAIProvider("answer");
    if (!answerProvider) {
      throw new AIProviderUnavailableError(
        "Research summaries need an AI answer provider. Configure AI_ANSWER_PROVIDER to continue.",
      );
    }

    const { data: documents, error: documentsError } = await supabase
      .from("content_documents")
      .select("id, bookmark_id")
      .in(
        "bookmark_id",
        sources.map((source) => source.bookmarkId),
      );
    if (documentsError) throw documentsError;

    const excerptsBySource = await Promise.all(
      sources.map(async (source) => {
        const documentIds = documents
          .filter((document) => document.bookmark_id === source.bookmarkId)
          .map((document) => document.id);
        if (documentIds.length === 0) return { source, excerpts: [] as string[] };

        const { data, error } = await supabase
          .from("content_chunks")
          .select("content")
          .in("document_id", documentIds)
          .order("chunk_index")
          .limit(2);
        if (error) throw error;
        return {
          source,
          excerpts: data.map((chunk) => chunk.content.trim()).filter(Boolean),
        };
      }),
    );
    const citedSources = excerptsBySource.filter(
      ({ excerpts }) => excerpts.length > 0,
    );
    if (citedSources.length === 0) {
      return {
        ok: false,
        error:
          "These bookmarks do not have indexed content yet. Wait for bookmark processing and indexing to finish, then try again.",
      };
    }

    const excerptBudget = Math.floor(12_000 / citedSources.length);
    const context = citedSources
      .map(({ source, excerpts }, sourceIndex) => {
        let remaining = excerptBudget;
        const boundedExcerpts = excerpts
          .map((excerpt) => {
            const bounded = excerpt.slice(0, remaining);
            remaining -= bounded.length;
            return bounded;
          })
          .filter(Boolean);
        return `[${sourceIndex + 1}] ${source.title}\nURL: ${source.url}\nExcerpts:\n${boundedExcerpts.join("\n")}`;
      })
      .join("\n\n");
    const result = await answerProvider.answerQuestion({
      question: `Write a concise, structured research report about "${project.title}". ${
        project.description ? `Research question: ${project.description}. ` : ""
      }Use only the supplied source excerpts. Include key findings and cite each factual statement using the exact [n] source markers. If the sources do not establish a point, say so. Do not make unsupported recommendations.`,
      context,
    });
    const summary = result.answer.replace(
      /\[(\d+)\]/g,
      (citation, index: string) =>
        Number(index) <= citedSources.length ? citation : "",
    );
    return {
      ok: true,
      data: {
        summary,
        sources: citedSources.map(({ source }) => source),
      },
    };
  } catch (error) {
    console.error("Research report could not be generated.", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Research report could not be generated.",
    };
  }
}
