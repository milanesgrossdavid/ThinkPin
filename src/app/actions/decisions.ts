"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import type {
  DecisionBoard,
  DecisionCriterion,
  DecisionEvidence,
  DecisionOption,
} from "../../types/decision";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Authentication is required.");
  return { supabase, user };
}

function parseLabels(input: string, max: number, kind: string) {
  const labels = input
    .split(/[\n,]/)
    .map((label) => label.trim())
    .filter(Boolean);
  const unique = [...new Map(labels.map((label) => [label.toLowerCase(), label])).values()];
  if (unique.length < 2 || unique.length > max) {
    throw new Error(
      `Add between 2 and ${max} distinct ${kind}.`,
    );
  }
  if (unique.some((label) => label.length > 80)) {
    throw new Error(`${kind} must be 80 characters or fewer.`);
  }
  return unique;
}

export async function createDecisionBoardAction(
  titleInput: string,
  questionInput: string,
  optionsInput: string,
  criteriaInput: string,
): Promise<ActionResult<DecisionBoard>> {
  let boardId: string | null = null;
  try {
    const title = titleInput.trim();
    const question = questionInput.trim();
    if (!title || title.length > 160 || question.length > 1_000) {
      return { ok: false, error: "Check the title and question lengths." };
    }
    const options = parseLabels(optionsInput, 8, "options");
    const criteria = parseLabels(criteriaInput, 10, "criteria");
    const { supabase, user } = await authenticatedClient();
    const { data: board, error: boardError } = await supabase
      .from("decision_boards")
      .insert({ user_id: user.id, title, question })
      .select("id, title, question, created_at, updated_at")
      .single();
    if (boardError) throw boardError;
    boardId = board.id;

    const [{ data: optionRows, error: optionsError }, { data: criterionRows, error: criteriaError }] =
      await Promise.all([
        supabase
          .from("decision_options")
          .insert(options.map((label, position) => ({ board_id: board.id, label, position })))
          .select("id, label, position"),
        supabase
          .from("decision_criteria")
          .insert(criteria.map((label, position) => ({ board_id: board.id, label, position })))
          .select("id, label, position"),
      ]);
    if (optionsError) throw optionsError;
    if (criteriaError) throw criteriaError;

    revalidatePath("/app/decisions");
    return {
      ok: true,
      data: {
        id: board.id,
        title: board.title,
        question: board.question,
        createdAt: board.created_at,
        updatedAt: board.updated_at,
        options: optionRows satisfies DecisionOption[],
        criteria: criterionRows satisfies DecisionCriterion[],
      },
    };
  } catch (error) {
    if (boardId) {
      try {
        const { supabase } = await authenticatedClient();
        const { error: cleanupError } = await supabase
          .from("decision_boards")
          .delete()
          .eq("id", boardId);
        if (cleanupError) throw cleanupError;
      } catch (cleanupError) {
        console.error("Incomplete decision board could not be rolled back.", cleanupError);
      }
    }
    console.error("Decision board could not be created.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Decision board could not be created.",
    };
  }
}

export async function addDecisionEvidenceAction(input: {
  boardId: string;
  optionId: string;
  criterionId: string;
  bookmarkId: string;
  note: string;
}): Promise<ActionResult<DecisionEvidence>> {
  try {
    const note = input.note.trim();
    const bookmarkId = input.bookmarkId.trim() || null;
    if (!input.boardId || !input.optionId || !input.criterionId) {
      return { ok: false, error: "Choose an option and a criterion." };
    }
    if (!bookmarkId && !note) {
      return { ok: false, error: "Choose a bookmark or add an evidence note." };
    }
    if (note.length > 2_000) {
      return { ok: false, error: "Evidence notes must be 2,000 characters or fewer." };
    }
    const { supabase } = await authenticatedClient();
    const { data, error } = await supabase
      .from("decision_evidence")
      .insert({
        board_id: input.boardId,
        option_id: input.optionId,
        criterion_id: input.criterionId,
        bookmark_id: bookmarkId,
        note: note || null,
      })
      .select("id, option_id, criterion_id, bookmark_id, note, created_at")
      .single();
    if (error) throw error;

    let bookmark: DecisionEvidence["bookmark"] = null;
    if (data.bookmark_id) {
      const { data: bookmarkRow, error: bookmarkError } = await supabase
        .from("bookmarks")
        .select("title, url, domain")
        .eq("id", data.bookmark_id)
        .single();
      if (bookmarkError) throw bookmarkError;
      bookmark = bookmarkRow;
    }
    revalidatePath(`/app/decisions/${input.boardId}`);
    return {
      ok: true,
      data: {
        id: data.id,
        optionId: data.option_id,
        criterionId: data.criterion_id,
        bookmarkId: data.bookmark_id,
        note: data.note,
        createdAt: data.created_at,
        bookmark,
      },
    };
  } catch (error) {
    console.error("Decision evidence could not be added.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Decision evidence could not be added.",
    };
  }
}

export async function deleteDecisionEvidenceAction(
  evidenceId: string,
  boardId: string,
): Promise<ActionResult<null>> {
  try {
    if (!evidenceId || !boardId) {
      return { ok: false, error: "Decision evidence is invalid." };
    }
    const { supabase } = await authenticatedClient();
    const { data, error } = await supabase
      .from("decision_evidence")
      .delete()
      .eq("id", evidenceId)
      .eq("board_id", boardId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "Decision evidence was not found." };
    revalidatePath(`/app/decisions/${boardId}`);
    return { ok: true, data: null };
  } catch (error) {
    console.error("Decision evidence could not be deleted.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Decision evidence could not be deleted.",
    };
  }
}

export async function deleteDecisionBoardAction(
  boardId: string,
): Promise<ActionResult<null>> {
  try {
    if (!boardId) return { ok: false, error: "Decision board ID is invalid." };
    const { supabase } = await authenticatedClient();
    const { data, error } = await supabase
      .from("decision_boards")
      .delete()
      .eq("id", boardId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "Decision board was not found." };
    revalidatePath("/app/decisions");
    revalidatePath(`/app/decisions/${boardId}`);
    return { ok: true, data: null };
  } catch (error) {
    console.error("Decision board could not be deleted.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Decision board could not be deleted.",
    };
  }
}
