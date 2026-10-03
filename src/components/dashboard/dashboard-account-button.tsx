"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export function DashboardAccountButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    setIsSigningOut(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("We couldn't sign you out. Please try again.");
      setIsSigningOut(false);
    }
  }

  const className =
    "flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-xs font-semibold text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 lg:size-11 lg:text-sm";

  return (
    <>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        aria-label={isSigningOut ? "Signing out" : "Sign out"}
        title={isSigningOut ? "Signing out..." : "Sign out"}
        className={`${className} lg:hidden`}
      >
        {isSigningOut ? "…" : "D"}
      </button>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        aria-label={isSigningOut ? "Signing out" : "Sign out"}
        title={isSigningOut ? "Signing out..." : "Sign out"}
        className={`${className} hidden lg:flex`}
      >
        {isSigningOut ? "…" : "D"}
      </button>
      {error && (
        <p className="basis-full text-right text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
