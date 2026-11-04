import type { ExtractedInvoice, RuleCheck } from "@warden/agent";

export type ContractStatus =
  | "Approved"
  | "Sending"
  | "Sent"
  | "Settled"
  | "Held"
  | "Rejected"
  | "Failed"
  | "Refunded";

export interface Vendor {
  id: string;
  name: string;
  destChain: string;
  destAsset: string;
  destAddress: string;
  maxAmount: string;
  active: boolean;
}

export interface Treasury {
  contractId: string;
  ownerId: string;
  agentId: string;
  balance: string;
  limits: { autoPayLimit: string; perTxCap: string; dailyCap: string; spentToday: string };
  paused: boolean;
  vendors: Vendor[];
}

export interface PaymentSummary {
  id: number;
  invoiceId: string;
  invoiceNumber: string;
  vendorId: string | null;
  vendorName: string;
  amount: string;
  status: ContractStatus;
  flags: string[];
  topFlag: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyCheck {
  id: "REGISTRY" | "AUTO_PAY_LIMIT" | "VENDOR_MAX" | "PER_TX_CAP" | "DAILY_CAP";
  passed: boolean;
  reason: string;
}

export interface AttestationInfo {
  model: string;
  chatId: string;
  hash: string;
  signingAddress: string | null;
  verified: boolean;
  checkedAt: string;
}

export interface OnChainEvent {
  name: string;
  at: string;
  txHash: string | null;
  actor: string;
  detail?: string;
}

export interface Receipt {
  nearTxHash: string | null;
  destChain: string | null;
  destAsset: string | null;
  destTxHash: string | null;
  amountOut: string | null;
  recipient: string | null;
  settledAt: string | null;
  intentsRef: string | null;
}

export interface InvoiceDetail {
  id: string;
  fileName: string;
  fileType: "pdf" | "txt";
  fileUrl: string | null;
  previewText: string;
  invoiceHash: string;
  payment: PaymentSummary;
  extracted: ExtractedInvoice;
  decision: "PAY" | "HOLD" | "BLOCK";
  rules: RuleCheck[];
  policy: PolicyCheck[];
  summary: string;
  attestation: AttestationInfo;
  events: OnChainEvent[];
  receipt: Receipt | null;
  vendor: Vendor | null;
}

export interface VerifyResult {
  invoiceHashMatches: boolean;
  attestationHashMatches: boolean;
  recomputedInvoiceHash: string;
  recomputedAttestationHash: string;
  onChainInvoiceHash: string;
  onChainAttestationHash: string;
}

export type ProgressStage = "uploading" | "reading" | "checking" | "submitting" | "done" | "error";

export interface ProgressEvent {
  stage: ProgressStage;
  extracted?: Partial<ExtractedInvoice>;
  rules?: RuleCheck[];
  decision?: "PAY" | "HOLD" | "BLOCK";
  invoiceId?: string;
  status?: ContractStatus;
  message?: string;
}
