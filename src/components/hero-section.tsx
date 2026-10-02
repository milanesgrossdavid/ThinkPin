"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { HeroProductPreview } from "./hero-product-preview";

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[min(720px,calc(100svh-80px))] items-center justify-center overflow-hidden bg-background px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[36%] -z-10 size-[min(80vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_7%,transparent),transparent_70%)]"
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        <motion.h1
          id="hero-title"
          initial={
            shouldReduceMotion === true ? false : { opacity: 0, y: 16 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion === true ? 0 : 0.65,
            delay: shouldReduceMotion === true ? 0 : 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="font-heading text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-text sm:text-7xl md:text-8xl lg:text-[6.5rem]"
        >
          Your Internet,
          <br />
          <span className="text-primary">remembered.</span>
        </motion.h1>
        <motion.p
          initial={
            shouldReduceMotion === true ? false : { opacity: 0, y: 12 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion === true ? 0 : 0.55,
            delay: shouldReduceMotion === true ? 0 : 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mt-6 max-w-xl text-base leading-7 text-text-muted sm:mt-7 sm:text-[19px] sm:leading-8"
        >
          Save anything you find online.
          <br className="hidden sm:block" /> Find it when it matters.
        </motion.p>
        <motion.div
          initial={
            shouldReduceMotion === true ? false : { opacity: 0, y: 10 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion === true ? 0 : 0.5,
            delay: shouldReduceMotion === true ? 0 : 0.32,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mt-8 flex flex-col items-center gap-4 sm:mt-9 sm:flex-row"
        >
          <Link
            href="/onboarding"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-[background-color,transform] active:scale-[0.97] hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Start saving
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <a
            href="#how-it-works"
            className="rounded-md px-2 py-2 text-sm font-medium text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            See how it works
          </a>
        </motion.div>
        <HeroProductPreview />
      </div>
    </section>
  );
}