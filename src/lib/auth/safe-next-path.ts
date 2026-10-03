export function safeNextPath(value: string | null, fallback = "/app") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }

  try {
    const destination = new URL(value, "https://thinkpin.invalid");
    return destination.origin === "https://thinkpin.invalid"
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
