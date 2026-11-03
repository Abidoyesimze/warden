import type { InvoiceDetail, Limits, PaymentSummary, Treasury, UploadEvent, VerifyResult } from "./types";

/** Everything the UI needs. Implemented by the demo store and by the HTTP client. */
export interface WardenApi {
  mode: "demo" | "live";
  getTreasury(): Promise<Treasury>;
  listPayments(): Promise<PaymentSummary[]>;
  listReview(): Promise<PaymentSummary[]>;
  getInvoice(id: string): Promise<InvoiceDetail>;
  /** Uploads a file and reports each pipeline stage as it happens. Resolves with the invoice id. */
  uploadInvoice(file: File, onEvent: (e: UploadEvent) => void): Promise<string>;
  /** Owner approves a held payment (wallet-signed), then the backend executes it. */
  approve(paymentId: number, invoiceId: string): Promise<void>;
  reject(paymentId: number, invoiceId: string, reason: string): Promise<void>;
  verify(invoiceId: string): Promise<VerifyResult>;
  /** Owner-only, wallet-signed contract calls. */
  setPaused(paused: boolean): Promise<void>;
  setLimits(limits: Omit<Limits, "spentToday">): Promise<void>;
  /** Called whenever data may have changed. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly action?: string,
  ) {
    super(message);
  }
}
