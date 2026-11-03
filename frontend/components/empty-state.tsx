import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-start gap-2 px-4 py-10 sm:items-center sm:text-center">
      <p className="text-[13px] font-medium text-fg">{title}</p>
      {body && <p className="max-w-sm text-[13px] text-muted">{body}</p>}
      {action && (
        <Button asChild size="sm" variant="secondary" className="mt-2">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

/** Says what failed and what to do. Never a raw error dump. */
export function ErrorState({
  message,
  action,
  onRetry,
  children,
}: {
  message: string;
  action?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-card border border-coral/30 bg-coral/[0.06] px-4 py-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-coral" strokeWidth={1.5} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-fg">{message}</p>
        {action && <p className="mt-0.5 text-[13px] text-muted">{action}</p>}
        {children}
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
