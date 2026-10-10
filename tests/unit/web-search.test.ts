import { afterEach, describe, expect, it, vi } from "vitest";
import { searchGlobalWeb } from "../../src/lib/ask/web-search";

describe("Tavily usage reporting", () => {
  const originalApiKey = process.env.TAVILY_API_KEY;
  const originalCost = process.env.TAVILY_COST_PER_CREDIT_USD;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = originalApiKey;
    if (originalCost === undefined) {
      delete process.env.TAVILY_COST_PER_CREDIT_USD;
    } else {
      process.env.TAVILY_COST_PER_CREDIT_USD = originalCost;
    }
    globalThis.fetch = originalFetch;
  });

  it("records Tavily's reported credit usage and estimates its cost", async () => {
    process.env.TAVILY_API_KEY = "server-only-test-key";
    process.env.TAVILY_COST_PER_CREDIT_USD = "0.01";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              title: "Example",
              url: "https://example.com/article",
              content: "Example search result",
            },
          ],
          usage: { credits: 2 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    globalThis.fetch = fetchMock;

    await expect(searchGlobalWeb(" example query ")).resolves.toMatchObject({
      query: "example query",
      providerCredits: 2,
      estimatedCostUsd: 0.02,
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      search_depth: "basic",
      include_usage: true,
    });
  });

  it("falls back to documented Basic Search credit usage when usage is omitted", async () => {
    process.env.TAVILY_API_KEY = "server-only-test-key";
    delete process.env.TAVILY_COST_PER_CREDIT_USD;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ results: [], usage: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(searchGlobalWeb("example query")).resolves.toMatchObject({
      providerCredits: 1,
      estimatedCostUsd: null,
    });
  });
});
