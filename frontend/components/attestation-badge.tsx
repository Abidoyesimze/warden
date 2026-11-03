import { ShieldCheck, ShieldQuestion } from "lucide-react";
import type { Attestation } from "@/lib/api/types";
import { cn } from "@/lib/format";

export function AttestationBadge({ attestation, href = "#attestation" }: { attestation: Attestation; href?: string }) {
  const ok = attestation.verified;
  return (
    <a
      href={href}
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-pill px-2 text-[12px] font-medium transition-colors",
        ok
          ? "bg-mint/10 text-mint [box-shadow:inset_0_0_0_1px_rgb(0_229_160/0.28)] hover:bg-mint/15"
          : "bg-surface-2 text-muted hairline hover:text-fg",
      )}
    >
      {ok ? <ShieldCheck className="size-3.5" strokeWidth={1.5} /> : <ShieldQuestion className="size-3.5" strokeWidth={1.5} />}
      {ok ? "Private inference verified" : "Attestation not checked"}
    </a>
  );
}
