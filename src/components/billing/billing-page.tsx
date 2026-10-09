"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, Sparkles } from "lucide-react";
import type { BillingPlan } from "../../lib/billing/plans";

type BillingData = {
  subscription: {
    plan: BillingPlan;
    status: string | null;
    currentPeriodEnd: string | null;
    stripeCustomerId: string | null;
  };
  credits: {
    limit: number;
    reserved: number;
    used: number;
    available: number;
    periodStart: string;
    periodEnd: string;
  };
  plans: {
    free: boolean;
    pro: boolean;
    power: boolean;
  };
};

function isBillingData(value: unknown): value is BillingData {
  if (typeof value !== "object" || value === null) return false;
  return (
    "subscription" in value &&
    typeof value.subscription === "object" &&
    value.subscription !== null &&
    "credits" in value &&
    typeof value.credits === "object" &&
    value.credits !== null &&
    "plans" in value &&
    typeof value.plans === "object" &&
    value.plans !== null
  );
}

async function responseError(response: Response) {
  const payload: unknown = await response.json();
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  )
    ? payload.error
    : "Please try again in a moment.";
}

async function fetchBillingData() {
  const response = await fetch("/api/billing", { cache: "no-store" });
  if (!response.ok) throw new Error(await responseError(response));
  const payload: unknown = await response.json();
  if (!isBillingData(payload)) {
    throw new Error("Billing details returned an invalid response.");
  }
  return payload;
}

export function BillingPage({ checkoutState }: { checkoutState?: string }) {
  const [data, setData] = useState<BillingData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingAction, setPendingAction] = useState<"pro" | "power" | "portal" | null>(
    null,
  );
  const notice =
    checkoutState === "success"
      ? "Checkout completed. Your plan updates when Stripe confirms the subscription."
      : checkoutState === "cancelled"
        ? "Checkout was cancelled. Your plan has not changed."
        : "";

  const loadBilling = useCallback(async () => {
    setData(await fetchBillingData());
    setLoadError("");
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetchBillingData()
        .then((payload) => {
          if (!active) return;
          setData(payload);
          setLoadError("");
        })
        .catch((error: unknown) => {
          if (!active) return;
          setLoadError(
            error instanceof Error ? error.message : "Billing details could not be loaded.",
          );
        });
    };
    refresh();
    const timeout =
      checkoutState === "success" ? window.setTimeout(refresh, 2_000) : null;
    return () => {
      active = false;
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, [checkoutState]);

  async function runAction(action: "pro" | "power" | "portal") {
    if (pendingAction) return;
    setPendingAction(action);
    setActionError("");
    try {
      const response = await fetch(
        action === "portal" ? "/api/billing/portal" : "/api/billing/checkout",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(action === "portal"
              ? {}
              : { "idempotency-key": crypto.randomUUID() }),
          },
          ...(action === "portal"
            ? {}
            : { body: JSON.stringify({ plan: action }) }),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const payload: unknown = await response.json();
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("url" in payload) ||
        typeof payload.url !== "string"
      ) {
        throw new Error("The billing service returned an invalid redirect.");
      }
      window.location.assign(payload.url);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "The billing action failed.",
      );
      setPendingAction(null);
    }
  }

  const percentage = data
    ? Math.min(100, Math.round((data.credits.used / Math.max(1, data.credits.limit)) * 100))
    : 0;

  return (
    <main className="min-h-svh bg-background px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/app"
          className="inline-flex min-h-9 items-center gap-2 rounded-full px-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Dashboard
        </Link>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Your account
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-text sm:text-4xl">
            Plan &amp; billing
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Your library stays yours. A plan expands how much intelligence you can use.
          </p>
        </div>

        {notice && (
          <p role="status" className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-text">
            {notice}
          </p>
        )}
        {(loadError || actionError) && (
          <p role="alert" className="mt-5 rounded-2xl border border-error/30 bg-error/5 p-4 text-sm text-text">
            {loadError || actionError}
          </p>
        )}

        {!data && !loadError ? (
          <div className="mt-8 rounded-3xl border border-border/60 bg-surface-elevated p-6 text-sm text-text-muted">
            Loading your billing details…
          </div>
        ) : data ? (
          <>
            <section className="mt-8 rounded-3xl border border-border/70 bg-surface-elevated p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-text-muted">Current plan</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
                    {data.subscription.plan === "team"
                      ? "Team"
                      : data.subscription.plan[0].toUpperCase() +
                        data.subscription.plan.slice(1)}
                  </h2>
                  {data.subscription.currentPeriodEnd && (
                    <p className="mt-1 text-xs text-text-muted">
                      Current period ends{" "}
                      {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {data.subscription.stripeCustomerId && (
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={() => runAction("portal")}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background disabled:cursor-wait disabled:opacity-60"
                  >
                    <ExternalLink aria-hidden="true" className="size-4" />
                    {pendingAction === "portal" ? "Opening…" : "Manage subscription"}
                  </button>
                )}
              </div>

              <div className="mt-7 rounded-2xl bg-background/75 p-4 sm:p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-text">
                      <Sparkles aria-hidden="true" className="size-4 text-primary" />
                      Monthly AI credits
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {data.credits.available.toLocaleString()} available of{" "}
                      {data.credits.limit.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs tabular-nums text-text-muted">
                    {data.credits.used.toLocaleString()} used
                  </p>
                </div>
                <div
                  role="progressbar"
                  aria-label="Monthly AI credits used"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-4 h-2 overflow-hidden rounded-full bg-border/60"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="mt-3 text-[11px] text-text-muted">
                  Resets {new Date(data.credits.periodEnd).toLocaleDateString()} · reserved{" "}
                  {data.credits.reserved.toLocaleString()}
                </p>
              </div>
            </section>

            <section className="mt-8">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-text">
                  Choose the right level
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  Prices are shown securely by Stripe at checkout.
                </p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <PlanCard
                  title="Free"
                  credits="500 credits / month"
                  description="Your personal library, browser extension, imports, and essential organization."
                  features={["Bookmarks & collections", "Basic and semantic search", "AI organization"]}
                  current={data.subscription.plan === "free"}
                />
                <PlanCard
                  title="Pro"
                  credits="2,000 credits / month"
                  description="Advanced intelligence for research, learning, and finding connections."
                  features={["Ask Your Library", "Research & Learning modes", "Archive & advanced tools"]}
                  current={data.subscription.plan === "pro"}
                  actionLabel={
                    data.subscription.plan === "free" ? "Continue with Pro" : "Change plan"
                  }
                  disabled={!data.plans.pro || pendingAction !== null}
                  pending={pendingAction === "pro"}
                  onAction={() => runAction("pro")}
                />
                <PlanCard
                  title="Power"
                  credits="10,000 credits / month"
                  description="A future tier for intensive use and advanced workflows."
                  features={["Higher AI allowance", "Advanced automation", "API access"]}
                  current={data.subscription.plan === "power"}
                  actionLabel="Coming later"
                  disabled
                />
              </div>
              <p className="mt-4 text-[11px] leading-5 text-text-muted">
                Credit amounts and per-action costs are provisional and will be tuned using
                actual usage and provider costs. Power capabilities are planned; unavailable
                features remain disabled until they are released.
              </p>
            </section>
          </>
        ) : (
          <button
            type="button"
            onClick={() =>
              loadBilling().catch((error: unknown) =>
                setLoadError(
                  error instanceof Error ? error.message : "Billing details could not be loaded.",
                ),
              )
            }
            className="mt-5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Retry
          </button>
        )}
      </div>
    </main>
  );
}

function PlanCard({
  title,
  credits,
  description,
  features,
  current = false,
  actionLabel,
  disabled = false,
  pending = false,
  onAction,
}: {
  title: string;
  credits: string;
  description: string;
  features: string[];
  current?: boolean;
  actionLabel?: string;
  disabled?: boolean;
  pending?: boolean;
  onAction?: () => void;
}) {
  return (
    <article
      className={`flex flex-col rounded-3xl border bg-surface-elevated p-5 ${
        current ? "border-primary/50 shadow-md" : "border-border/70 shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        {current && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
            Current plan
          </span>
        )}
      </div>
      <p className="mt-1 text-xs font-medium text-primary">{credits}</p>
      <p className="mt-3 min-h-12 text-xs leading-5 text-text-muted">{description}</p>
      <ul className="mt-4 flex-1 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs text-text">
            <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-success" />
            {feature}
          </li>
        ))}
      </ul>
      {actionLabel && (
        <button
          type="button"
          disabled={disabled || current || !onAction}
          onClick={onAction}
          className="mt-5 min-h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-border disabled:text-text-muted"
        >
          {pending ? "Starting checkout…" : current ? "Current plan" : actionLabel}
        </button>
      )}
    </article>
  );
}
