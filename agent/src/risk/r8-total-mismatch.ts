import type { EngineContext, RuleCheck } from "./types.js";
import { RISK_CONFIG } from "./config.js";
import { sumAmounts, toNumber } from "./text.js";

export function r8TotalMismatch(ctx: EngineContext): RuleCheck {
  const base = { id: "R8", flag: "TOTAL_MISMATCH", severity: "HOLD" as const };

  const lineSum = sumAmounts(ctx.extracted.line_items.map((l) => l.amount));
  const total = toNumber(ctx.extracted.total_amount);
  const diff = Math.abs(lineSum - total);

  if (diff > RISK_CONFIG.totalMismatchTolerance) {
    return {
      ...base,
      passed: false,
      reason: `Line items add up to ${lineSum.toFixed(2)}, but the invoice total is ${total.toFixed(2)}.`,
    };
  }

  return { ...base, passed: true, reason: "Line items add up to the stated total." };
}
