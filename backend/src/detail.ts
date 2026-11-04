import type { ExtractedInvoice, RuleCheck } from "@warden/agent";
import type { ChainOps } from "./chain/types.js";
import type { ChainPayment, ChainVendor } from "./chain/mapping.js";
import { mapPaymentSummary, mapVendor } from "./chain/mapping.js";
import type { InvoiceRow, WardenDb } from "./db/index.js";
import { buildPolicyChecks } from "./pipeline.js";
import type { AttestationInfo, InvoiceDetail, OnChainEvent, Receipt } from "./types.js";

function readAttestationInfo(row: InvoiceRow): AttestationInfo {
  const stored = JSON.parse(row.attestation_json) as {
    model: string;
    chatId: string;
    hash: string;
    evidence: { fetchedAt: string; report?: { signing_address?: string } };
  };
  return {
    model: stored.model,
    chatId: stored.chatId,
    hash: stored.hash,
    signingAddress: stored.evidence.report?.signing_address ?? null,
    verified: Boolean(stored.evidence.report),
    checkedAt: stored.evidence.fetchedAt,
  };
}

export async function buildInvoiceDetail(row: InvoiceRow, chain: ChainOps, db: WardenDb): Promise<InvoiceDetail> {
  const extracted = JSON.parse(row.extracted_json) as ExtractedInvoice;
  const rules = JSON.parse(row.rules_json) as RuleCheck[];

  const payment = row.payment_id !== null ? await chain.getPayment<ChainPayment>(row.payment_id) : null;
  const chainVendor =
    payment?.vendor_id && row.vendor_id ? await chain.getVendor<ChainVendor>(row.vendor_id).catch(() => null) : null;

  const vendorName = chainVendor?.name ?? extracted.vendor_name;
  const paymentSummary = payment
    ? mapPaymentSummary(payment, { id: row.id, invoiceNumber: extracted.invoice_number }, vendorName)
    : {
        id: -1,
        invoiceId: row.id,
        invoiceNumber: extracted.invoice_number,
        vendorId: row.vendor_id,
        vendorName,
        amount: extracted.total_amount,
        status: "Held" as const,
        flags: [],
        topFlag: null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

  const events: OnChainEvent[] = payment
    ? db.listEvents(payment.id).map((e) => ({
        name: e.name,
        at: e.at,
        txHash: e.tx_hash,
        actor: e.actor,
        detail: e.detail ?? undefined,
      }))
    : [];

  const receipt: Receipt | null = row.receipt_json ? (JSON.parse(row.receipt_json) as Receipt) : null;

  return {
    id: row.id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileUrl: `/invoices/${row.id}/file`,
    previewText: row.preview_text,
    invoiceHash: row.invoice_hash,
    payment: paymentSummary,
    extracted,
    decision: row.decision,
    rules,
    policy: payment ? buildPolicyChecks(payment, chainVendor) : [],
    summary: row.summary,
    attestation: readAttestationInfo(row),
    events,
    receipt,
    vendor: chainVendor && row.vendor_id ? mapVendor(row.vendor_id, chainVendor) : null,
  };
}
