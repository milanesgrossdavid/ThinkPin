import type { Metadata } from "next";
import { ResearchProjects } from "../../../components/research/research-projects";
import { createClient } from "../../../lib/supabase/server";
import { requireAuth } from "../../../lib/supabase/require-auth";
import type { ResearchProject } from "../../../types/research";

export const metadata: Metadata = {
  title: "Research | ThinkPin",
  description: "Investigate ideas using sources from your library.",
};

export default async function ResearchPage() {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_projects")
    .select("id, title, description, status, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("Research projects could not be loaded.", error);
    throw new Error("Research projects could not be loaded.");
  }

  const projects: ResearchProject[] = data.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description ?? undefined,
    status: project.status,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }));

  return <ResearchProjects initialProjects={projects} />;
}
