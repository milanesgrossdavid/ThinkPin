import type { Metadata } from "next";
import { AskLibrary } from "../../../components/ask/ask-library";
import { requireAuth } from "../../../lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Ask Your Library | ThinkPin",
  description: "Ask questions and get answers grounded in your saved links.",
};

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await requireAuth();
  const { q } = await searchParams;
  const initialQuestion = typeof q === "string" ? q.slice(0, 1_000) : "";

  return <AskLibrary initialQuestion={initialQuestion} />;
}
