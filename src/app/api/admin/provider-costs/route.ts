import { NextResponse } from "next/server";
import {
  fetchOllamaCloudUsageSummary,
  type OllamaCloudUsageSummary,
} from "../../../../lib/ai/ollama-cloud-usage";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";

type ProviderUsageSummaryRow = {
  provider: string;
  action_type: string;
  request_count: number | string;
  input_tokens: number | string;
  output_tokens: number | string;
  provider_credits: number | string;
  priced_request_count: number | string;
  estimated_cost_usd: number | string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: "Authentication could not be verified." },
        { status: 503 },
      );
    }
    if (!user) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const adminUserIds = new Set(
      (process.env.BILLING_ADMIN_USER_IDS ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    );
    if (adminUserIds.size === 0) {
      return NextResponse.json(
        { error: "Provider cost reporting is not configured." },
        { status: 503 },
      );
    }
    if (!adminUserIds.has(user.id)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const now = new Date();
    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("provider_usage_summary", {
      p_period_start: periodStart.toISOString(),
      p_period_end: periodEnd.toISOString(),
    });
    if (error) throw error;

    const summary = ((data ?? []) as ProviderUsageSummaryRow[]).map((row) => ({
      provider: row.provider,
      actionType: row.action_type,
      requests: Number(row.request_count),
      inputTokens: Number(row.input_tokens),
      outputTokens: Number(row.output_tokens),
      providerCredits: Number(row.provider_credits),
      pricedRequests: Number(row.priced_request_count),
      estimatedCostUsd:
        row.estimated_cost_usd === null
          ? null
          : Number(row.estimated_cost_usd),
    }));
    const estimatedCostUsd = summary.reduce(
      (total, row) => total + (row.estimatedCostUsd ?? 0),
      0,
    );
    const unpricedRequests = summary.reduce(
      (total, row) => total + row.requests - row.pricedRequests,
      0,
    );

    let ollamaCloudUsage:
      | { status: "not_configured" }
      | {
          status: "available";
          summary: OllamaCloudUsageSummary;
        }
      | { status: "unavailable" } = { status: "not_configured" };
    try {
      const ollamaSummary = await fetchOllamaCloudUsageSummary();
      if (ollamaSummary) {
        ollamaCloudUsage = { status: "available", summary: ollamaSummary };
      }
    } catch (error) {
      console.error("Ollama Cloud usage summary failed.", error);
      ollamaCloudUsage = { status: "unavailable" };
    }

    return NextResponse.json(
      {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
        unpricedRequests,
        providers: summary,
        ollamaCloudUsage,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Provider cost summary failed.", error);
    return NextResponse.json(
      { error: "Provider cost summary could not be loaded." },
      { status: 500 },
    );
  }
}
