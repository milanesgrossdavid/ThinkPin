"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { HeroProductPreview } from "./hero-product-preview";

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[min(760px,calc(100svh-100px))] items-center justify-center overflow-hidden bg-background px-5 py-24 sm:px-8 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[min(80vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_10%,transparent),transparent_70%)]"
      />
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
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
          className="font-heading text-6xl leading-[0.92] tracking-tight text-text sm:text-7xl md:text-8xl lg:text-[7.5rem]"
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
          className="mt-7 max-w-xl text-base leading-7 text-text-muted sm:mt-8 sm:text-lg sm:leading-8"
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
          className="mt-9 flex flex-col items-center gap-5 sm:mt-10 sm:flex-row"
        >
          <motion.a
            href="#get-started"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground shadow-sm transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
          >
            Start saving
            <ArrowRight aria-hidden="true" className="size-4" />
          </motion.a>
          <a
            href="#how-it-works"
            className="rounded-md px-2 py-2 text-sm font-medium text-text transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            See how it works
          </a>
        </motion.div>
        <HeroProductPreview />
      </div>
    </section>
  );
}