import type { EngineContext, RuleCheck } from "./types.js";

export function r4DuplicateNumber(ctx: EngineContext): RuleCheck {
  const base = { id: "R4", flag: "DUPLICATE_NUMBER", severity: "BLOCK" as const };

  if (!ctx.vendor) {
    return { ...base, passed: true, reason: "Vendor not matched; duplicate-number check skipped (see R1)." };
  }

  const duplicate = ctx.history.some(
    (h) => h.invoiceNumber === ctx.extracted.invoice_number && (h.status === "paid" || h.status === "pending"),
  );

  if (duplicate) {
    return {
      ...base,
      passed: false,
      reason: `Invoice number "${ctx.extracted.invoice_number}" from ${ctx.vendor.name} has already been paid or is pending payment.`,
    };
  }

  return { ...base, passed: true, reason: "Invoice number has not been seen before for this vendor." };
}
