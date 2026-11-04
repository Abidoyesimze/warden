import type { ExtractedInvoice } from "../extract/schema.js";

export type Severity = "HOLD" | "BLOCK" | "INFO";
export type Decision = "PAY" | "HOLD" | "BLOCK";

export interface VendorRecord {
  id: string;
  name: string;
  currency: string;
  destChain: string;
  destAsset: string;
  destAddress: string;
  maxAmount: string;
  active: boolean;
}

export interface HistoryEntry {
  invoiceNumber: string;
  amount: string;
  currency: string;
  issueDate: string;
  status: "paid" | "pending";
}

export interface RuleCheck {
  id: string;
  passed: boolean;
  flag: string;
  severity: Severity;
  reason: string;
}

export interface RiskResult {
  decision: Decision;
  flags: RuleCheck[];
  rules: RuleCheck[];
  summary: string;
  vendor: VendorRecord | null;
  lookalikeOf: VendorRecord | null;
}

export interface VendorMatch {
  vendor: VendorRecord | null;
  lookalikeOf: VendorRecord | null;
}

export interface EngineContext {
  extracted: ExtractedInvoice;
  vendor: VendorRecord | null;
  lookalikeOf: VendorRecord | null;
  history: HistoryEntry[];
  now: Date;
}
