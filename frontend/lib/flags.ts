import type { RuleId } from "./api/types";

/** Plain-English names for every flag. Raw codes are only shown as secondary text. */
export const FLAG_LABELS: Record<string, string> = {
  UNKNOWN_VENDOR: "New supplier",
  LOOKALIKE_VENDOR: "Name looks like a known supplier",
  DEST_MISMATCH: "Payment address changed",
  AMOUNT_ANOMALY: "Unusually large amount",
  THIN_HISTORY: "Not enough past invoices to compare",
  DUPLICATE_NUMBER: "Invoice number already used",
  NEAR_DUPLICATE: "Looks like a re-sent invoice",
  CURRENCY_CHANGE: "Different currency than usual",
  INJECTION_TEXT: "Hidden instructions in invoice",
  TOTAL_MISMATCH: "Line items don't add up",
  LOW_CONFIDENCE: "Invoice hard to read",
  DATE_ANOMALY: "Suspicious dates",
  // Contract-side flags
  DUPLICATE_HASH: "Same file submitted twice",
  OVER_HARD_CAP: "Above per-payment cap",
  OVER_AUTO_PAY_LIMIT: "Above auto-pay limit",
  OVER_DAILY_CAP: "Would exceed today's spending cap",
  OVER_VENDOR_MAX: "Above this supplier's maximum",
  QUOTE_REJECTED: "Payment quote failed safety checks",
};

export function flagLabel(flag: string): string {
  const code = flag.startsWith("BLOCK:") ? flag.slice(6) : flag;
  return FLAG_LABELS[code] ?? code.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** What each rule checks, phrased as the thing we want to be true. */
export const RULE_TITLES: Record<RuleId, string> = {
  R1: "Known supplier",
  R2: "Payment address matches",
  R3: "Amount in usual range",
  R4: "Invoice number not used before",
  R5: "Not a re-sent invoice",
  R6: "Usual currency",
  R7: "No hidden instructions",
  R8: "Totals add up",
  R9: "Readable and complete",
  R10: "Dates make sense",
};

export const RULE_IDS: RuleId[] = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10"];
