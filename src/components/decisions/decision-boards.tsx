"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, ClipboardList, Plus, Scale } from "lucide-react";
import { createDecisionBoardAction } from "../../app/actions/decisions";
import type { DecisionBoard } from "../../types/decision";

export function DecisionBoards({
  initialBoards,
}: {
  initialBoards: DecisionBoard[];
}) {
  const [boards, setBoards] = useState(initialBoards);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("");
  const [criteria, setCriteria] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function createBoard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createDecisionBoardAction(
        title,
        question,
        options,
        criteria,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBoards((current) => [result.data, ...current]);
      setTitle("");
      setQuestion("");
      setOptions("");
      setCriteria("");
      setShowForm(false);
    });
  }

  return (
    <main className="min-h-svh bg-background px-4 pb-24 pt-8 sm:px-8 sm:pt-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/app"
          className="text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          ← Dashboard
        </Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Scale aria-hidden="true" className="size-4" />
              Decision Boards
            </p>
            <h1 data-page-title className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-text sm:text-4xl">
              Compare with evidence.
            </h1>
            <p data-page-summary className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              For decisions with competing options: compare saved evidence
              against your criteria, while the final choice stays yours.
            </p>
          </div>
          <button
            type="button"
            data-primary-action
            onClick={() => setShowForm((visible) => !visible)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus aria-hidden="true" className="size-4" />
            New decision
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={createBoard}
            className="mt-7 rounded-3xl border border-border/70 bg-surface-elevated p-5 sm:p-7"
          >
            <h2 className="text-lg font-semibold text-text">
              Set up your comparison
            </h2>
            <label className="mt-5 block text-sm font-medium text-text">
              What are you deciding?
              <input
                required
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Choose an AI coding tool"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-text">
              Decision question <span className="font-normal text-text-muted">(optional)</span>
              <textarea
                maxLength={1_000}
                rows={2}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Which tool fits my Mac and VS Code workflow?"
                className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-text">
                Options <span className="font-normal text-text-muted">(2–8)</span>
                <textarea
                  required
                  rows={4}
                  value={options}
                  onChange={(event) => setOptions(event.target.value)}
                  placeholder={"Cursor\nClaude Code\nCodex\nWindsurf"}
                  className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                <span className="mt-1 block text-xs font-normal text-text-muted">
                  Enter one option per line, or separate with commas.
                </span>
              </label>
              <label className="block text-sm font-medium text-text">
                Criteria <span className="font-normal text-text-muted">(2–10)</span>
                <textarea
                  required
                  rows={4}
                  value={criteria}
                  onChange={(event) => setCriteria(event.target.value)}
                  placeholder={"Mac\nPrice\nAgent mode\nLocal models\nVS Code"}
                  className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                <span className="mt-1 block text-xs font-normal text-text-muted">
                  Criteria are comparison headings, not scores or rankings.
                </span>
              </label>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-error">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="min-h-10 rounded-full px-4 text-sm font-medium text-text-muted hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-primary-action
                disabled={isPending}
                className="min-h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {isPending ? "Creating…" : "Create decision board"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-9 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-text">
            Your decision boards
          </h2>
          <span className="text-xs text-text-muted">
            {boards.length} {boards.length === 1 ? "board" : "boards"}
          </span>
        </div>
        {boards.length > 0 ? (
          <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
            {boards.map((board) => (
              <li key={board.id}>
                <Link
                  href={`/app/decisions/${board.id}`}
                  className="group flex min-h-44 flex-col rounded-3xl border border-border/70 bg-surface-elevated p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <ClipboardList aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-text">
                    {board.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm leading-5 text-text-muted">
                    {board.question || "Evidence organized by your criteria."}
                  </p>
                  <p className="mt-3 text-xs text-text-muted">
                    {board.options.length} options · {board.criteria.length}{" "}
                    criteria
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Open comparison
                    <ArrowRight
                      aria-hidden="true"
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-surface-elevated/60 px-6 py-14 text-center">
            <Scale aria-hidden="true" className="mx-auto size-6 text-primary" />
            <h3 className="mt-3 font-semibold text-text">
              Start with a decision you want to make
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-text-muted">
              Add the options and criteria that matter to you, then attach
              bookmarks and notes as evidence.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
