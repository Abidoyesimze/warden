import { Sparkles } from "lucide-react";

export function ReasoningSummary({ summary }: { summary: string }) {
  return (
    <div>
      <p className="text-[13px] leading-relaxed text-fg/90">{summary}</p>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
        <Sparkles className="size-3" strokeWidth={1.5} />
        Generated from the rule results above. The AI explains the decision; it does not make it.
      </p>
    </div>
  );
}
