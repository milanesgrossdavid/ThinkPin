import type { Instrumentation } from "next";
import { captureRequestError } from "@sentry/nextjs";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    return import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    return import("./sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = (...args) => {
  captureRequestError(...args);
};
