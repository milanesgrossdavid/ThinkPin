import {
  AlertCircle,
  Check,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ActionButtonStatus = "idle" | "loading" | "success" | "error";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  status?: ActionButtonStatus;
  variant?: "primary" | "danger" | "secondary";
  statusIcon?: LucideIcon;
};

const variantClasses = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
  danger:
    "bg-error text-white hover:bg-error/90 active:bg-error/80",
  secondary:
    "border border-border bg-surface-elevated text-text hover:bg-background active:bg-surface",
};

export function ActionButton({
  children,
  status = "idle",
  variant = "primary",
  statusIcon: StatusIcon,
  className = "",
  disabled,
  ...props
}: ActionButtonProps) {
  const isDisabled = disabled || status === "loading" || status === "success";

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={status === "loading" || undefined}
      aria-live="polite"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${
        status === "success"
          ? "bg-success text-white"
          : status === "error"
            ? "bg-error text-white hover:bg-error/90 active:bg-error/80 focus-visible:outline-error"
            : variantClasses[variant]
      } ${className}`}
    >
      {status === "loading" ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : status === "success" ? (
        <Check aria-hidden="true" className="size-4" />
      ) : status === "error" ? (
        StatusIcon ? (
          <StatusIcon aria-hidden="true" className="size-4" />
        ) : (
          <AlertCircle aria-hidden="true" className="size-4" />
        )
      ) : null}
      {children}
    </button>
  );
}
