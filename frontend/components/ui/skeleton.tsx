import { cn } from "@/lib/format";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton h-4", className)} />;
}

/** Thin indeterminate line shown at the top of a loading view (no centred spinners). */
export function ProgressLine({ active = true }: { active?: boolean }) {
  if (!active) return null;
  return (
    <div role="progressbar" aria-label="Loading" className="progress-line relative h-px w-full overflow-hidden bg-line" />
  );
}
