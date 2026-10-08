export class SupabaseAuthUnavailableError extends Error {
  constructor() {
    super("Supabase authentication is temporarily unavailable.");
    this.name = "SupabaseAuthUnavailableError";
  }
}

export function isSupabaseAuthUnavailable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "AuthRetryableFetchError" ||
      error.name === "SupabaseAuthUnavailableError")
  );
}

export function throwIfSupabaseAuthUnavailable(error: unknown): void {
  if (isSupabaseAuthUnavailable(error)) {
    throw new SupabaseAuthUnavailableError();
  }
}
