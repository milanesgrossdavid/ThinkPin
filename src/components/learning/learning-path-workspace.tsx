"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowUpRight,
  BookOpen,
  BookOpenCheck,
  Check,
  Circle,
  Sparkles,
} from "lucide-react";
import {
  explainLearningStageAction,
  updateLearningProgressAction,
} from "../../app/actions/learning";
import type {
  LearningPath,
  LearningStageResource,
} from "../../types/learning";

type Explanation = {
  stageId: string;
  text: string;
  sources: { resourceId: string; title: string; url: string }[];
};

export function LearningPathWorkspace({
  initialPath,
}: {
  initialPath: LearningPath;
}) {
  const [path, setPath] = useState(initialPath);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [message, setMessage] = useState("");
  const [isExplaining, setIsExplaining] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const totalResources = path.stages.reduce(
    (sum, stage) => sum + stage.resources.length,
    0,
  );
  const studiedResources = path.stages.reduce(
    (sum, stage) =>
      sum +
      stage.resources.filter((resource) => resource.status !== "not_started")
        .length,
    0,
  );
  const progress =
    totalResources > 0
      ? Math.round((studiedResources / totalResources) * 100)
      : 0;

  function setResourceStudied(
    stageId: string,
    resource: LearningStageResource,
    studied: boolean,
  ) {
    setMessage("");
    startTransition(async () => {
      const result = await updateLearningProgressAction({
        pathId: path.id,
        stageId,
        resourceId: resource.resourceId,
        resourceType: resource.resourceType,
        studied,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setPath((current) => ({
        ...current,
        stages: current.stages.map((stage) => ({
          ...stage,
          resources: stage.resources.map((item) =>
            item.resourceId === resource.resourceId &&
            stage.id === stageId
              ? {
                  ...item,
                  status: result.data,
                  completedAt: studied ? new Date().toISOString() : null,
                }
              : item,
          ),
        })),
      }));
    });
  }

  async function explainStage(stageId: string) {
    setMessage("");
    setIsExplaining(stageId);
    try {
      const result = await explainLearningStageAction({
        pathId: path.id,
        stageId,
        requestId: crypto.randomUUID(),
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setExplanations((current) => [
        ...current.filter((item) => item.stageId !== stageId),
        {
          stageId,
          text: result.data.explanation,
          sources: result.data.sources,
        },
      ]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The explanation could not be generated.",
      );
    } finally {
      setIsExplaining(null);
    }
  }

  return (
    <main className="min-h-svh bg-background px-4 pb-24 pt-6 sm:px-8 sm:pt-9">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/app/learn"
          className="text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          ← All learning paths
        </Link>
        <header className="mt-5 rounded-3xl border border-border/70 bg-surface-elevated p-5 sm:p-7">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <BookOpenCheck aria-hidden="true" className="size-4" />
            Learning path
          </p>
          <h1 data-page-title className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-4xl">
            {path.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
            {path.description}
          </p>
          <div className="mt-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text">
                Your progress
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {studiedResources} of {totalResources} resources studied
              </p>
            </div>
            <span className="text-lg font-semibold tabular-nums text-primary">
              {progress}%
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-background"
            role="progressbar"
            aria-label="Learning path progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        {message && (
          <p role="alert" className="mt-4 text-sm text-error">
            {message}
          </p>
        )}

        <div className="mt-7 space-y-4">
          {path.stages.map((stage) => {
            const stageLearned = stage.resources.filter(
              (resource) => resource.status !== "not_started",
            ).length;
            const explanation = explanations.find(
              (item) => item.stageId === stage.id,
            );
            return (
              <section
                key={stage.id}
                className="rounded-3xl border border-border/70 bg-surface-elevated p-5 sm:p-6"
                aria-labelledby={`stage-${stage.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-semibold tabular-nums text-primary">
                      {String(stage.position + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2
                        id={`stage-${stage.id}`}
                        className="text-lg font-semibold text-text"
                      >
                        {stage.title}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">
                    {stageLearned}/{stage.resources.length} studied
                  </span>
                </div>

                <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Your resources
                </h3>
                <ul className="mt-2 divide-y divide-border/60">
                  {stage.resources.map((resource) => {
                    const studied = resource.status !== "not_started";
                    return (
                      <li
                        key={resource.id}
                        className="flex items-center gap-3 py-3"
                      >
                        <span
                          className={
                            studied
                              ? "grid size-7 shrink-0 place-items-center rounded-full bg-success/15 text-success"
                              : "grid size-7 shrink-0 place-items-center rounded-full bg-background text-text-muted"
                          }
                        >
                          {studied ? (
                            <Check aria-hidden="true" className="size-4" />
                          ) : (
                            <Circle aria-hidden="true" className="size-3.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          {resource.resourceType === "bookmark" ? (
                            <Link
                              href={`/app/bookmarks/${resource.bookmark.id}`}
                              className="line-clamp-2 text-sm font-medium text-text hover:text-primary"
                            >
                              {resource.bookmark.title}
                            </Link>
                          ) : (
                            <span className="line-clamp-2 text-sm font-medium text-text">
                              {resource.bookmark.title}
                            </span>
                          )}
                          <p className="mt-0.5 text-xs text-text-muted">
                            {resource.bookmark.domain}
                            {resource.resourceType === "external" &&
                              " · External source"}
                          </p>
                        </div>
                        <a
                          href={resource.bookmark.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open source ${resource.bookmark.title}`}
                          className="grid size-8 shrink-0 place-items-center rounded-full text-text-muted hover:bg-background hover:text-primary"
                        >
                          <ArrowUpRight
                            aria-hidden="true"
                            className="size-4"
                          />
                        </a>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            setResourceStudied(stage.id, resource, !studied)
                          }
                          className={`min-h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors disabled:opacity-50 ${
                            studied
                              ? "border border-border text-text-muted hover:bg-background"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          }`}
                        >
                          {studied ? "Studied" : "Mark learned"}
                        </button>
                      </li>
                    );
                  })}
                  {stage.resources.length === 0 && (
                    <li className="py-3 text-sm text-text-muted">
                      No saved resources in this stage.
                    </li>
                  )}
                </ul>

                <button
                  type="button"
                  disabled={isExplaining === stage.id}
                  onClick={() => void explainStage(stage.id)}
                  className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/25 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
                >
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  {isExplaining === stage.id
                    ? "Preparing explanation…"
                    : "Explain this stage"}
                </button>

                {explanation && (
                  <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
                      <BookOpen
                        aria-hidden="true"
                        className="size-4 text-primary"
                      />
                      Explanation
                    </h3>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text">
                      {explanation.text}
                    </div>
                    <div className="mt-4 border-t border-border/70 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Based on
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {explanation.sources.map((source, index) => (
                          <li key={source.resourceId}>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-primary hover:border-primary/30"
                            >
                              [{index + 1}] {source.title}
                              <ArrowUpRight
                                aria-hidden="true"
                                className="size-3"
                              />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
