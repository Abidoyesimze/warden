import type { ContractStatus, PaymentSummary } from "./api/types";

export type OwnerStatus = "paid" | "processing" | "review" | "blocked" | "rejected" | "failed" | "refunded";

export interface StatusView {
  key: OwnerStatus;
  label: string;
  tone: "mint" | "neutral" | "amber" | "coral" | "muted";
}

const VIEWS: Record<OwnerStatus, StatusView> = {
  paid: { key: "paid", label: "Paid", tone: "mint" },
  processing: { key: "processing", label: "Processing", tone: "neutral" },
  review: { key: "review", label: "Under review", tone: "amber" },
  blocked: { key: "blocked", label: "Blocked", tone: "coral" },
  rejected: { key: "rejected", label: "Rejected", tone: "coral" },
  failed: { key: "failed", label: "Failed", tone: "coral" },
  refunded: { key: "refunded", label: "Refunded", tone: "muted" },
};

/** Maps a contract status to what the owner sees. A rejection caused by a BLOCK rule reads "Blocked". */
export function ownerStatus(status: ContractStatus, flags: string[] = []): StatusView {
  switch (status) {
    case "Settled":
      return VIEWS.paid;
    case "Approved":
    case "Sending":
    case "Sent":
      return VIEWS.processing;
    case "Held":
      return VIEWS.review;
    case "Rejected":
      return isBlocked(flags) ? VIEWS.blocked : VIEWS.rejected;
    case "Failed":
      return VIEWS.failed;
    case "Refunded":
      return VIEWS.refunded;
  }
}

const BLOCKING = new Set(["DUPLICATE_NUMBER", "DUPLICATE_HASH", "OVER_HARD_CAP"]);
export function isBlocked(flags: string[]): boolean {
  return flags.some((f) => BLOCKING.has(f) || f.startsWith("BLOCK:"));
}

export function paymentView(p: Pick<PaymentSummary, "status" | "flags">): StatusView {
  return ownerStatus(p.status, p.flags);
}

/** Step of the processing pipeline, for the progress indicator. */
export function processingStep(status: ContractStatus): number {
  return { Approved: 1, Sending: 2, Sent: 3 }[status as "Approved" | "Sending" | "Sent"] ?? 0;
}
