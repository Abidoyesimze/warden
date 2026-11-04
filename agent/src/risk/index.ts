import type { ExtractedInvoice } from "../extract/schema.js";
import { matchVendor } from "./vendor-match.js";
import { r1UnknownVendor } from "./r1-unknown-vendor.js";
import { r2DestMismatch } from "./r2-dest-mismatch.js";
import { r3AmountAnomaly } from "./r3-amount-anomaly.js";
import { r4DuplicateNumber } from "./r4-duplicate-number.js";
import { r5NearDuplicate } from "./r5-near-duplicate.js";
import { r6CurrencyChange } from "./r6-currency-change.js";
import { r7InjectionText } from "./r7-injection-text.js";
import { r8TotalMismatch } from "./r8-total-mismatch.js";
import { r9LowConfidence } from "./r9-low-confidence.js";
import { r10DateAnomaly } from "./r10-date-anomaly.js";
import type { EngineContext, HistoryEntry, RiskResult, RuleCheck, VendorRecord } from "./types.js";

export * from "./types.js";

const RULES: ((ctx: EngineContext) => RuleCheck)[] = [
  r1UnknownVendor,
  r2DestMismatch,
  r3AmountAnomaly,
  r4DuplicateNumber,
  r5NearDuplicate,
  r6CurrencyChange,
  r7InjectionText,
  r8TotalMismatch,
  r9LowConfidence,
  r10DateAnomaly,
];

export function runRiskEngine(
  extracted: ExtractedInvoice,
  registry: VendorRecord[],
  historyByVendor: Record<string, HistoryEntry[]>,
  now: Date = new Date(),
): RiskResult {
  const { vendor, lookalikeOf } = matchVendor(extracted, registry);
  const ctx: EngineContext = {
    extracted,
    vendor,
    lookalikeOf,
    history: vendor ? historyByVendor[vendor.id] ?? [] : [],
    now,
  };

  const rules = RULES.map((rule) => rule(ctx));
  const flags = rules.filter((r) => !r.passed || r.severity === "INFO");
  const actionable = flags.filter((f) => !f.passed);

  const decision: RiskResult["decision"] = actionable.some((f) => f.severity === "BLOCK")
    ? "BLOCK"
    : actionable.some((f) => f.severity === "HOLD")
      ? "HOLD"
      : "PAY";

  const summary = buildSummary(decision, actionable);

  return { decision, flags, rules, summary, vendor, lookalikeOf };
}

function buildSummary(decision: RiskResult["decision"], actionable: RuleCheck[]): string {
  if (decision === "PAY") {
    return "No fraud indicators found. This invoice is eligible for automatic payment.";
  }
  const reasons = actionable.map((f) => f.reason).join(" ");
  const verb = decision === "BLOCK" ? "blocked" : "held for review";
  return `This invoice was ${verb}. ${reasons}`;
}

/** Flags to pass on-chain to propose_payment: actionable (non-INFO) flag codes only. */
export function toOnChainFlags(result: RiskResult): string[] {
  return result.flags.filter((f) => !f.passed && f.severity !== "INFO").map((f) => (f.severity === "BLOCK" ? `BLOCK:${f.flag}` : f.flag));
}
