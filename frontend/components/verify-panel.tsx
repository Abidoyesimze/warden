"use client";

import { Check, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Hash } from "@/components/hash";
import { Button } from "@/components/ui/button";
import { api, toUserError } from "@/lib/api";
import type { VerifyResult } from "@/lib/api/types";
import { cn } from "@/lib/format";

/** Recomputes the invoice and attestation hashes and compares them to the on-chain record. */
export function VerifyPanel({ invoiceId }: { invoiceId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setState("busy");
    setError(null);
    try {
      setResult(await api.verify(invoiceId));
      setState("done");
    } catch (e) {
      setError(toUserError(e).message);
      setState("idle");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-muted">Recompute both hashes from the stored file and evidence, and compare them with what the contract recorded.</p>
        <Button size="sm" onClick={run} disabled={state === "busy"}>
          <ShieldCheck />
          {state === "busy" ? "Verifying…" : state === "done" ? "Verify again" : "Verify"}
        </Button>
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] text-coral">{error}</p>}
      {result && (
        <ul className="mt-3 space-y-2">
          <Row label="Invoice file hash" r={result.invoiceHash} />
          <Row label="Attestation hash" r={result.attestationHash} />
        </ul>
      )}
    </div>
  );
}

function Row({ label, r }: { label: string; r: VerifyResult["invoiceHash"] }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-input bg-surface-2 px-3 py-2 text-[12px]">
      <span className={cn("flex items-center gap-1 font-medium", r.match ? "text-mint" : "text-coral")}>
        {r.match ? <Check className="size-3.5" strokeWidth={2} /> : <X className="size-3.5" strokeWidth={2} />}
        {r.match ? "Match" : "Mismatch"}
      </span>
      <span className="text-fg">{label}</span>
      <span className="ml-auto flex items-center gap-2 text-muted">
        stored <Hash value={r.stored} /> on-chain <Hash value={r.onChain} />
      </span>
    </li>
  );
}
