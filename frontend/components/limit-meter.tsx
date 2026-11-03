import { cn, formatAmount, ratio } from "@/lib/format";

export function LimitMeter({
  label,
  used,
  limit,
  hint,
}: {
  label: string;
  used?: string;
  limit: string;
  hint: string;
}) {
  const r = used ? Math.min(1, ratio(used, limit)) : null;
  const tone = r === null ? "" : r >= 0.9 ? "bg-coral" : r >= 0.7 ? "bg-amber" : "bg-fg";
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label">{label}</span>
        <span className="num text-[12px] text-muted">
          {used !== undefined && <span className="text-fg">{formatAmount(used)}</span>}
          {used !== undefined && " / "}
          {used === undefined && <span className="text-fg">{formatAmount(limit)}</span>}
          {used !== undefined && formatAmount(limit)}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-[1px] bg-surface-3">
        {r !== null ? (
          <div className={cn("h-full transition-[width] duration-300 ease-out", tone)} style={{ width: `${Math.max(r * 100, 1)}%` }} />
        ) : (
          <div className="h-full w-full [background:repeating-linear-gradient(90deg,var(--border-strong)_0_2px,transparent_2px_6px)]" />
        )}
      </div>
      <p className="mt-1.5 text-[12px] text-muted">{hint}</p>
    </div>
  );
}
