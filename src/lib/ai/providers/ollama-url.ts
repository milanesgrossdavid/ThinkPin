import { AIProviderUnavailableError } from "../types";

export function getOllamaBaseUrl() {
  const value = process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AIProviderUnavailableError("OLLAMA_BASE_URL must be a valid URL.");
  }

  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new AIProviderUnavailableError(
      "Ollama must use a local HTTP URL to keep bookmark content on this device.",
    );
  }

  return url.toString().replace(/\/$/, "");
}
