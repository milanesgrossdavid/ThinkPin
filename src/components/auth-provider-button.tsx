"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";

type AuthProviderButtonProps = {
  onError: (message: string) => void;
  nextPath?: string;
};

export function AuthProviderButton({
  onError,
  nextPath = "/app",
}: AuthProviderButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    onError("");

    try {
      const supabase = createClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl.toString() },
      });

      if (error) {
        throw error;
      }
      if (!data.url) {
        throw new Error("Google sign-in did not return an authorization URL.");
      }

      window.location.assign(data.url);
    } catch (authError) {
      onError(
        authError instanceof Error
          ? authError.message
          : "We couldn't start Google sign-in. Please try again.",
      );
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
      className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-surface-elevated px-4 text-sm font-medium text-text transition-colors hover:bg-surface active:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-[18px]">
        <path
          fill="#4285F4"
          d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.38a4.6 4.6 0 0 1-2 3.02v2.47h3.24c1.9-1.75 2.98-4.33 2.98-7.28Z"
        />
        <path
          fill="#34A853"
          d="M10 20c2.7 0 4.96-.9 6.62-2.49l-3.24-2.47c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.13H1.06v2.55A10 10 0 0 0 10 20Z"
        />
        <path
          fill="#FBBC05"
          d="M4.41 11.87a6 6 0 0 1 0-3.74V5.58H1.06a10 10 0 0 0 0 8.84l3.35-2.55Z"
        />
        <path
          fill="#EA4335"
          d="M10 3.97c1.47 0 2.8.5 3.84 1.52l2.88-2.88A9.64 9.64 0 0 0 10 0a10 10 0 0 0-8.94 5.58l3.35 2.55C5.2 5.73 7.4 3.97 10 3.97Z"
        />
      </svg>
      {isLoading ? "Connecting to Google..." : "Continue with Google"}
    </button>
  );
}
