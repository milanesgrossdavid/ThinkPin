import { describe, expect, it } from "vitest";
import { validateBookmarkUrl } from "../../src/lib/bookmarks/validate-url";
import {
  extractDomain,
  normalizeUrl,
} from "../../src/lib/ingestion/normalize-url";

describe("normalizeUrl", () => {
  it("removes tracking parameters and fragments without changing functional query parameters", () => {
    expect(
      normalizeUrl(
        "https://example.com/articles/?q=memory&utm_source=newsletter&FBCLID=123#intro",
      ),
    ).toBe("https://example.com/articles?q=memory");
  });

  it("preserves repeated functional query parameters and their order", () => {
    expect(
      normalizeUrl("https://example.com/?tag=one&tag=two&utm_campaign=spring"),
    ).toBe("https://example.com/?tag=one&tag=two");
  });

  it.each([
    "javascript:alert(1)",
    "file:///etc/passwd",
    "https://user:password@example.com/",
  ])("rejects unsafe URL %s", (url) => {
    expect(() => normalizeUrl(url)).toThrow(TypeError);
  });
});

describe("bookmark URL validation", () => {
  it("extracts the URL host as the bookmark domain", () => {
    expect(validateBookmarkUrl("https://www.example.com/path").domain).toBe(
      "www.example.com",
    );
  });

  describe("extractDomain", () => {
    it("returns the hostname without changing the existing www behavior", () => {
      expect(extractDomain("https://www.example.com/path")).toBe("www.example.com");
    });
  });

  it("rejects non-HTTP schemes and embedded credentials", () => {
    expect(() => validateBookmarkUrl("ftp://example.com/file")).toThrow();
    expect(() =>
      validateBookmarkUrl("https://user:password@example.com/"),
    ).toThrow();
  });
});
