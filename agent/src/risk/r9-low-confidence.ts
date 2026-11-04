import type { EngineContext, RuleCheck } from "./types.js";

export function r9LowConfidence(ctx: EngineContext): RuleCheck {
  const base = { id: "R9", flag: "LOW_CONFIDENCE", severity: "HOLD" as const };
  const e = ctx.extracted;

  const missing: string[] = [];
  if (!e.vendor_name.trim()) missing.push("vendor name");
  if (!e.invoice_number.trim()) missing.push("invoice number");
  if (!e.total_amount.trim()) missing.push("total amount");
  if (!e.issue_date.trim()) missing.push("issue date");

  if (e.extraction_confidence === "low" || missing.length > 0) {
    const reason =
      missing.length > 0
        ? `Required fields are missing: ${missing.join(", ")}.`
        : "The model reported low confidence reading this invoice.";
    return { ...base, passed: false, reason };
  }

  return { ...base, passed: true, reason: "All required fields were extracted with acceptable confidence." };
}
