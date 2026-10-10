import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function TestimonialsSection() {
  return (
    <section
      aria-labelledby="testimonials-title"
      data-scroll-reveal
      className="bg-surface-elevated px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-3xl rounded-3xl border border-border/60 bg-background px-6 py-10 text-center sm:px-10 sm:py-12">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageCircle aria-hidden="true" className="size-5" />
        </span>
        <h2
          id="testimonials-title"
          className="mt-5 font-heading text-3xl leading-tight tracking-tight text-text sm:text-4xl"
        >
          Real experiences, when they&apos;re ready.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
          ThinkPin is still growing, and we don&apos;t have customer
          testimonials to publish yet. We won&apos;t invent reviews. If
          you&apos;ve tried the product, your honest feedback can help shape it.
        </p>
        <Link
          href="#contact"
          className="mt-6 inline-flex min-h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-text transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          Share your feedback
        </Link>
      </div>
    </section>
  );
}
