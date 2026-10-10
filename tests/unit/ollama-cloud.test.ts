import { afterEach, describe, expect, it, vi } from "vitest";
import {
  estimateOllamaCostUsd,
  getOllamaRequestConfig,
} from "../../src/lib/ai/providers/ollama-url";
import { fetchOllamaCloudUsageSummary } from "../../src/lib/ai/ollama-cloud-usage";

describe("Ollama request configuration", () => {
  const keys = [
    "OLLAMA_BASE_URL",
    "OLLAMA_API_KEY",
    "OLLAMA_INPUT_USD_PER_MILLION_TOKENS",
    "OLLAMA_OUTPUT_USD_PER_MILLION_TOKENS",
  ] as const;
  const original = new Map(keys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    for (const key of keys) {
      const value = original.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    globalThis.fetch = originalFetch;
  });

  it("uses bearer authentication only for the official Ollama Cloud endpoint", () => {
    process.env.OLLAMA_BASE_URL = "https://ollama.com";
    process.env.OLLAMA_API_KEY = "server-only-test-key";

    expect(getOllamaRequestConfig()).toMatchObject({
      baseUrl: "https://ollama.com",
      cloud: true,
      headers: {
        authorization: "Bearer server-only-test-key",
      },
    });
  });

  it("does not send the cloud API key to local Ollama", () => {
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    process.env.OLLAMA_API_KEY = "server-only-test-key";

    expect(getOllamaRequestConfig()).toMatchObject({
      cloud: false,
      headers: { "content-type": "application/json" },
    });
    expect(getOllamaRequestConfig().headers).not.toHaveProperty("authorization");
  });

  it("requires a key for cloud and rejects arbitrary remote hosts", () => {
    process.env.OLLAMA_BASE_URL = "https://ollama.com";
    delete process.env.OLLAMA_API_KEY;
    expect(() => getOllamaRequestConfig()).toThrow(/OLLAMA_API_KEY/);

    process.env.OLLAMA_BASE_URL = "https://ollama.example.test";
    expect(() => getOllamaRequestConfig()).toThrow(/official/);
  });

  it("estimates cloud model token cost only when both rates are configured", () => {
    process.env.OLLAMA_BASE_URL = "https://ollama.com";
    process.env.OLLAMA_API_KEY = "server-only-test-key";
    process.env.OLLAMA_INPUT_USD_PER_MILLION_TOKENS = "1";
    process.env.OLLAMA_OUTPUT_USD_PER_MILLION_TOKENS = "2";
    const config = getOllamaRequestConfig();

    expect(estimateOllamaCostUsd(config, 1_000_000, 500_000)).toBe(2);
    delete process.env.OLLAMA_OUTPUT_USD_PER_MILLION_TOKENS;
    expect(
      estimateOllamaCostUsd(getOllamaRequestConfig(), 1_000_000, 500_000),
    ).toBeNull();
  });

  it("fetches authoritative Ollama Cloud usage with the server API key", async () => {
    process.env.OLLAMA_BASE_URL = "https://ollama.com";
    process.env.OLLAMA_API_KEY = "server-only-test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          range: "30d",
          from: "2026-10-01T00:00:00Z",
          until: "2026-10-31T00:00:00Z",
          totals: {
            request_count: 12,
            usage_usd: 1.234,
            input_tokens: 20_000,
            cached_input_tokens: 2_000,
            output_tokens: 3_000,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    globalThis.fetch = fetchMock;

    await expect(fetchOllamaCloudUsageSummary()).resolves.toEqual({
      range: "30d",
      from: "2026-10-01T00:00:00Z",
      until: "2026-10-31T00:00:00Z",
      totals: {
        requestCount: 12,
        usageUsd: 1.234,
        inputTokens: 20_000,
        cachedInputTokens: 2_000,
        outputTokens: 3_000,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ollama.com/api/usage?range=30d",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer server-only-test-key",
        }),
      }),
    );
  });

  it("does not call the Cloud usage API while using local Ollama", async () => {
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(fetchOllamaCloudUsageSummary()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
