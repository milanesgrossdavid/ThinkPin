function requiredPublicEnv(
  name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  value: string | undefined,
) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and add your Supabase project value.`,
    );
  }
  return normalizedValue;
}

export function getSupabasePublicConfig() {
  const url = requiredPublicEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const publishableKey = requiredPublicEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }
  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.hostname !== "localhost" &&
    parsedUrl.hostname !== "127.0.0.1"
  ) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS.");
  }

  return { url, publishableKey };
}
