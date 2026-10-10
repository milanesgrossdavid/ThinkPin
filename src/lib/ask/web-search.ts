import { getTavilyCostPerCreditUsd } from "../ai/usage";

export type GlobalSearchResult = {
  title: string;
  url: string;
  domain: string;
  description: string;
};

export class GlobalSearchUnavailableError extends Error {}
export class InvalidGlobalSearchQueryError extends Error {}
export class GlobalSearchProviderError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseResult(value: unknown): GlobalSearchResult | null {
  if (!isRecord(value)) return null;

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description =
    typeof value.content === "string" ? value.content.trim() : "";
  if (typeof value.url !== "string" || !title || !description) return null;

  try {
    const url = new URL(value.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return {
      title,
      url: url.toString(),
      domain: url.hostname.replace(/^www\./, ""),
      description,
    };
  } catch {
    return null;
  }
}

export async function searchGlobalWeb(
  queryInput: unknown,
): Promise<{
  query: string;
  results: GlobalSearchResult[];
  providerCredits: number;
  estimatedCostUsd: number | null;
}> {
  if (typeof queryInput !== "string") {
    throw new InvalidGlobalSearchQueryError("Enter a web search query.");
  }
  const query = queryInput.trim().replace(/\s+/g, " ");
  if (!query || query.length > 400) {
    throw new InvalidGlobalSearchQueryError(
      "Your web search must be between 1 and 400 characters.",
    );
  }

  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new GlobalSearchUnavailableError(
      "Global search is not configured. Add TAVILY_API_KEY on the server and restart the app.",
    );
  }

  const estimatedCostUsd = getTavilyCostPerCreditUsd();
  let response: Response;
  try {
    response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 8,
        include_answer: false,
        include_raw_content: false,
        include_usage: true,
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Global web search provider request failed.", error);
    throw new GlobalSearchProviderError(
      "Global search could not reach its search provider. Please try again.",
    );
  }

  if (!response.ok) {
    console.error("Global web search provider returned an error.", {
      status: response.status,
    });
    throw new GlobalSearchProviderError(
      response.status === 429
        ? "The free global search quota is temporarily exhausted. Try again later."
        : "Global search provider could not complete the request.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    console.error("Global web search provider returned invalid JSON.", error);
    throw new GlobalSearchProviderError(
      "Global search returned an invalid response. Please try again.",
    );
  }
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new GlobalSearchProviderError(
      "Global search returned an invalid response. Please try again.",
    );
  }

  const usage = isRecord(payload.usage) ? payload.usage : null;
  const reportedCredits = usage?.credits;
  const providerCredits =
    typeof reportedCredits === "number" &&
    Number.isSafeInteger(reportedCredits) &&
    reportedCredits >= 0
      ? reportedCredits
      : 1;
  if (reportedCredits === undefined) {
    console.warn(
      "Tavily did not return usage credits; recording the documented one-credit Basic Search cost.",
    );
  } else if (providerCredits !== reportedCredits) {
    console.error("Tavily returned an invalid usage credit count.");
  }

  return {
    query,
    results: payload.results
      .map(parseResult)
      .filter((result): result is GlobalSearchResult => result !== null),
    providerCredits,
    estimatedCostUsd:
      estimatedCostUsd === null
        ? null
        : Number((estimatedCostUsd * providerCredits).toFixed(6)),
  };
}
