import { ArrowRight, Sparkles } from "lucide-react";

export function CTASection() {
  return (
    <section
      id="get-started"
      aria-labelledby="cta-title"
      className="relative isolate overflow-hidden bg-background px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_8%,transparent),transparent_65%)]"
      />
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles aria-hidden="true" className="size-5" />
        </span>
        <h2
          id="cta-title"
          className="mt-6 font-heading text-4xl leading-[1.02] tracking-tight text-text sm:text-5xl md:text-6xl"
        >
          Your Internet is already full
          <br className="hidden sm:block" /> of things worth remembering.
        </h2>
        <p className="mt-4 font-heading text-3xl leading-tight text-primary sm:text-4xl">
          Now give it a memory.
        </p>
        <a
          href="#get-started"
          className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-[background-color,transform] active:scale-[0.97] hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:mt-10 sm:text-base"
        >
          Start building your memory
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </div>
    </section>
  );
}
