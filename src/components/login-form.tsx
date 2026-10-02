"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide";
import { MorphIcon } from "morphicons/react";
import { AuthProviderButton } from "./auth-provider-button";

export function LoginForm() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Account sign-in is not connected yet.");
  }

  return (
    <>
      <AuthProviderButton
        onUnavailable={() =>
          setMessage("Google sign-in will be available soon.")
        }
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
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="block text-[13px] font-medium text-text"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() =>
                setMessage("Password reset will be available soon.")
              }
              className="rounded-sm text-xs font-medium text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
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

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Sign in
        </button>
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

      {message && (
        <p
          className="mt-4 rounded-xl bg-background px-3 py-2 text-center text-xs leading-5 text-text-muted"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </>
  );
}
