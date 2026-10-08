"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  createLearningPathAction,
  deleteLearningPathAction,
} from "../../app/actions/learning";
import type { LearningPath } from "../../types/learning";

type LearningSourceMode = "bookmarks" | "web";

export function LearningPaths({
  initialPaths,
}: {
  initialPaths: LearningPath[];
}) {
  const [paths, setPaths] = useState(initialPaths);
  const [showForm, setShowForm] = useState(false);
  const [topic, setTopic] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [sourceMode, setSourceMode] =
    useState<LearningSourceMode>("bookmarks");
  const [saveExternalBookmark, setSaveExternalBookmark] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function createPath(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createLearningPathAction(
        topic,
        sourceMode === "web" ? externalUrl : "",
        {
          includeLibrary: sourceMode === "bookmarks",
          saveExternalBookmark:
            sourceMode === "web" && saveExternalBookmark,
        },
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPaths((current) => [result.data, ...current]);
      setTopic("");
      setExternalUrl("");
      setSaveExternalBookmark(false);
      setShowForm(false);
    });
  }

  function deletePath(pathId: string, title: string) {
    if (
      !window.confirm(
        `Delete "${title}" and its learning progress? Your library bookmarks won't be deleted.`,
      )
    ) {
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await deleteLearningPathAction(pathId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPaths((current) => current.filter((path) => path.id !== pathId));
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
              <BookOpenCheck aria-hidden="true" className="size-4" />
              Learning Mode
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-text sm:text-4xl">
              Learn from what you saved.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              Build an ordered path from saved bookmarks or a public web page.
              Your progress changes only when you mark a resource as studied.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((visible) => !visible)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus aria-hidden="true" className="size-4" />
            Create learning path
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={createPath}
            className="mt-7 rounded-3xl border border-border/70 bg-surface-elevated p-5 sm:p-7"
          >
            <h2 className="text-lg font-semibold text-text">
              What would you like to learn?
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Choose whether to build the path from bookmarks in your library
              or directly from a public web page.
            </p>
            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-text">
                Choose your source
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["bookmarks", "Saved bookmarks"],
                    ["web", "External web page"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={sourceMode === mode}
                    onClick={() => setSourceMode(mode)}
                    className={`min-h-11 rounded-xl border px-4 text-left text-sm font-medium transition-colors ${
                      sourceMode === mode
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-text-muted hover:border-primary/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="mt-5 block text-sm font-medium text-text">
              {sourceMode === "bookmarks"
                ? "What do you want to learn from your bookmarks?"
                : "What should this page teach you? (optional)"}
              <input
                autoFocus
                required={sourceMode === "bookmarks"}
                maxLength={200}
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder={
                  sourceMode === "bookmarks"
                    ? "React hooks for beginners"
                    : "Key ideas from this article"
                }
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            {sourceMode === "web" && (
              <>
                <label className="mt-4 block text-sm font-medium text-text">
                  Web page URL
                  <input
                    type="url"
                    required
                    maxLength={2_048}
                    value={externalUrl}
                    onChange={(event) => setExternalUrl(event.target.value)}
                    placeholder="https://react.dev/learn"
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                  <span className="mt-1 block text-xs font-normal text-text-muted">
                    We&apos;ll extract the page and use it for this learning path.
                  </span>
                </label>
                <label className="mt-4 flex items-start gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={saveExternalBookmark}
                    onChange={(event) =>
                      setSaveExternalBookmark(event.target.checked)
                    }
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    Also save this URL as a bookmark in my library
                  </span>
                </label>
              </>
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
                disabled={
                  isPending ||
                  (sourceMode === "bookmarks"
                    ? !topic.trim()
                    : !externalUrl.trim())
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                <Sparkles aria-hidden="true" className="size-4" />
                {isPending ? "Building path…" : "Build my path"}
              </button>
            </div>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-error">
            {error}
          </p>
        )}

        <div className="mt-9 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-text">
            Your learning paths
          </h2>
          <span className="text-xs text-text-muted">
            {paths.length} {paths.length === 1 ? "path" : "paths"}
          </span>
        </div>
        {paths.length > 0 ? (
          <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
            {paths.map((path) => {
              const total = path.stages.reduce(
                (sum, stage) => sum + stage.resources.length,
                0,
              );
              const learned = path.stages.reduce(
                (sum, stage) =>
                  sum +
                  stage.resources.filter(
                    (resource) => resource.status !== "not_started",
                  ).length,
                0,
              );
              return (
                <li key={path.id}>
                  <article className="relative flex min-h-48 flex-col rounded-3xl border border-border/70 bg-surface-elevated p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                    <button
                      type="button"
                      aria-label={`Delete learning path ${path.title}`}
                      title="Delete learning path"
                      disabled={isPending}
                      onClick={() => deletePath(path.id, path.title)}
                      className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-text-muted transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                    <Link
                      href={`/app/learn/${path.id}`}
                      className="group flex flex-1 flex-col rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <BookOpenCheck aria-hidden="true" className="size-5" />
                      </span>
                      <h3 className="mt-4 pr-10 text-base font-semibold text-text">
                        {path.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 flex-1 text-sm leading-5 text-text-muted">
                        {path.description || path.topic}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                        <span>
                          {path.stages.length} stages · {total} resources
                        </span>
                        <span>
                          {learned}/{total} studied
                        </span>
                      </div>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                        Continue learning
                        <ArrowRight
                          aria-hidden="true"
                          className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </Link>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-surface-elevated/60 px-6 py-14 text-center">
            <Sparkles
              aria-hidden="true"
              className="mx-auto size-6 text-primary"
            />
            <h3 className="mt-3 font-semibold text-text">
              Start with a topic in your library
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-text-muted">
              Start with a topic from your library or paste a public web page
              directly as a learning source.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
