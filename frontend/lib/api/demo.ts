// In-memory backend for demo mode. Simulates the agent pipeline and contract state changes
// so all three demo beats can be clicked through without keys.

import { ApiError, type WardenApi } from "./client";
import {
  buildInvoice,
  buildReceipt,
  DEMO_AGENT,
  DEMO_CONTRACT,
  DEMO_OWNER,
  fixtureByFileName,
  initialInvoices,
  INITIAL_TREASURY,
  minutesAgo,
  nearTx,
} from "./demo-data";
import type { ChainEvent, ContractStatus, InvoiceDetail, Limits, Treasury, UploadEvent } from "./types";
import { fromMicro, toMicro } from "../format";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => structuredClone(v);

const URGENCY: Partial<Record<string, number>> = { DUPLICATE_NUMBER: 0, DEST_MISMATCH: 1, INJECTION_TEXT: 1, LOOKALIKE_VENDOR: 2, AMOUNT_ANOMALY: 3 };

class DemoStore implements WardenApi {
  mode = "demo" as const;
  private treasury: Treasury = clone(INITIAL_TREASURY);
  private invoices: InvoiceDetail[] = initialInvoices();
  private listeners = new Set<() => void>();
  private nextPaymentId = this.invoices.length + 1;

  private emit() {
    for (const l of this.listeners) l();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getTreasury() {
    await sleep(120);
    return clone(this.treasury);
  }

  async listPayments() {
    await sleep(150);
    return this.invoices
      .map((i) => clone(i.payment))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listReview() {
    await sleep(150);
    const urgency = (flags: string[]) => Math.min(9, ...flags.map((f) => URGENCY[f.replace(/^BLOCK:/, "")] ?? 5));
    return this.invoices
      .filter((i) => i.payment.status === "Held")
      .map((i) => clone(i.payment))
      .sort((a, b) => urgency(a.flags) - urgency(b.flags) || a.createdAt.localeCompare(b.createdAt));
  }

  async getInvoice(id: string) {
    await sleep(180);
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) throw new ApiError("We couldn't find that invoice.", "Go back to the dashboard and open it from the activity list.");
    return clone(inv);
  }

  private find(id: string) {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) throw new ApiError("Invoice not found.");
    return inv;
  }

  private addEvent(inv: InvoiceDetail, name: ChainEvent["name"], actor: string, detail?: string) {
    const e: ChainEvent = { name, at: new Date().toISOString(), txHash: nearTx(`${inv.id}:${name}:${Date.now()}`), actor, detail };
    inv.events.push(e);
    inv.payment.updatedAt = e.at;
    return e;
  }

  private setStatus(inv: InvoiceDetail, status: ContractStatus) {
    inv.payment.status = status;
  }

  /** Approved → Sending → Sent → Settled, like the contract + 1Click would. */
  private async runPayment(inv: InvoiceDetail) {
    const vendor = inv.vendor;
    if (!vendor) throw new ApiError("This supplier isn't in your approved list, so the treasury can't pay it.", "Add the supplier in Treasury first.");
    const lim = this.treasury.limits;
    if (toMicro(lim.spentToday) + toMicro(inv.payment.amount) > toMicro(lim.dailyCap)) {
      throw new ApiError("This payment would go over today's spending cap.", "Raise the daily cap in Treasury or approve it tomorrow.");
    }
    await sleep(900);
    this.setStatus(inv, "Sending");
    this.addEvent(inv, "payment_sending", DEMO_AGENT, "1Click quote verified");
    lim.spentToday = fromMicro(toMicro(lim.spentToday) + toMicro(inv.payment.amount));
    this.treasury.balance = fromMicro(toMicro(this.treasury.balance) - toMicro(inv.payment.amount));
    this.emit();
    await sleep(1100);
    this.setStatus(inv, "Sent");
    const sent = this.addEvent(inv, "payment_sent", DEMO_CONTRACT);
    this.emit();
    await sleep(2200);
    this.setStatus(inv, "Settled");
    const settled = this.addEvent(inv, "payment_settled", DEMO_AGENT, "1Click: SUCCESS");
    inv.receipt = buildReceipt(vendor, inv.payment.amount, `${inv.id}:${Date.now()}`, settled.at, sent.txHash);
    this.emit();
  }

  async uploadInvoice(file: File, onEvent: (e: UploadEvent) => void) {
    const fixture = fixtureByFileName(file.name);
    if (!fixture) {
      throw new ApiError(
        "Demo mode only knows the 13 sample invoices.",
        "Pick one of the samples below, or name your file like 01-normal.pdf.",
      );
    }
    const paymentId = this.nextPaymentId++;
    const id = `inv_${fixture.n}_${paymentId}`;
    const built = buildInvoice(fixture, { id, paymentId, createdMin: 0 });

    onEvent({ stage: "uploading" });
    await sleep(500);
    onEvent({ stage: "reading" });
    await sleep(900);
    const x = built.extracted;
    onEvent({ stage: "reading", extracted: { vendor_name: x.vendor_name, invoice_number: x.invoice_number } });
    await sleep(500);
    onEvent({ stage: "reading", extracted: { ...x } });
    await sleep(400);
    onEvent({ stage: "checking", extracted: { ...x } });
    for (let i = 1; i <= built.rules.length; i++) {
      await sleep(110);
      onEvent({ stage: "checking", rules: built.rules.slice(0, i) });
    }
    await sleep(300);
    onEvent({ stage: "submitting", decision: built.decision });
    await sleep(900);

    // What the contract decides
    const finalStatus = built.payment.status;
    built.events = [];
    built.receipt = null;
    built.payment.createdAt = new Date().toISOString();
    this.addEvent(built, "payment_proposed", DEMO_AGENT, `${built.payment.flags.length} flag(s)`);
    if (finalStatus === "Settled") {
      this.setStatus(built, "Approved");
      this.addEvent(built, "payment_approved", DEMO_CONTRACT, "auto-approved by policy");
    } else if (finalStatus === "Held") {
      this.setStatus(built, "Held");
      this.addEvent(built, "payment_held", DEMO_CONTRACT);
    } else {
      this.setStatus(built, "Rejected");
      this.addEvent(built, "payment_rejected", DEMO_CONTRACT, "blocked by rules");
    }
    this.invoices.push(built);
    this.emit();
    onEvent({ stage: "done", invoiceId: id, status: built.payment.status, decision: built.decision });

    if (finalStatus === "Settled") void this.runPayment(built).catch(() => undefined);
    return id;
  }

  async approve(_paymentId: number, invoiceId: string) {
    const inv = this.find(invoiceId);
    if (inv.payment.status !== "Held") throw new ApiError("This payment is no longer waiting for review.", "Refresh to see its current status.");
    if (this.treasury.paused) throw new ApiError("Payments are paused.", "Unpause the treasury to approve payments.");
    if (!inv.vendor) throw new ApiError("This supplier isn't in your approved list, so the treasury can't pay it.", "Add the supplier in Treasury first, or reject this invoice.");
    await sleep(700); // wallet signature
    this.setStatus(inv, "Approved");
    this.addEvent(inv, "payment_approved", DEMO_OWNER, "approved by owner");
    this.emit();
    void this.runPayment(inv).catch(() => undefined);
  }

  async finishApproval() {
    // Demo approvals run the payment straight away; nothing to resume.
  }

  async reject(_paymentId: number, invoiceId: string, reason: string) {
    const inv = this.find(invoiceId);
    if (inv.payment.status !== "Held") throw new ApiError("This payment is no longer waiting for review.");
    await sleep(700);
    this.setStatus(inv, "Rejected");
    this.addEvent(inv, "payment_rejected", DEMO_OWNER, reason || "rejected by owner");
    this.emit();
  }

  async setPaused(paused: boolean) {
    await sleep(700);
    this.treasury.paused = paused;
    this.emit();
  }

  async setLimits(limits: Omit<Limits, "spentToday">) {
    const m = (v: string) => toMicro(v);
    if (m(limits.autoPayLimit) > m(limits.perTxCap)) throw new ApiError("The auto-pay limit can't be higher than the per-payment cap.");
    if (m(limits.perTxCap) > m(limits.dailyCap)) throw new ApiError("The per-payment cap can't be higher than the daily cap.");
    await sleep(700);
    this.treasury.limits = { ...this.treasury.limits, ...limits };
    this.emit();
  }

  async verify(invoiceId: string) {
    const inv = this.find(invoiceId);
    await sleep(1200);
    return {
      invoiceHash: { stored: inv.invoiceHash, onChain: inv.invoiceHash, match: true },
      attestationHash: { stored: inv.attestation.hash, onChain: inv.attestation.hash, match: true },
    };
  }
}

export function createDemoApi(): WardenApi {
  return new DemoStore();
}

export { minutesAgo };
