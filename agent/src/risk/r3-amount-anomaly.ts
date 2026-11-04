import type { EngineContext, RuleCheck } from "./types.js";
import { RISK_CONFIG } from "./config.js";
import { toNumber } from "./text.js";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
}

export function r3AmountAnomaly(ctx: EngineContext): RuleCheck {
  const base = { id: "R3", severity: "HOLD" as const };

  if (ctx.history.length < RISK_CONFIG.minHistoryForAmountCheck) {
    return {
      ...base,
      passed: true,
      flag: "THIN_HISTORY",
      severity: "INFO",
      reason: `Fewer than ${RISK_CONFIG.minHistoryForAmountCheck} past invoices for this vendor; the amount check was skipped.`,
    };
  }

  const amounts = ctx.history.map((h) => toNumber(h.amount));
  const med = median(amounts);
  const max = Math.max(...amounts);
  const amount = toNumber(ctx.extracted.total_amount);

  const medianLimit = med * RISK_CONFIG.amountAnomalyMedianMultiplier;
  const maxLimit = max * RISK_CONFIG.amountAnomalyMaxMultiplier;

  if (amount > medianLimit || amount > maxLimit) {
    return {
      ...base,
      passed: false,
      flag: "AMOUNT_ANOMALY",
      reason: `This invoice is ${ctx.extracted.currency} ${ctx.extracted.total_amount}, well above this vendor's usual range (median ${med.toFixed(2)}, largest past invoice ${max.toFixed(2)}).`,
    };
  }

  return {
    ...base,
    passed: true,
    flag: "AMOUNT_ANOMALY",
    reason: "Amount is within the usual range for this vendor.",
  };
}
