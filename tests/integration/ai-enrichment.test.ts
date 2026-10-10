import { afterEach, describe, expect, it, vi } from "vitest";
import { ollamaTextProvider } from "../../src/lib/ai/providers/ollama-text";

describe("AI bookmark enrichment integration", () => {
  const originalModel = process.env.OLLAMA_TEXT_MODEL;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalModel === undefined) {
      delete process.env.OLLAMA_TEXT_MODEL;
    } else {
      process.env.OLLAMA_TEXT_MODEL = originalModel;
    }
  });

  it("normalizes generated metadata and limits suggestions to existing collections", async () => {
    process.env.OLLAMA_TEXT_MODEL = "test-model";
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        message: {
          content: JSON.stringify({
            title: "  Useful systems  ",
            description: " A concise description. ",
            savedReason: " Keep as a reference. ",
            tags: ["#systems", " ", "knowledge"],
            contentType: "blog post",
            intent: "educational",
            suggestedCollection: "READING",
          }),
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await ollamaTextProvider.enrichBookmark({
      url: "https://example.com/systems",
      title: "Original title",
      description: "Description",
      content: "Article text",
      collections: ["Reading"],
    });

    expect(result).toEqual({
      title: "Useful systems",
      description: "A concise description.",
      savedReason: "Keep as a reference.",
      tags: ["systems", "knowledge"],
      suggestedCollection: "Reading",
      contentType: "article",
      intent: "learn",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/chat"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
