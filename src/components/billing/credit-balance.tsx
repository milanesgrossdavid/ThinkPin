"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

type CreditBalanceData = {
  credits: {
    available: number;
    limit: number;
  };
};

function isCreditBalanceData(value: unknown): value is CreditBalanceData {
  if (typeof value !== "object" || value === null || !("credits" in value)) {
    return false;
  }
  const credits = value.credits;
  return (
    typeof credits === "object" &&
    credits !== null &&
    "available" in credits &&
    typeof credits.available === "number" &&
    "limit" in credits &&
    typeof credits.limit === "number"
  );
}

async function loadCreditBalance(): Promise<CreditBalanceData> {
  const response = await fetch("/api/billing", { cache: "no-store" });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Credit balance could not be loaded.";
    throw new Error(message);
  }
  if (!isCreditBalanceData(payload)) {
    throw new Error("Credit balance returned an invalid response.");
  }
  return payload;
}

export function CreditBalance({ className = "" }: { className?: string }) {
  const [balance, setBalance] = useState<CreditBalanceData["credits"] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = () => {
      loadCreditBalance()
        .then(({ credits }) => {
          if (!active) return;
          setBalance(credits);
          setLoadError("");
        })
        .catch((error: unknown) => {
          if (!active) return;
          setLoadError(
            error instanceof Error
              ? error.message
              : "Credit balance could not be loaded.",
          );
        });
    };

    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const remainingPercentage =
    balance && balance.limit > 0
      ? Math.min(100, Math.round((balance.available / balance.limit) * 100))
      : 0;

  return (
    <Link
      href="/app/billing"
      aria-label={
        balance
          ? `${balance.available.toLocaleString()} of ${balance.limit.toLocaleString()} AI credits remaining. View plan and billing.`
          : "View plan and billing"
      }
      title={
        balance
          ? `${balance.available.toLocaleString()} of ${balance.limit.toLocaleString()} AI credits remaining`
          : "AI credits"
      }
      className={`inline-flex h-6 shrink-0 items-center gap-2 rounded-full border border-border/70 bg-surface-elevated px-2 text-xs transition-colors hover:border-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    >
      
      {balance ? (
        <span className="font-semibold tabular-nums text-text">
          {balance.available.toLocaleString()}
        </span>
      ) : (
        <span className="text-text-muted">{loadError ? "Unavailable" : "Loading…"}</span>
      )}
      <Sparkles aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
    </Link>
  );
}
