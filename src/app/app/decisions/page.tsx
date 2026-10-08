import type { Metadata } from "next";
import { DecisionBoards } from "../../../components/decisions/decision-boards";
import { createClient } from "../../../lib/supabase/server";
import { requireAuth } from "../../../lib/supabase/require-auth";
import type { DecisionBoard } from "../../../types/decision";

export const metadata: Metadata = {
  title: "Decision Boards | ThinkPin",
  description: "Compare options using evidence you choose.",
};

export default async function DecisionBoardsPage() {
  await requireAuth();
  const supabase = await createClient();
  const { data: boardRows, error } = await supabase
    .from("decision_boards")
    .select("id, title, question, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("Decision boards could not be loaded.", error);
    throw new Error("Decision boards could not be loaded.");
  }

  const boardIds = boardRows.map((board) => board.id);
  const [{ data: optionRows, error: optionsError }, { data: criterionRows, error: criteriaError }] =
    boardIds.length
      ? await Promise.all([
          supabase
            .from("decision_options")
            .select("id, board_id, label, position")
            .in("board_id", boardIds)
            .order("position"),
          supabase
            .from("decision_criteria")
            .select("id, board_id, label, position")
            .in("board_id", boardIds)
            .order("position"),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
  if (optionsError || criteriaError) {
    console.error("Decision board setup could not be loaded.", {
      optionsError,
      criteriaError,
    });
    throw new Error("Decision board setup could not be loaded.");
  }

  const boards: DecisionBoard[] = boardRows.map((board) => ({
    id: board.id,
    title: board.title,
    question: board.question,
    createdAt: board.created_at,
    updatedAt: board.updated_at,
    options: optionRows
      .filter((option) => option.board_id === board.id)
      .map(({ id, label, position }) => ({ id, label, position })),
    criteria: criterionRows
      .filter((criterion) => criterion.board_id === board.id)
      .map(({ id, label, position }) => ({ id, label, position })),
  }));

  return <DecisionBoards initialBoards={boards} />;
}
