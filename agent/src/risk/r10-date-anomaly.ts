import type { EngineContext, RuleCheck } from "./types.js";
import { RISK_CONFIG } from "./config.js";
import { isFuture } from "./text.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function r10DateAnomaly(ctx: EngineContext): RuleCheck {
  const base = { id: "R10", flag: "DATE_ANOMALY", severity: "HOLD" as const };
  const e = ctx.extracted;

  if (isFuture(e.issue_date, ctx.now)) {
    return { ...base, passed: false, reason: `Issue date ${e.issue_date} is in the future.` };
  }

  if (e.due_date && new Date(e.due_date).getTime() < new Date(e.issue_date).getTime()) {
    return { ...base, passed: false, reason: `Due date ${e.due_date} is before the issue date ${e.issue_date}.` };
  }

  const dueInDays = e.due_date ? (new Date(e.due_date).getTime() - ctx.now.getTime()) / MS_PER_DAY : null;
  if (dueInDays !== null && dueInDays >= 0 && dueInDays <= RISK_CONFIG.dueSoonDays) {
    const haystack = [e.vendor_name, ...e.line_items.map((l) => l.description), ...e.instructions_found]
      .join(" ")
      .toLowerCase();
    const urgent = RISK_CONFIG.urgencyWords.some((w) => haystack.includes(w));
    if (urgent) {
      return {
        ...base,
        passed: false,
        reason: `Due in ${RISK_CONFIG.dueSoonDays} days or less and the invoice uses urgent language.`,
      };
    }
  }

  return { ...base, passed: true, reason: "Dates look normal." };
}
