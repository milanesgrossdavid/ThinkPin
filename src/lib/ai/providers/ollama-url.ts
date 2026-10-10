import { AIProviderUnavailableError } from "../types";

export type OllamaRequestConfig = {
  baseUrl: string;
  headers: Record<string, string>;
  cloud: boolean;
  inputUsdPerMillionTokens: number | null;
  outputUsdPerMillionTokens: number | null;
};

function readOptionalRate(name: string): number | null {
  const value = process.env[name]?.trim();
  if (!value) return null;

  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0) {
    throw new AIProviderUnavailableError(
      `${name} must be a non-negative USD amount.`,
    );
  }
  return rate;
}

export function getOllamaRequestConfig(): OllamaRequestConfig {
  const value = process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AIProviderUnavailableError("OLLAMA_BASE_URL must be a valid URL.");
  }

  const isLocal =
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const isOfficialCloud =
    url.protocol === "https:" &&
    url.hostname === "ollama.com" &&
    (url.port === "" || url.port === "443") &&
    url.pathname === "/" &&
    !url.search &&
    !url.hash &&
    !url.username &&
    !url.password;

  if (!isLocal && !isOfficialCloud) {
    throw new AIProviderUnavailableError(
      "OLLAMA_BASE_URL must be a local Ollama URL or the official https://ollama.com cloud API.",
    );
  }

  const apiKey = process.env.OLLAMA_API_KEY?.trim();
  if (isOfficialCloud && !apiKey) {
    throw new AIProviderUnavailableError(
      "OLLAMA_API_KEY is required when using Ollama Cloud.",
    );
  }

  return {
    baseUrl: url.toString().replace(/\/$/, ""),
    headers: {
      "content-type": "application/json",
      ...(isOfficialCloud && apiKey
        ? { authorization: `Bearer ${apiKey}` }
        : {}),
    },
    cloud: isOfficialCloud,
    inputUsdPerMillionTokens: readOptionalRate(
      "OLLAMA_INPUT_USD_PER_MILLION_TOKENS",
    ),
    outputUsdPerMillionTokens: readOptionalRate(
      "OLLAMA_OUTPUT_USD_PER_MILLION_TOKENS",
    ),
  };
}

export function estimateOllamaCostUsd(
  config: OllamaRequestConfig,
  inputTokens: number,
  outputTokens: number,
): number | null {
  if (
    !config.cloud ||
    config.inputUsdPerMillionTokens === null ||
    config.outputUsdPerMillionTokens === null
  ) {
    return null;
  }

  return Number(
    (
      (inputTokens * config.inputUsdPerMillionTokens +
        outputTokens * config.outputUsdPerMillionTokens) /
      1_000_000
    ).toFixed(6),
  );
}
