"use client";

import {
  ArrowUpRight,
  BookOpen,
  Command,
  Code2,
  Folder,
  Search,
  CirclePlay,
  Tags,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const resources = [
  {
    title: "A saved design article",
    domain: "example.com",
    icon: BookOpen,
    color: "from-orange-100 to-rose-50 dark:from-orange-950 dark:to-rose-950",
    iconColor: "text-orange-600 dark:text-orange-300",
  },
  {
    title: "An open-source project",
    domain: "github.com",
    icon: Code2,
    color: "from-slate-200 to-slate-50 dark:from-slate-700 dark:to-slate-800",
    iconColor: "text-slate-700 dark:text-slate-200",
  },
  {
    title: "A saved video",
    domain: "youtube.com",
    icon: CirclePlay,
    color: "from-red-100 to-orange-50 dark:from-red-950 dark:to-orange-950",
    iconColor: "text-red-600 dark:text-red-300",
  },
];

export function HeroProductPreview() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      role="region"
      aria-label="Illustrative library preview"
      className="relative mx-auto mt-14 w-full max-w-4xl text-left sm:mt-16"
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
      <div className="overflow-hidden rounded-[24px] border border-white/80 bg-surface-elevated shadow-[0_24px_80px_-32px_rgba(0,0,0,0.24)] ring-1 ring-text/[0.04] dark:border-border">
        <div
          className="flex h-14 items-center gap-3 border-b border-border/70 bg-surface-elevated/80 px-4 sm:px-6"
        >
          <Search
            aria-hidden="true"
            className="size-[18px] shrink-0 text-text-muted"
          />
          <span className="flex-1 text-sm text-text-muted sm:text-[15px]">
            Search your library...
          </span>
          <kbd className="hidden items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-text-muted sm:inline-flex">
            <Command aria-hidden="true" className="size-3" />K
          </kbd>
        </div>

        <div className="grid gap-6 p-4 sm:gap-7 sm:p-7">
          <section aria-labelledby="example-saved-links-title">
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="example-saved-links-title"
                className="text-sm font-semibold text-text"
              >
                Example saved links
              </h2>
              <span className="text-xs text-text-muted">Illustrative</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {resources.map((resource, index) => {
                const Icon = resource.icon;

                return (
                  <motion.article
                    key={resource.domain}
                    className="group overflow-hidden rounded-2xl border border-border/60 bg-surface transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md"
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
            aria-labelledby="example-collection-title"
            className="rounded-2xl border border-border/60 bg-background/75 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Folder aria-hidden="true" className="size-4" />
                </span>
                <h2
                  id="example-collection-title"
                  className="text-sm font-semibold text-text"
                >
                  Example collection
                </h2>
              </div>
              <span className="text-xs text-text-muted">Reading list</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-surface-elevated px-2.5 py-1.5 text-text">
                <Tags aria-hidden="true" className="size-3.5" />
                Add tags to organize links
              </span>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
