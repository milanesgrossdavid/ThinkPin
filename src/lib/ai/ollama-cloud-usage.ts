import { AIProviderUnavailableError } from "./types";
import { getOllamaRequestConfig } from "./providers/ollama-url";

export type OllamaCloudUsageSummary = {
  range: "30d";
  from: string;
  until: string;
  totals: {
    requestCount: number;
    usageUsd: number | null;
    inputTokens: number | null;
    cachedInputTokens: number | null;
    outputTokens: number | null;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AIProviderUnavailableError(
      "Ollama Cloud returned an invalid usage response.",
    );
  }
  return value as Record<string, unknown>;
}

function optionalNonNegativeNumber(
  value: unknown,
  field: string,
): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AIProviderUnavailableError(
      `Ollama Cloud returned an invalid ${field} usage value.`,
    );
  }
  return value;
}

export async function fetchOllamaCloudUsageSummary(): Promise<OllamaCloudUsageSummary | null> {
  const ollama = getOllamaRequestConfig();
  if (!ollama.cloud) return null;

  let response: Response;
  try {
    response = await fetch(`${ollama.baseUrl}/api/usage?range=30d`, {
      headers: ollama.headers,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new AIProviderUnavailableError(
      "Ollama Cloud usage could not be reached.",
    );
  }

  if (!response.ok) {
    throw new AIProviderUnavailableError(
      `Ollama Cloud usage returned HTTP ${response.status}.`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AIProviderUnavailableError(
      "Ollama Cloud returned invalid usage JSON.",
    );
  }

  const result = asRecord(payload);
  const totals = asRecord(result.totals);
  const requestCount = optionalNonNegativeNumber(
    totals.request_count,
    "request count",
  );
  if (
    result.range !== "30d" ||
    typeof result.from !== "string" ||
    typeof result.until !== "string" ||
    requestCount === null
  ) {
    throw new AIProviderUnavailableError(
      "Ollama Cloud returned an incomplete usage summary.",
    );
  }

  return {
    range: "30d",
    from: result.from,
    until: result.until,
    totals: {
      requestCount,
      usageUsd: optionalNonNegativeNumber(totals.usage_usd, "cost"),
      inputTokens: optionalNonNegativeNumber(
        totals.input_tokens,
        "input token",
      ),
      cachedInputTokens: optionalNonNegativeNumber(
        totals.cached_input_tokens,
        "cached input token",
      ),
      outputTokens: optionalNonNegativeNumber(
        totals.output_tokens,
        "output token",
      ),
    },
  };
}
