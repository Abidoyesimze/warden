import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  computeAttestationHash,
  readInvoiceText,
  runRiskEngine,
  toOnChainFlags,
  type AttestationEvidence,
  type ExtractedInvoice,
  type HistoryEntry,
  type VendorRecord,
} from "@warden/agent";
import type { ChainOps } from "./chain/types.js";
import type { ChainPayment, ChainVendor } from "./chain/mapping.js";
import type { WardenDb } from "./db/index.js";
import { sha256Hex } from "./hash.js";
import { decimalToRaw } from "./money.js";
import type { PolicyCheck, ProgressEvent } from "./types.js";

export interface ExtractFn {
  (text: string): Promise<{ extracted: ExtractedInvoice; chatId: string; model: string; rawResponseText: string }>;
}

export interface AttestFn {
  (model: string, chatId: string): Promise<AttestationEvidence>;
}

export interface PipelineDeps {
  db: WardenDb;
  chain: ChainOps;
  extract: ExtractFn;
  attest: AttestFn;
  vendors: VendorRecord[];
  historyByVendor: Record<string, HistoryEntry[]>;
  dataDir: string;
  now?: () => Date;
}

export interface UploadedFile {
  buffer: Buffer;
  fileName: string;
  fileType: "pdf" | "txt";
}

function newInvoiceId(): string {
  return `inv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function buildPolicyChecks(payment: ChainPayment, vendor: ChainVendor | null): PolicyCheck[] {
  const has = (flag: string) => payment.flags.includes(flag);
  return [
    {
      id: "REGISTRY",
      passed: !has("UNKNOWN_VENDOR") && !has("DEST_MISMATCH"),
      reason: vendor ? "Vendor and payment address matched the registry." : "Vendor or address did not match the registry.",
    },
    {
      id: "AUTO_PAY_LIMIT",
      passed: !has("OVER_AUTO_PAY_LIMIT"),
      reason: has("OVER_AUTO_PAY_LIMIT")
        ? "Amount is above the auto-pay limit; held for approval."
        : "Amount is within the auto-pay limit.",
    },
    {
      id: "VENDOR_MAX",
      passed: !has("OVER_VENDOR_MAX"),
      reason: has("OVER_VENDOR_MAX") ? "Amount is above this vendor's per-invoice maximum." : "Within this vendor's maximum.",
    },
    {
      id: "PER_TX_CAP",
      passed: !has("OVER_HARD_CAP"),
      reason: has("OVER_HARD_CAP") ? "Amount is above the hard per-transaction cap." : "Within the per-transaction cap.",
    },
    {
      id: "DAILY_CAP",
      passed: !has("OVER_DAILY_CAP"),
      reason: has("OVER_DAILY_CAP") ? "Would exceed today's remaining daily cap." : "Within the daily cap.",
    },
  ];
}

/**
 * Upload -> read (TEE) -> check 10 rules -> submit to treasury. Mirrors
 * POST /invoices' ndjson stages exactly (see docs/api.md) so the route
 * handler is a thin wrapper that writes each yielded event to the response.
 */
export async function* runPipeline(file: UploadedFile, deps: PipelineDeps): AsyncGenerator<ProgressEvent> {
  yield { stage: "uploading" };

  const invoiceHash = sha256Hex(file.buffer);
  const invoiceId = newInvoiceId();
  const filePath = path.join(deps.dataDir, "invoices", `${invoiceId}.${file.fileType}`);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, file.buffer);

  yield { stage: "reading" };
  const text = await readInvoiceText(file.buffer, file.fileType);
  const { extracted, chatId, model, rawResponseText } = await deps.extract(text);
  void rawResponseText;
  yield {
    stage: "reading",
    extracted: { vendor_name: extracted.vendor_name, invoice_number: extracted.invoice_number },
  };

  const evidence = await deps.attest(model, chatId);
  const attestationHash = computeAttestationHash(evidence);

  yield { stage: "checking", extracted };
  const now = deps.now?.() ?? new Date();
  const risk = runRiskEngine(extracted, deps.vendors, deps.historyByVendor, now);
  yield { stage: "checking", rules: risk.rules };

  yield { stage: "submitting", decision: risk.decision };

  const address = extracted.payment_details.address;
  let claimedDestHash: string;
  let vendorIdForChain: string;
  if (risk.vendor) {
    claimedDestHash = address ? sha256Hex(address) : sha256Hex(risk.vendor.destAddress);
    vendorIdForChain = risk.vendor.id;
  } else {
    claimedDestHash = sha256Hex("");
    vendorIdForChain = extracted.vendor_identifier ?? extracted.vendor_name;
  }

  const { result: payment, txHash } = await deps.chain.proposePayment<ChainPayment>({
    invoice_hash: invoiceHash,
    vendor_id: vendorIdForChain,
    amount: decimalToRaw(extracted.total_amount),
    claimed_dest_hash: claimedDestHash,
    risk_flags: toOnChainFlags(risk),
    attestation_hash: attestationHash,
  });

  const chainVendor = risk.vendor ? await deps.chain.getVendor<ChainVendor>(risk.vendor.id).catch(() => null) : null;
  const policy = buildPolicyChecks(payment, chainVendor);

  deps.db.insertInvoice({
    id: invoiceId,
    file_name: file.fileName,
    file_type: file.fileType,
    file_path: filePath,
    preview_text: text.slice(0, 5000),
    invoice_hash: invoiceHash,
    payment_id: payment.id,
    vendor_id: risk.vendor?.id ?? null,
    extracted_json: JSON.stringify(extracted),
    decision: risk.decision,
    rules_json: JSON.stringify(risk.rules),
    summary: risk.summary,
    attestation_json: JSON.stringify({
      model,
      chatId,
      hash: attestationHash,
      evidence,
    }),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  deps.db.addEvent({
    payment_id: payment.id,
    name:
      payment.status === "Approved" ? "payment_proposed" : payment.status === "Held" ? "payment_held" : "payment_rejected",
    tx_hash: txHash,
    actor: "agent",
    detail: JSON.stringify({ flags: payment.flags, policy }),
    at: now.toISOString(),
  });

  yield { stage: "done", invoiceId, status: payment.status, decision: risk.decision };
}
