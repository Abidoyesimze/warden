"use client";

import { ArrowRight, FileUp } from "lucide-react";
import Link from "next/link";
import { ActivityFeed } from "@/components/activity-feed";
import { Amount } from "@/components/amount";
import { ErrorState } from "@/components/empty-state";
import { LimitMeter } from "@/components/limit-meter";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ProgressLine, Skeleton } from "@/components/ui/skeleton";
import { api, useQuery } from "@/lib/api";
import { formatAmount, fromMicro, toMicro } from "@/lib/format";
import { isBlocked } from "@/lib/status";

export default function DashboardPage() {
  const treasury = useQuery("treasury", () => api.getTreasury());
  const payments = useQuery("payments", () => api.listPayments());

  const list = payments.data ?? [];
  const held = list.filter((p) => p.status === "Held");
  const heldTotal = fromMicro(held.reduce((s, p) => s + toMicro(p.amount), 0n));
  const paid = list.filter((p) => p.status === "Settled").length;
  const stopped = list.filter((p) => p.status === "Rejected" && isBlocked(p.flags)).length + held.filter((p) => p.flags.some((f) => f !== "OVER_AUTO_PAY_LIMIT")).length;
  const t = treasury.data;
  const remaining = t ? fromMicro(toMicro(t.limits.dailyCap) - toMicro(t.limits.spentToday)) : null;

  return (
    <>
      <div className="-mx-4 -mt-6 mb-6 lg:-mx-6">
        <ProgressLine active={treasury.loading || payments.loading} />
      </div>
      <PageHeader
        title="Overview"
        description="Clean invoices are paid automatically. Anything suspicious waits for you."
        actions={
          <Button asChild variant="primary">
            <Link href="/upload">
              <FileUp />
              Upload invoice
            </Link>
          </Button>
        }
      />

      {(treasury.error || payments.error) && (
        <div className="mb-4">
          <ErrorState
            message={(treasury.error ?? payments.error)!.message}
            action={(treasury.error ?? payments.error)!.action}
            onRetry={() => {
              treasury.reload();
              payments.reload();
            }}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardBody className="space-y-6">
            <div>
              <p className="label">Treasury balance</p>
              <div className="mt-2 flex items-baseline gap-3">
                {t ? <Amount value={t.balance} size="xl" /> : <Skeleton className="h-8 w-40" />}
              </div>
              <p className="mt-1 text-[12px] text-muted">
                Held by the treasury contract on NEAR. Only the contract can send it, and only within these limits.
              </p>
            </div>
            <div className="grid gap-5 border-t border-line pt-5 sm:grid-cols-3">
              {t ? (
                <>
                  <LimitMeter
                    label="Spent today"
                    used={t.limits.spentToday}
                    limit={t.limits.dailyCap}
                    hint={`${formatAmount(remaining!)} USDC left of today's cap`}
                  />
                  <LimitMeter label="Auto-pay limit" limit={t.limits.autoPayLimit} hint="Above this, you approve each payment" />
                  <LimitMeter label="Per-payment cap" limit={t.limits.perTxCap} hint="Above this, the contract refuses to pay" />
                </>
              ) : (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-1 w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardBody className="flex flex-1 flex-col">
            <p className="label">Awaiting your review</p>
            {payments.data ? (
              <div className="mt-2 flex items-baseline gap-3">
                <span className={`num text-[28px] tracking-[-0.02em] ${held.length ? "text-amber" : "text-fg"}`}>{held.length}</span>
                <span className="text-[13px] text-muted">
                  {held.length === 1 ? "invoice" : "invoices"} · <span className="num">{formatAmount(heldTotal)}</span> USDC
                </span>
              </div>
            ) : (
              <Skeleton className="mt-2 h-8 w-24" />
            )}
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
              <div>
                <dt className="label">Paid</dt>
                <dd className="num mt-1 text-[18px] text-fg">{payments.data ? paid : "–"}</dd>
              </div>
              <div>
                <dt className="label">Fraud stopped</dt>
                <dd className="num mt-1 text-[18px] text-fg">{payments.data ? stopped : "–"}</dd>
              </div>
            </dl>
            <div className="mt-auto pt-5">
              <Button asChild variant="secondary" className="w-full justify-between">
                <Link href="/review">
                  Open review queue
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Recent activity"
          description="Every decision is recorded on NEAR. Open an invoice to see its proof."
        />
        <ActivityFeed payments={payments.data} loading={payments.loading} limit={12} />
      </Card>
    </>
  );
}
