import { NextResponse } from "next/server";
import { createClient } from "../supabase/server";
import { isSupabaseAuthUnavailable } from "../supabase/auth-errors";

export async function authenticatedBillingClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (isSupabaseAuthUnavailable(error)) {
    return { supabase, user: null, unavailable: true };
  }
  if (error && error.name !== "AuthSessionMissingError" && error.status !== 401) {
    throw error;
  }
  return { supabase, user, unavailable: false };
}

export function billingErrorResponse(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "SupabaseAuthUnavailableError"
  ) {
    return NextResponse.json(
      { error: "Authentication is temporarily unavailable." },
      { status: 503 },
    );
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
