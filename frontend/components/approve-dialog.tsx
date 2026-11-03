"use client";

import { Check, Wallet } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/amount";
import { Hash } from "@/components/hash";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api, DEMO_MODE, toUserError } from "@/lib/api";
import type { PaymentSummary, Vendor } from "@/lib/api/types";
import { flagLabel } from "@/lib/flags";
import { chainName, cn } from "@/lib/format";

const LIMIT_ONLY = new Set(["OVER_AUTO_PAY_LIMIT", "OVER_VENDOR_MAX"]);

/** Shows exactly what will be signed before opening the wallet. */
export function ApproveDialog({
  payment,
  vendor,
  open,
  onOpenChange,
  onDone,
}: {
  payment: PaymentSummary;
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
}) {
  const [step, setStep] = useState<"confirm" | "signing" | "done">("confirm");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<{ message: string; action?: string } | null>(null);
  const fraudFlags = payment.flags.filter((f) => !LIMIT_ONLY.has(f));
  const needsAck = fraudFlags.length > 0;

  const reset = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setStep("confirm");
      setAck(false);
      setError(null);
    }
  };

  const sign = async () => {
    setError(null);
    setStep("signing");
    try {
      await api.approve(payment.id, payment.invoiceId);
      setStep("done");
      onDone?.();
      setTimeout(() => reset(false), 900);
    } catch (e) {
      setError(toUserError(e));
      setStep("confirm");
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent title="Approve & pay" description="Check these details. This is exactly what your wallet will sign.">
        {!vendor ? (
          <div className="px-5 py-4 text-[13px] text-fg/85">
            {payment.vendorName} isn&apos;t on your approved supplier list, so the treasury contract can&apos;t pay it. Add the supplier in
            Treasury first (with an address you&apos;ve confirmed with them), or reject this invoice.
          </div>
        ) : (
          <>
            <dl className="space-y-3 px-5 py-4 text-[13px]">
              <Line label="Payment">
                <span className="num">#{payment.id}</span>
                <span className="text-muted"> · invoice </span>
                <span className="num">{payment.invoiceNumber}</span>
              </Line>
              <Line label="Supplier">{vendor.name}</Line>
              <Line label="Amount">
                <Amount value={payment.amount} />
              </Line>
              <Line label="Pays to">
                <span className="block">
                  {vendor.destAsset} on {chainName(vendor.destChain)}
                </span>
                <Hash value={vendor.destAddress} full />
                <span className="mt-0.5 block text-[11px] text-muted">From your approved supplier list. Never from the invoice.</span>
              </Line>
              <Line label="Contract call">
                <span className="num text-[12px] text-muted">approve_payment({`{ id: ${payment.id} }`})</span>
              </Line>
            </dl>

            {needsAck && (
              <div className="mx-5 mb-4 rounded-input border border-amber/35 bg-amber/[0.07] px-3 py-2.5">
                <p className="text-[12px] font-medium text-amber">You are overriding {fraudFlags.length === 1 ? "a warning" : `${fraudFlags.length} warnings`}:</p>
                <ul className="mt-1 list-disc pl-4 text-[12px] text-fg/85">
                  {fraudFlags.map((f) => (
                    <li key={f}>{flagLabel(f)}</li>
                  ))}
                </ul>
                <label className="mt-2 flex cursor-pointer items-start gap-2 text-[12px] text-fg">
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 accent-[var(--amber)]" />
                  I confirmed this invoice with the supplier using contact details I already had.
                </label>
              </div>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="mx-5 mb-3 text-[13px] text-coral">
            {error.message} {error.action && <span className="text-muted">{error.action}</span>}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <span className="text-[11px] text-muted">{DEMO_MODE ? "Demo: signing is simulated" : "Opens your NEAR wallet"}</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => reset(false)} disabled={step === "signing"}>
              Cancel
            </Button>
            <Button
              variant="approve"
              onClick={sign}
              disabled={!vendor || step !== "confirm" || (needsAck && !ack)}
              className={cn(step === "done" && "bg-mint")}
            >
              {step === "done" ? <Check /> : <Wallet />}
              {step === "signing" ? "Waiting for wallet…" : step === "done" ? "Approved" : "Sign & approve"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RejectDialog({
  payment,
  open,
  onOpenChange,
  onDone,
}: {
  payment: PaymentSummary;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; action?: string } | null>(null);
  const presets = ["Not a real invoice from this supplier", "Payment details were changed", "Already paid", "Wrong amount"];

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.reject(payment.id, payment.invoiceId, reason.trim() || "Rejected by owner");
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      setError(toUserError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Reject invoice" description={`${payment.vendorName} · ${payment.invoiceNumber}. Nothing will be paid, and the rejection is recorded on-chain.`}>
        <div className="space-y-3 px-5 py-4">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className={cn("rounded-pill px-2 py-1 text-[12px] hairline", reason === p ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}
              >
                {p}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="label">Reason (stored on-chain, keep it short)</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 120))}
              placeholder="e.g. Supplier confirmed they didn't send this"
              className="mt-1 h-9 w-full rounded-input border border-line bg-surface-1 px-3 text-[13px] text-fg placeholder:text-muted focus:border-fg focus:outline-none"
            />
          </label>
          {error && <p role="alert" className="text-[13px] text-coral">{error.message}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} disabled={busy}>
            {busy ? "Waiting for wallet…" : "Sign & reject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-fg">{children}</dd>
    </div>
  );
}
