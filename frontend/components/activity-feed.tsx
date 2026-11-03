"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaymentSummary } from "@/lib/api/types";
import { flagLabel } from "@/lib/flags";
import { relativeTime } from "@/lib/format";

export function ActivityFeed({ payments, loading, limit }: { payments?: PaymentSummary[]; loading?: boolean; limit?: number }) {
  if (loading && !payments) {
    return (
      <ul className="divide-y divide-line">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-16" />
            <Skeleton className="h-5 w-20" />
          </li>
        ))}
      </ul>
    );
  }
  if (!payments?.length) {
    return <EmptyState title="No invoices yet." body="Upload your first supplier invoice and Warden will check it before anything is paid." action={{ href: "/upload", label: "Upload invoice" }} />;
  }
  const rows = limit ? payments.slice(0, limit) : payments;
  return (
    <ul className="divide-y divide-line">
      {rows.map((p) => (
        <li key={p.invoiceId}>
          <Link
            href={`/invoices/${p.invoiceId}`}
            className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors duration-150 hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_96px_136px_16px]"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] text-fg">{p.vendorName}</p>
              <p className="truncate text-[12px] text-muted">
                <span className="num">{p.invoiceNumber}</span>
                <span className="mx-1.5">·</span>
                {p.topFlag ? <span className={p.status === "Held" ? "text-amber" : "text-muted"}>{flagLabel(p.topFlag)}</span> : relativeTime(p.createdAt)}
              </p>
            </div>
            <Amount value={p.amount} className="text-right sm:justify-self-end" />
            <div className="col-span-2 sm:col-span-1">
              <StatusPill status={p.status} flags={p.flags} />
            </div>
            <ChevronRight className="hidden size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100 sm:block" strokeWidth={1.5} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
