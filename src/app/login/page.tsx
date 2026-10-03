import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "../../components/login-form";
import { AuthLogo } from "../../components/auth-logo";
import { safeNextPath } from "../../lib/auth/safe-next-path";
import { createClient } from "../../lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Log in | ThinkPin",
  description: "Log in to your ThinkPin account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const nextPath = safeNextPath(next ?? null);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims?.sub) {
    redirect("/app");
  }

  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background px-5 py-4 sm:px-8 sm:py-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[min(90vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_7%,transparent),transparent_68%)]"
      />

      <header className="flex w-full justify-center sm:justify-start">
        <AuthLogo />
      </header>

      <div className="flex flex-1 items-center justify-center py-4 sm:py-5">
        <section
          aria-labelledby="login-title"
          className="w-full max-w-[420px] rounded-[28px] border border-border/50 bg-surface-elevated p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.24)] sm:p-8"
        >
          <div className="mb-6 text-center">
            <h1
              id="login-title"
              className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-[34px]"
            >
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Sign in to pick up where you left off.
            </p>
          </div>

          <LoginForm
            authError={error === "auth_callback"}
            nextPath={nextPath}
          />
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
        <span aria-disabled="true" title="Coming soon" className="text-text-muted/70">
          Terms
        </span>
      </footer>
    </main>
  );
}
