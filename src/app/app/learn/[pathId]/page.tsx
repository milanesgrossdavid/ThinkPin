import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LearningPathWorkspace } from "../../../../components/learning/learning-path-workspace";
import { isLearningExternalSchemaUnavailable } from "../../../../lib/learning/schema";
import { createClient } from "../../../../lib/supabase/server";
import { requireAuth } from "../../../../lib/supabase/require-auth";
import type {
  LearningPath,
  LearningStage,
  LearningStageResource,
} from "../../../../types/learning";

export const metadata: Metadata = {
  title: "Learning path | ThinkPin",
  description: "Study saved resources in a structured learning path.",
};

export default async function LearningPathPage({
  params,
}: {
  params: Promise<{ pathId: string }>;
}) {
  await requireAuth();
  const { pathId } = await params;
  const supabase = await createClient();
  const { data: pathRow, error: pathError } = await supabase
    .from("learning_paths")
    .select("id, title, description, topic, status, created_at, updated_at")
    .eq("id", pathId)
    .maybeSingle();
  if (pathError) throw new Error("Learning path could not be loaded.");
  if (!pathRow) notFound();

  const { data: stageRows, error: stagesError } = await supabase
    .from("learning_stages")
    .select("id, title, description, position")
    .eq("learning_path_id", pathId)
    .order("position");
  if (stagesError) {
    console.error("Learning stages could not be loaded.", stagesError);
    throw new Error("Learning stages could not be loaded.");
  }

  const stageIds = stageRows.map((stage) => stage.id);
  const [
    { data: resourceRows, error: resourcesError },
    { data: bookmarkProgressRows, error: progressError },
  ] = stageIds.length
    ? await Promise.all([
        supabase
          .from("learning_stage_bookmarks")
          .select(
            "id, stage_id, bookmark_id, position, bookmarks!inner(id, title, description, url, domain, content_status)",
          )
          .in("stage_id", stageIds)
          .order("position"),
        supabase
          .from("learning_progress")
          .select("stage_id, bookmark_id, status, completed_at")
          .eq("learning_path_id", pathId),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (resourcesError || progressError) {
    console.error("Learning path resources could not be loaded.", {
      resourcesError,
      progressError,
    });
    throw new Error("Learning path resources could not be loaded.");
  }

  let externalRows: {
    id: string;
    stage_id: string;
    url: string;
    title: string;
    description: string | null;
    domain: string;
    position: number;
  }[] = [];
  if (stageIds.length) {
    const { data, error } = await supabase
      .from("learning_stage_external_sources")
      .select("id, stage_id, url, title, description, domain, position")
      .in("stage_id", stageIds)
      .order("position");
    if (error) {
      if (!isLearningExternalSchemaUnavailable(error)) {
        console.error("External learning sources could not be loaded.", error);
        throw new Error("External learning sources could not be loaded.");
      }
      console.warn(
        "External Learning Mode sources are unavailable until their migration is applied.",
        error,
      );
    } else {
      externalRows = data;
    }
  }
  const externalIds = externalRows.map((row) => row.id);
  const { data: externalProgressRows, error: externalProgressError } =
    externalIds.length
      ? await supabase
          .from("learning_progress")
          .select("stage_id, external_source_id, status, completed_at")
          .in("external_source_id", externalIds)
      : { data: [], error: null };
  if (externalProgressError) {
    console.error(
      "External learning progress could not be loaded.",
      externalProgressError,
    );
    throw new Error("External learning progress could not be loaded.");
  }

  const progressByResource = new Map<
    string,
    { status: LearningStageResource["status"]; completed_at: string | null }
  >();
  for (const progress of bookmarkProgressRows) {
    progressByResource.set(
      `${progress.stage_id}:bookmark:${progress.bookmark_id}`,
      progress,
    );
  }
  for (const progress of externalProgressRows) {
    progressByResource.set(
      `${progress.stage_id}:external:${progress.external_source_id}`,
      progress,
    );
  }
  const resourcesByStage = new Map<string, LearningStageResource[]>();
  for (const row of resourceRows) {
    const bookmark = Array.isArray(row.bookmarks)
      ? row.bookmarks[0]
      : row.bookmarks;
    if (!bookmark) continue;
    const progress = progressByResource.get(
      `${row.stage_id}:bookmark:${row.bookmark_id}`,
    );
    const resources = resourcesByStage.get(row.stage_id) ?? [];
    resources.push({
      id: row.id,
      resourceId: row.bookmark_id,
      resourceType: "bookmark",
      bookmarkId: row.bookmark_id,
      externalSourceId: null,
      position: row.position,
      status: progress?.status ?? "not_started",
      completedAt: progress?.completed_at ?? null,
      bookmark: {
        id: bookmark.id,
        title: bookmark.title,
        description: bookmark.description,
        url: bookmark.url,
        domain: bookmark.domain,
        contentStatus: bookmark.content_status,
        tags: [],
      },
    });
    resourcesByStage.set(row.stage_id, resources);
  }
  for (const row of externalRows) {
    const progress = progressByResource.get(
      `${row.stage_id}:external:${row.id}`,
    );
    const resources = resourcesByStage.get(row.stage_id) ?? [];
    resources.push({
      id: row.id,
      resourceId: row.id,
      resourceType: "external",
      bookmarkId: null,
      externalSourceId: row.id,
      position: row.position,
      status: progress?.status ?? "not_started",
      completedAt: progress?.completed_at ?? null,
      bookmark: {
        id: row.id,
        title: row.title,
        description: row.description,
        url: row.url,
        domain: row.domain,
        contentStatus: "ready",
        tags: [],
      },
    });
    resources.sort((first, second) => first.position - second.position);
    resourcesByStage.set(row.stage_id, resources);
  }
  const stages: LearningStage[] = stageRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    position: row.position,
    resources: resourcesByStage.get(row.id) ?? [],
  }));
  const path: LearningPath = {
    id: pathRow.id,
    title: pathRow.title,
    description: pathRow.description,
    topic: pathRow.topic,
    status: pathRow.status,
    createdAt: pathRow.created_at,
    updatedAt: pathRow.updated_at,
    stages,
  };

  return <LearningPathWorkspace initialPath={path} />;
}
