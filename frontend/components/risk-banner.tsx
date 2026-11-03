import { AlertTriangle, Ban, ShieldCheck } from "lucide-react";
import type { InvoiceDetail } from "@/lib/api/types";
import { cn } from "@/lib/format";
import { ownerStatus } from "@/lib/status";

/** One sentence at the top of the detail page stating the main reason for the decision. */
export function RiskBanner({ invoice }: { invoice: InvoiceDetail }) {
  const v = ownerStatus(invoice.payment.status, invoice.payment.flags);
  const firstFail = invoice.rules.find((r) => !r.passed && r.severity !== "INFO");
  const firstPolicy = invoice.policy.find((p) => !p.passed);

  if (v.key === "review") {
    const reason = firstFail?.reason ?? firstPolicy?.reason ?? "Held by the treasury contract.";
    return (
      <Banner tone="amber" icon={<AlertTriangle />} title="Waiting for your review. Nothing has been paid.">
        {reason}
      </Banner>
    );
  }
  if (v.key === "blocked") {
    return (
      <Banner tone="coral" icon={<Ban />} title="Blocked. No money moved.">
        {firstFail?.reason ?? "The treasury contract refused this payment."}
      </Banner>
    );
  }
  if (v.key === "rejected") {
    const ev = [...invoice.events].reverse().find((e) => e.name === "payment_rejected");
    return (
      <Banner tone="coral" icon={<Ban />} title="Rejected by you. No money moved.">
        {ev?.detail ?? "Rejected by the owner."}
      </Banner>
    );
  }
  if (v.key === "paid") {
    return (
      <Banner tone="mint" icon={<ShieldCheck />} title="Paid to the supplier's approved address.">
        All checks passed and the treasury contract enforced your limits.
      </Banner>
    );
  }
  return null;
}

function Banner({ tone, icon, title, children }: { tone: "amber" | "coral" | "mint"; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const styles = {
    amber: "border-amber/35 bg-amber/[0.07] [&_svg]:text-amber",
    coral: "border-coral/35 bg-coral/[0.07] [&_svg]:text-coral",
    mint: "border-mint/25 bg-mint/[0.05] [&_svg]:text-mint",
  }[tone];
  return (
    <div role={tone === "mint" ? "status" : "alert"} className={cn("flex items-start gap-3 rounded-card border px-4 py-3 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]", styles)}>
      {icon}
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-fg">{title}</p>
        <p className="mt-0.5 text-[13px] text-fg/80">{children}</p>
      </div>
    </div>
  );
}
