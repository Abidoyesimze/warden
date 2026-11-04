import type { EngineContext, RuleCheck } from "./types.js";
import { RISK_CONFIG } from "./config.js";
import { daysBetween, toNumber } from "./text.js";

export function r5NearDuplicate(ctx: EngineContext): RuleCheck {
  const base = { id: "R5", flag: "NEAR_DUPLICATE", severity: "HOLD" as const };

  if (!ctx.vendor) {
    return { ...base, passed: true, reason: "Vendor not matched; near-duplicate check skipped (see R1)." };
  }

  const amount = toNumber(ctx.extracted.total_amount);
  const match = ctx.history.find(
    (h) =>
      h.invoiceNumber !== ctx.extracted.invoice_number &&
      toNumber(h.amount) === amount &&
      daysBetween(h.issueDate, ctx.extracted.issue_date) <= RISK_CONFIG.nearDuplicateWindowDays,
  );

  if (match) {
    return {
      ...base,
      passed: false,
      reason: `A different invoice (#${match.invoiceNumber}) for the same amount from ${ctx.vendor.name} was issued within ${RISK_CONFIG.nearDuplicateWindowDays} days.`,
    };
  }

  return { ...base, passed: true, reason: "No recent invoice for the same amount from this vendor." };
}
