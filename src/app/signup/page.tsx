import type { Metadata } from "next";
import Link from "next/link";
import { AuthLogo } from "../../components/auth-logo";
import { SignupForm } from "../../components/signup-form";
import { safeNextPath } from "../../lib/auth/safe-next-path";

export const metadata: Metadata = {
  title: "Create your account | ThinkPin",
  description:
    "Create a ThinkPin account and start building your internet memory.",
};

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  return (
    <main data-auth-shell className="relative isolate flex min-h-svh flex-col overflow-x-hidden bg-background px-5 py-4 sm:px-8 sm:py-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[min(90vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_7%,transparent),transparent_68%)]"
      />

      <header className="flex w-full justify-center sm:justify-start">
        <AuthLogo />
      </header>

      <div data-auth-stage className="flex flex-1 items-center justify-center py-4 sm:py-5">
        <section
          aria-labelledby="signup-title"
          data-auth-card
          className="w-full max-w-[420px] rounded-[28px] border border-border/50 bg-surface-elevated p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.24)] sm:p-8"
        >
          <div className="mb-6 text-center">
            <h1
              id="signup-title"
              data-page-title
              className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-[34px]"
            >
              Create your account
            </h1>
            <p data-page-summary className="mt-2 text-sm leading-6 text-text-muted">
              Start building a memory for the things you find online.
            </p>
          </div>

          <SignupForm nextPath={nextPath} />
        </section>
      </div>

      <footer className="flex items-center justify-center gap-3 py-2 text-xs text-text-muted">
        <Link
          href="/#faq-privacy"
          className="rounded-sm transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Privacy
        </Link>
        <span aria-hidden="true" className="text-border">
          ·
        </span>
        <span
          aria-disabled="true"
          title="Coming soon"
          className="text-text-muted/70"
        >
          Terms
        </span>
      </footer>
    </main>
  );
}
