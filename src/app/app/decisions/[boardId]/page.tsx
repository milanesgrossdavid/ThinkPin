import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionBoardWorkspace } from "../../../../components/decisions/decision-board-workspace";
import { listUserBookmarks } from "../../../../lib/bookmarks/service";
import { createClient } from "../../../../lib/supabase/server";
import { requireAuth } from "../../../../lib/supabase/require-auth";
import type {
  DecisionBoard,
  DecisionCriterion,
  DecisionEvidence,
  DecisionOption,
} from "../../../../types/decision";

export const metadata: Metadata = {
  title: "Decision board | ThinkPin",
  description: "Organize evidence across decision options and criteria.",
};

export default async function DecisionBoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  await requireAuth();
  const { boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: boardRow, error: boardError } = await supabase
    .from("decision_boards")
    .select("id, title, question, created_at, updated_at")
    .eq("id", boardId)
    .maybeSingle();
  if (boardError) throw new Error("Decision board could not be loaded.");
  if (!boardRow) notFound();

  const [
    { data: optionRows, error: optionsError },
    { data: criterionRows, error: criteriaError },
    { data: evidenceRows, error: evidenceError },
    bookmarks,
  ] = await Promise.all([
    supabase
      .from("decision_options")
      .select("id, label, position")
      .eq("board_id", boardId)
      .order("position"),
    supabase
      .from("decision_criteria")
      .select("id, label, position")
      .eq("board_id", boardId)
      .order("position"),
    supabase
      .from("decision_evidence")
      .select(
        "id, option_id, criterion_id, bookmark_id, note, created_at, bookmarks(title, url, domain)",
      )
      .eq("board_id", boardId)
      .order("created_at", { ascending: false }),
    listUserBookmarks(supabase, user.id),
  ]);
  if (optionsError || criteriaError || evidenceError) {
    console.error("Decision board contents could not be loaded.", {
      optionsError,
      criteriaError,
      evidenceError,
    });
    throw new Error("Decision board contents could not be loaded.");
  }

  const options: DecisionOption[] = optionRows.map((row) => ({
    id: row.id,
    label: row.label,
    position: row.position,
  }));
  const criteria: DecisionCriterion[] = criterionRows.map((row) => ({
    id: row.id,
    label: row.label,
    position: row.position,
  }));
  const evidence: DecisionEvidence[] = evidenceRows.map((row) => {
    const bookmark = Array.isArray(row.bookmarks)
      ? row.bookmarks[0]
      : row.bookmarks;
    return {
      id: row.id,
      optionId: row.option_id,
      criterionId: row.criterion_id,
      bookmarkId: row.bookmark_id,
      note: row.note,
      createdAt: row.created_at,
      bookmark: bookmark ?? null,
    };
  });
  const board: DecisionBoard = {
    id: boardRow.id,
    title: boardRow.title,
    question: boardRow.question,
    createdAt: boardRow.created_at,
    updatedAt: boardRow.updated_at,
    options,
    criteria,
  };

  return (
    <DecisionBoardWorkspace
      board={board}
      initialEvidence={evidence}
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
