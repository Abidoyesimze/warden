import type { EngineContext, RuleCheck } from "./types.js";

export function r6CurrencyChange(ctx: EngineContext): RuleCheck {
  const base = { id: "R6", flag: "CURRENCY_CHANGE", severity: "HOLD" as const };

  if (!ctx.vendor) {
    return { ...base, passed: true, reason: "Vendor not matched; currency check skipped (see R1)." };
  }

  const invoiceCurrency = ctx.extracted.currency.trim().toUpperCase();
  const usual = ctx.vendor.currency.trim().toUpperCase();

  if (invoiceCurrency !== usual) {
    return {
      ...base,
      passed: false,
      reason: `Invoice is in ${invoiceCurrency}, but ${ctx.vendor.name} is normally paid in ${usual}.`,
    };
  }

  return { ...base, passed: true, reason: `Currency matches the usual ${usual} for this vendor.` };
}
