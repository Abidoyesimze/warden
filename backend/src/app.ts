import { readFileSync } from "node:fs";
import express, { type Express } from "express";
import multer from "multer";
import { mapPaymentSummary, mapTreasury, type ChainConfig, type ChainPayment, type ChainVendor } from "./chain/mapping.js";
import { buildInvoiceDetail } from "./detail.js";
import { sha256Hex } from "./hash.js";
import type { OneClickOps } from "./oneclick-ops.js";
import { runPipeline, type PipelineDeps } from "./pipeline.js";
import { computeAttestationHash } from "@warden/agent";
import type { ProgressEvent, Receipt } from "./types.js";

export interface AppDeps extends PipelineDeps {
  contractId: string;
  usdcTokenId: string;
  oneclick: OneClickOps;
}

function sendError(res: express.Response, status: number, message: string, action: string): void {
  res.status(status).json({ message, action });
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.get("/treasury", async (_req, res) => {
    const [config, vendors, balance] = await Promise.all([
      deps.chain.getConfig<ChainConfig>(),
      deps.chain.listVendors<[string, ChainVendor][]>(),
      deps.chain.ftBalanceOf(deps.usdcTokenId, deps.contractId),
    ]);
    res.json(mapTreasury(deps.contractId, balance, config, vendors));
  });

  app.get("/payments", async (_req, res) => {
    const chainPayments = await deps.chain.listPayments<ChainPayment[]>(0, 100);
    const summaries = await Promise.all(chainPayments.map((p) => summarize(p, deps)));
    res.json(summaries);
  });

  app.get("/payments/review", async (_req, res) => {
    const chainPayments = await deps.chain.listPayments<ChainPayment[]>(0, 100);
    const held = chainPayments.filter((p) => p.status === "Held");
    const summaries = await Promise.all(held.map((p) => summarize(p, deps)));
    // "Most urgent first": largest held amount first, as a simple proxy for urgency.
    summaries.sort((a, b) => Number(b.amount) - Number(a.amount));
    res.json(summaries);
  });

  app.get("/invoices/:id", async (req, res) => {
    const row = deps.db.getInvoice(req.params.id);
    if (!row) return sendError(res, 404, "Invoice not found.", "Check the invoice id and try again.");
    res.json(await buildInvoiceDetail(row, deps.chain, deps.db));
  });

  app.get("/invoices/:id/file", (req, res) => {
    const row = deps.db.getInvoice(req.params.id);
    if (!row) return sendError(res, 404, "Invoice not found.", "Check the invoice id and try again.");
    res.sendFile(row.file_path);
  });

  app.post("/invoices", upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file) return sendError(res, 400, "No file was uploaded.", "Attach a PDF or .txt invoice.");

    const fileType = file.originalname.toLowerCase().endsWith(".pdf") ? "pdf" : "txt";
    res.setHeader("Content-Type", "application/x-ndjson");
    res.flushHeaders();

    const write = (event: ProgressEvent) => res.write(`${JSON.stringify(event)}\n`);
    try {
      for await (const event of runPipeline({ buffer: file.buffer, fileName: file.originalname, fileType }, deps)) {
        write(event);
      }
    } catch (err) {
      write({ stage: "error", message: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      res.end();
    }
  });

  app.post("/payments/:id/execute", express.json(), async (req, res) => {
    const paymentId = Number(req.params.id);
    try {
      const result = await executePaymentFlow(paymentId, deps);
      res.json(result);
    } catch (err) {
      sendError(
        res,
        422,
        err instanceof Error ? err.message : "Payment execution failed.",
        "Retry to get a fresh quote.",
      );
    }
  });

  app.post("/invoices/:id/verify", async (req, res) => {
    const row = deps.db.getInvoice(req.params.id);
    if (!row) return sendError(res, 404, "Invoice not found.", "Check the invoice id and try again.");
    if (row.payment_id === null) {
      return sendError(res, 409, "This invoice has no on-chain payment yet.", "Upload completion must finish first.");
    }

    const payment = await deps.chain.getPayment<ChainPayment>(row.payment_id);
    const stored = JSON.parse(row.attestation_json) as { hash: string; evidence: unknown };

    const recomputedInvoiceHash = sha256Hex(readFileSync(row.file_path));
    const recomputedAttestationHash = computeAttestationHash(
      stored.evidence as Parameters<typeof computeAttestationHash>[0],
    );

    res.json({
      invoiceHashMatches: recomputedInvoiceHash === payment.invoice_hash,
      attestationHashMatches: recomputedAttestationHash === payment.attestation_hash,
      recomputedInvoiceHash,
      recomputedAttestationHash,
      onChainInvoiceHash: payment.invoice_hash,
      onChainAttestationHash: payment.attestation_hash,
    });
  });

  return app;
}

async function summarize(p: ChainPayment, deps: AppDeps) {
  const invoice = deps.db.getInvoiceByPaymentId(p.id);
  const vendor = p.vendor_id ? await deps.chain.getVendor<ChainVendor>(p.vendor_id).catch(() => null) : null;
  const vendorName = vendor?.name ?? invoice?.vendor_id ?? "Unknown vendor";
  return mapPaymentSummary(p, invoice ? { id: invoice.id, invoiceNumber: JSON.parse(invoice.extracted_json).invoice_number } : undefined, vendorName);
}

/**
 * Called after the owner signs approve_payment in their wallet. Gets a
 * fresh 1Click quote, re-verifies it against the registry, executes on
 * the treasury contract, and waits for 1Click to settle. For the tiny
 * demo-scale amounts in this project that happens in seconds, so the MVP
 * keeps this synchronous rather than adding a background job queue.
 */
async function executePaymentFlow(paymentId: number, deps: AppDeps) {
  const payment = await deps.chain.getPayment<ChainPayment>(paymentId);
  if (payment.status !== "Approved") {
    throw new Error(`Payment ${paymentId} is not Approved (currently ${payment.status}).`);
  }
  const vendor = await deps.chain.getVendor<ChainVendor>(payment.vendor_id);
  if (!vendor || !vendor.active) throw new Error("Vendor is no longer active.");

  const quote = await deps.oneclick.getQuote({
    originAsset: `nep141:${deps.usdcTokenId}`,
    destinationAsset: vendor.dest_asset,
    amount: payment.amount,
    recipient: vendor.dest_address,
    refundTo: deps.contractId,
  });

  const verified = deps.oneclick.verifyQuote(quote, {
    recipient: vendor.dest_address,
    destinationAsset: vendor.dest_asset,
    amount: payment.amount,
  });
  if (!verified.ok) {
    deps.db.addEvent({
      payment_id: paymentId,
      name: "quote_rejected",
      tx_hash: null,
      actor: "agent",
      detail: verified.reason,
      at: new Date().toISOString(),
    });
    throw new Error(`QUOTE_REJECTED: ${verified.reason}`);
  }

  const quoteHash = sha256Hex(JSON.stringify(quote));
  const { txHash } = await deps.chain.executePayment<unknown>({
    id: paymentId,
    deposit_address: quote.depositAddress,
    quote_hash: quoteHash,
  });
  deps.db.addEvent({
    payment_id: paymentId,
    name: "payment_sending",
    tx_hash: txHash,
    actor: "agent",
    at: new Date().toISOString(),
  });

  await deps.oneclick.submitDeposit(quote.depositAddress, txHash);
  const status = await deps.oneclick.pollUntilSettled(quote.depositAddress);

  const outcome = status.status === "SUCCESS" ? "Settled" : status.status === "REFUNDED" ? "Refunded" : "Failed";
  const intentsRef = status.destinationChainTxHashes?.[0]?.hash ?? quote.depositAddress;
  await deps.chain.markSettled<unknown>({ id: paymentId, outcome, intents_ref: intentsRef });

  const receipt: Receipt = {
    nearTxHash: txHash,
    destChain: vendor.dest_chain,
    destAsset: vendor.dest_asset,
    destTxHash: status.destinationChainTxHashes?.[0]?.hash ?? null,
    amountOut: quote.amountOut,
    recipient: vendor.dest_address,
    settledAt: new Date().toISOString(),
    intentsRef,
  };

  const invoice = deps.db.getInvoiceByPaymentId(paymentId);
  if (invoice) deps.db.setReceipt(invoice.id, JSON.stringify(receipt), receipt.settledAt ?? new Date().toISOString());

  deps.db.addEvent({
    payment_id: paymentId,
    name: "payment_settled",
    tx_hash: receipt.destTxHash,
    actor: "agent",
    at: new Date().toISOString(),
  });

  return { paymentId, status: outcome, receipt };
}
