import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "../../../../lib/supabase/env";

export async function GET() {
  try {
    const config = getSupabasePublicConfig();
    return NextResponse.json(
      {
        supabaseUrl: config.url,
        supabasePublishableKey: config.publishableKey,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Browser extension configuration is unavailable.", error);
    return NextResponse.json(
      { error: "Browser extension configuration is unavailable." },
      { status: 503 },
    );
  }
}
