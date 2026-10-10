"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, FlaskConical, Plus, Sparkles } from "lucide-react";
import { createResearchProjectAction } from "../../app/actions/research";
import type { ResearchProject } from "../../types/research";

export function ResearchProjects({
  initialProjects,
}: {
  initialProjects: ResearchProject[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createResearchProjectAction(title, description);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setProjects((current) => [result.data, ...current]);
      setTitle("");
      setDescription("");
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
              <FlaskConical aria-hidden="true" className="size-4" />
              Research Mode
            </p>
            <h1 data-page-title className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-text sm:text-4xl">
              Investigate what you save.
            </h1>
            <p data-page-summary className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              For multi-source questions: bring saved links together, capture
              your notes, and build a report with citations.
            </p>
          </div>
          <button
            type="button"
            data-primary-action
            onClick={() => setShowForm((visible) => !visible)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus aria-hidden="true" className="size-4" />
            New Research
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={createProject}
            className="mt-7 rounded-3xl border border-border/70 bg-surface-elevated p-5 sm:p-7"
          >
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-text">
              Create a research project
            </h2>
            <label className="mt-5 block text-sm font-medium text-text">
              Title
              <input
                autoFocus
                required
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Best authentication systems for Next.js"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-text">
              Research question or description
              <textarea
                maxLength={1_000}
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Compare authentication approaches for modern Next.js applications."
                className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            {error && (
              <p role="alert" className="mt-3 text-sm text-error">
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
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
                {isPending ? "Creating…" : "Create Research"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-9 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-text">
            Your research
          </h2>
          <span className="text-xs text-text-muted">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>
        {projects.length > 0 ? (
          <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/app/research/${project.id}`}
                  className="group flex min-h-40 flex-col rounded-3xl border border-border/70 bg-surface-elevated p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <FlaskConical aria-hidden="true" className="size-5" />
                    </span>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] capitalize text-text-muted">
                      {project.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-text">
                    {project.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm leading-5 text-text-muted">
                    {project.description || "Add sources and notes to begin."}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Open workspace
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
            <Sparkles
              aria-hidden="true"
              className="mx-auto size-6 text-primary"
            />
            <h3 className="mt-3 font-semibold text-text">
              Start with a question you want to investigate
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-text-muted">
              Create your first research project, then bring in relevant
              bookmarks from your library.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
