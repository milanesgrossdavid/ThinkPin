import { AlertCircle, RotateCw } from "lucide-react";

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border border-error/30 bg-error/5 p-5 text-error"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-text-muted">{description}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-error/30 px-3 text-xs font-medium text-error transition-colors hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
          >
            <RotateCw aria-hidden="true" className="size-3.5" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
