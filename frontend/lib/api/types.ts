// Shapes the frontend expects from the backend API.
// Keep in sync with docs/api.md. Amounts are decimal strings in USDC ("1.20").

export type ContractStatus =
  | "Approved"
  | "Sending"
  | "Sent"
  | "Settled"
  | "Held"
  | "Rejected"
  | "Failed"
  | "Refunded";

export type Decision = "PAY" | "HOLD" | "BLOCK";
export type Severity = "HOLD" | "BLOCK" | "INFO";
export type Confidence = "high" | "medium" | "low";

export interface Vendor {
  id: string;
  name: string;
  destChain: string; // e.g. "base", "sol"
  destAsset: string; // e.g. "USDC"
  destAssetId: string; // 1Click asset id
  destAddress: string;
  maxAmount: string;
  active: boolean;
}

export interface Limits {
  autoPayLimit: string;
  perTxCap: string;
  dailyCap: string;
  spentToday: string;
}

export interface Treasury {
  contractId: string;
  ownerId: string;
  agentId: string;
  balance: string;
  limits: Limits;
  paused: boolean;
  vendors: Vendor[];
}

export interface PaymentSummary {
  id: number; // on-chain payment id
  invoiceId: string; // backend invoice id
  invoiceNumber: string;
  vendorId: string | null; // null when the supplier is not in the registry
  vendorName: string; // as written on the invoice
  amount: string;
  status: ContractStatus;
  flags: string[]; // e.g. ["DEST_MISMATCH"]; contract-side flags included
  topFlag: string | null;
  createdAt: string; // ISO
  updatedAt: string;
}

export interface LineItem {
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
}

/** The record NEAR AI Cloud extracts. Matches the agent's zod schema. */
export interface ExtractedInvoice {
  vendor_name: string;
  vendor_identifier: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  total_amount: string;
  line_items: LineItem[];
  payment_details: {
    method: "crypto" | "bank" | "unknown";
    chain: string | null;
    asset: string | null;
    address: string | null;
    bank_name: string | null;
  };
  instructions_found: string[];
  extraction_confidence: Confidence;
}

export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" | "R9" | "R10";

export interface RuleResult {
  id: RuleId;
  passed: boolean;
  flag: string | null;
  severity: Severity | null;
  reason: string; // plain English, written by code templates
}

/** Contract-side policy checks (limits), shown next to the rules. */
export interface PolicyCheck {
  id: "AUTO_PAY_LIMIT" | "PER_TX_CAP" | "DAILY_CAP" | "VENDOR_MAX" | "REGISTRY";
  passed: boolean;
  reason: string;
}

export type ChainEventName =
  | "payment_proposed"
  | "payment_held"
  | "payment_rejected"
  | "payment_approved"
  | "payment_sending"
  | "payment_sent"
  | "payment_settled"
  | "vendor_updated"
  | "limits_updated"
  | "paused";

export interface ChainEvent {
  name: ChainEventName;
  at: string; // ISO
  txHash: string; // NEAR tx hash
  actor: string; // account that signed
  detail?: string;
}

export interface Receipt {
  nearTxHash: string;
  destChain: string;
  destAsset: string;
  destTxHash: string | null;
  amountOut: string;
  recipient: string;
  settledAt: string;
  intentsRef: string;
}

export interface Attestation {
  model: string;
  chatId: string;
  hash: string; // attestation_hash stored on-chain
  signingAddress: string;
  verified: boolean;
  checkedAt: string;
}

export interface InvoiceDetail {
  id: string;
  fileName: string;
  fileType: "pdf" | "txt";
  fileUrl: string | null; // real mode: backend URL for the original file
  previewText: string; // text the agent read (shown when no file preview)
  invoiceHash: string;
  payment: PaymentSummary;
  extracted: ExtractedInvoice;
  decision: Decision;
  rules: RuleResult[];
  policy: PolicyCheck[];
  summary: string; // generated from rule results
  attestation: Attestation;
  events: ChainEvent[];
  receipt: Receipt | null;
  vendor: Vendor | null; // registry entry, if matched
}

export type UploadStage = "uploading" | "reading" | "checking" | "submitting" | "done";

/** One line of the POST /invoices progress stream (newline-delimited JSON). */
export type UploadEvent =
  | { stage: UploadStage; extracted?: Partial<ExtractedInvoice>; rules?: RuleResult[]; invoiceId?: string; decision?: Decision; status?: ContractStatus }
  | { stage: "error"; message: string };

export interface VerifyResult {
  invoiceHash: { stored: string; onChain: string; match: boolean };
  attestationHash: { stored: string; onChain: string; match: boolean };
}
