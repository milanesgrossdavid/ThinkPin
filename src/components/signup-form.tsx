"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide";
import { MorphIcon } from "morphicons/react";
import { AuthProviderButton } from "./auth-provider-button";
import { createClient } from "../lib/supabase/client";
import { ActionButton } from "./ui/ActionButton";
import {
  identifyAnalyticsUser,
  trackProductEvent,
} from "../lib/analytics";

export function SignupForm({ nextPath = "/app" }: { nextPath?: string }) {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl.toString() },
      });

      if (signupError) {
        throw signupError;
      }

      if (data.user?.id) {
        identifyAnalyticsUser(data.user.id);
        trackProductEvent("signup");
      }

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setSignupComplete(true);
      setMessage(
        "Check your email for a confirmation link to finish creating your account.",
      );
    } catch (signupError) {
      setError(
        signupError instanceof Error
          ? signupError.message
          : "We couldn't create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <AuthProviderButton
        onError={setError}
        nextPath={nextPath}
      />

      <div className="my-5 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-border/70" />
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
          or
        </span>
        <span className="h-px flex-1 bg-border/70" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="signup-email"
            className="block text-[13px] font-medium text-text"
          >
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={isSubmitting || signupComplete}
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="signup-password"
            className="block text-[13px] font-medium text-text"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              name="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              placeholder="At least 8 characters"
              required
              disabled={isSubmitting || signupComplete}
              className="h-12 w-full rounded-xl border border-border bg-background px-4 pr-12 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <button
              type="button"
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              aria-pressed={passwordVisible}
              onClick={() => setPasswordVisible((visible) => !visible)}
              className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-xl text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
            >
              <MorphIcon
                icon={passwordVisible ? Eye : EyeOff}
                size={18}
                spring="snappy"
                reducedMotion="user"
              />
            </button>
          </div>
          <p className="text-xs leading-5 text-text-muted">
            Use at least 8 characters.
          </p>
        </div>

        <ActionButton
          type="submit"
          data-primary-action
          status={
            isSubmitting
              ? "loading"
              : signupComplete
                ? "success"
                : error
                  ? "error"
                  : "idle"
          }
          className="h-12 w-full active:scale-[0.985]"
        >
          {isSubmitting
            ? "Creating account..."
            : signupComplete
              ? "Check your email"
              : error
                ? "Try again"
                : "Create account"}
        </ActionButton>
      </form>

      <p className="mt-5 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className="rounded-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Log in
        </Link>
      </p>

      {message && (
        <p
          className="mt-4 rounded-xl border border-success/30 bg-success/10 px-3 py-3 text-center text-sm leading-5 text-text"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          className="mt-4 rounded-xl border border-error/30 bg-error/5 px-3 py-3 text-center text-sm leading-5 text-error"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      )}
    </>
  );
}
