"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide";
import { MorphIcon } from "morphicons/react";
import { AuthProviderButton } from "./auth-provider-button";
import { createClient } from "../lib/supabase/client";
import { ActionButton } from "./ui/ActionButton";

export function LoginForm({
  authError = false,
  nextPath = "/app",
}: {
  authError?: boolean;
  nextPath?: string;
}) {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSucceeded, setLoginSucceeded] = useState(false);
  const [error, setError] = useState(
    authError
      ? "We couldn't complete sign-in. Please try again."
      : "",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoginSucceeded(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("invalid login credentials")) {
          throw new Error("Email or password is incorrect.");
        }
        if (signInError.message.toLowerCase().includes("email not confirmed")) {
          throw new Error("Please confirm your email address before signing in.");
        }
        throw signInError;
      }

      setLoginSucceeded(true);
      router.replace(nextPath);
      router.refresh();
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "We couldn't sign you in. Please try again.",
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
            htmlFor="email"
            className="block text-[13px] font-medium text-text"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-[13px] font-medium text-text"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              disabled={isSubmitting}
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
        </div>

        <ActionButton
          type="submit"
          data-primary-action
          status={
            isSubmitting
              ? "loading"
              : loginSucceeded
                ? "success"
                : error
                  ? "error"
                  : "idle"
          }
          disabled={isSubmitting}
          className="h-12 w-full active:scale-[0.985]"
        >
          {isSubmitting
            ? "Signing in..."
            : loginSucceeded
              ? "Signed in"
              : error
                ? "Try again"
                : "Sign in"}
        </ActionButton>
      </form>

      <p className="mt-5 text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="rounded-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Sign up
        </Link>
      </p>

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
