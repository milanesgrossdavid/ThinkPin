"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Command,
  Code2,
  Link2,
  Search,
  Sparkles,
  CirclePlay,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const resources = [
  {
    title: "Designing for the web",
    domain: "read.cv",
    icon: BookOpen,
    color: "from-orange-100 to-rose-50 dark:from-orange-950 dark:to-rose-950",
    iconColor: "text-orange-600 dark:text-orange-300",
  },
  {
    title: "Linear — Build better",
    domain: "github.com",
    icon: Code2,
    color: "from-slate-200 to-slate-50 dark:from-slate-700 dark:to-slate-800",
    iconColor: "text-slate-700 dark:text-slate-200",
  },
  {
    title: "The shape of things",
    domain: "youtube.com",
    icon: CirclePlay,
    color: "from-red-100 to-orange-50 dark:from-red-950 dark:to-orange-950",
    iconColor: "text-red-600 dark:text-red-300",
  },
];

const steps = ["Save", "Analyzing", "Organized", "Connected"];

export function HeroProductPreview() {
  const shouldReduceMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion !== false) return;

    const interval = window.setInterval(() => {
      setActiveStep((step) => (step + 1) % steps.length);
    }, 1600);

    return () => window.clearInterval(interval);
  }, [shouldReduceMotion]);

  const shownStep = activeStep;

  return (
    <motion.div
      role="region"
      aria-label="Preview of your organized saved resources"
      className="relative mx-auto mt-16 w-full max-w-3xl text-left sm:mt-20"
      initial={shouldReduceMotion === true ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion === true ? 0 : 0.7,
        delay: shouldReduceMotion === true ? 0 : 0.42,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div
        aria-hidden="true"
        className="absolute -inset-3 -z-10 rounded-[28px] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_72%)] blur-2xl sm:-inset-6"
      />
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface-elevated shadow-xl ring-1 ring-text/[0.03]">
        <div
          className="flex h-14 items-center gap-3 border-b border-border px-4 sm:px-6"
        >
          <Search
            aria-hidden="true"
            className="size-[18px] shrink-0 text-text-muted"
          />
          <span className="flex-1 text-sm text-text-muted sm:text-[15px]">
            Search your memory...
          </span>
          <kbd className="hidden items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-text-muted sm:inline-flex">
            <Command aria-hidden="true" className="size-3" />K
          </kbd>
        </div>

        <div className="grid gap-6 p-4 sm:gap-7 sm:p-7">
          <section aria-labelledby="recently-saved-title">
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="recently-saved-title"
                className="text-sm font-semibold text-text"
              >
                Recently saved
              </h2>
              <span className="text-xs text-text-muted">Today</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {resources.map((resource, index) => {
                const Icon = resource.icon;

                return (
                  <motion.article
                    key={resource.domain}
                    className="group overflow-hidden rounded-xl border border-border/80 bg-surface transition-shadow hover:shadow-md"
                    initial={shouldReduceMotion === true ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: shouldReduceMotion === true ? 0 : 0.45,
                      delay: shouldReduceMotion === true ? 0 : 0.58 + index * 0.08,
                    }}
                  >
                    <div
                      className={`flex h-20 items-center justify-center bg-gradient-to-br ${resource.color} sm:h-24`}
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-white/75 shadow-sm backdrop-blur dark:bg-black/20">
                        <Icon
                          aria-hidden="true"
                          className={`size-5 ${resource.iconColor}`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-xs font-medium text-text sm:text-[13px]">
                          {resource.title}
                        </h3>
                        <p className="mt-1 truncate text-[11px] text-text-muted">
                          {resource.domain}
                        </p>
                      </div>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-text-muted/60 transition-colors group-hover:text-primary"
                      />
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </section>

          <section
            aria-labelledby="ai-discovered-title"
            className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles aria-hidden="true" className="size-4" />
                </span>
                <h2
                  id="ai-discovered-title"
                  className="text-sm font-semibold text-text"
                >
                  AI discovered
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-text">
                <Link2 aria-hidden="true" className="size-3.5 text-success" />
                12 related resources
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span className="rounded-md border border-border/80 bg-surface-elevated px-2.5 py-1.5 text-text">
                Web design
              </span>
              <span aria-hidden="true" className="text-primary/60">
                ↗
              </span>
              <span className="rounded-md border border-border/80 bg-surface-elevated px-2.5 py-1.5 text-text">
                Creative tools
              </span>
              <span aria-hidden="true" className="text-primary/60">
                ↗
              </span>
              <span className="rounded-md border border-border/80 bg-surface-elevated px-2.5 py-1.5 text-text">
                Inspiration
              </span>
            </div>
          </section>

          <div
            role="group"
            aria-label={`Saving flow: ${steps[shownStep]}`}
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 border-t border-border/70 pt-5 sm:gap-x-3"
          >
            {steps.map((step, index) => {
              const isComplete = index < shownStep;
              const isCurrent = index === shownStep;

              return (
                <div key={step} className="flex items-center gap-2 sm:gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors duration-300 sm:text-xs ${
                      isCurrent || isComplete
                        ? "text-primary"
                        : "text-text-muted/65"
                    }`}
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded-full ${
                        isComplete
                          ? "bg-success text-white"
                          : isCurrent
                            ? "bg-primary text-white"
                            : "border border-border bg-surface"
                      }`}
                    >
                      {isComplete ? (
                        <Check aria-hidden="true" className="size-2.5" />
                      ) : isCurrent ? (
                        <motion.span
                          aria-hidden="true"
                          className="size-1.5 rounded-full bg-white"
                          animate={
                            shouldReduceMotion === true
                              ? undefined
                              : { scale: [1, 0.7, 1] }
                          }
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      ) : null}
                    </span>
                    {step}
                  </span>
                  {index < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="text-[10px] text-text-muted/50"
                    >
                      →
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
