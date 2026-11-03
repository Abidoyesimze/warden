"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApproveDialog, RejectDialog } from "@/components/approve-dialog";
import { Amount } from "@/components/amount";
import { Button } from "@/components/ui/button";
import type { PaymentSummary, Vendor } from "@/lib/api/types";
import { flagLabel } from "@/lib/flags";
import { relativeTime } from "@/lib/format";

/** Answers in under 10 seconds: who, how much, the top red flag, and what to do. */
export function ReviewCard({ payment, vendor }: { payment: PaymentSummary; vendor: Vendor | null }) {
  const [approve, setApprove] = useState(false);
  const [reject, setReject] = useState(false);
  const extra = payment.flags.length - 1;
  return (
    <article className="grid gap-4 rounded-card border border-line bg-surface-1 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="truncate text-[14px] font-medium text-fg">{payment.vendorName}</h3>
          <Amount value={payment.amount} />
          <span className="text-[12px] text-muted">
            <span className="num">{payment.invoiceNumber}</span> · {relativeTime(payment.createdAt)}
          </span>
        </div>
        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-amber">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
          <span>
            {payment.topFlag ? flagLabel(payment.topFlag) : "Held by the treasury contract"}
            {extra > 0 && <span className="text-muted"> +{extra} more</span>}
          </span>
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/invoices/${payment.invoiceId}`}>Open</Link>
        </Button>
        <Button size="sm" variant="danger" onClick={() => setReject(true)}>
          Reject
        </Button>
        <Button size="sm" variant="approve" onClick={() => setApprove(true)}>
          Approve
        </Button>
      </div>
      <ApproveDialog payment={payment} vendor={vendor} open={approve} onOpenChange={setApprove} />
      <RejectDialog payment={payment} open={reject} onOpenChange={setReject} />
    </article>
  );
}
