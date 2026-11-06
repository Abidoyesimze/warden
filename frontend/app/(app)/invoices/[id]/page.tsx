"use client";

import { ArrowLeft, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ApproveDialog, RejectDialog } from "@/components/approve-dialog";
import { Amount } from "@/components/amount";
import { AttestationBadge } from "@/components/attestation-badge";
import { DecisionLog } from "@/components/decision-log";
import { ErrorState } from "@/components/empty-state";
import { ExtractedFields } from "@/components/extracted-fields";
import { Hash } from "@/components/hash";
import { InvoicePreview } from "@/components/invoice-preview";
import { OnChainReceipt } from "@/components/onchain-receipt";
import { ReasoningSummary } from "@/components/reasoning-summary";
import { RiskBanner } from "@/components/risk-banner";
import { RuleChecklist } from "@/components/rule-checklist";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ProgressLine, Skeleton } from "@/components/ui/skeleton";
import { VerifyPanel } from "@/components/verify-panel";
import { api, useQuery } from "@/lib/api";
import type { InvoiceDetail } from "@/lib/api/types";
import { chainName, formatDateTime } from "@/lib/format";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const inv = useQuery(`invoice:${id}`, () => api.getInvoice(id));
  const treasury = useQuery("treasury", () => api.getTreasury());

  if (inv.error && !inv.data) {
    return (
      <>
        <BackLink />
        <ErrorState message={inv.error.message} action={inv.error.action} onRetry={inv.reload} />
      </>
    );
  }
  if (!inv.data) return <DetailSkeleton />;
  return <Detail invoice={inv.data} contractId={treasury.data?.contractId ?? ""} />;
}

function BackLink() {
  return (
    <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-fg">
      <ArrowLeft className="size-3.5" strokeWidth={1.5} />
      Overview
    </Link>
  );
}

function Detail({ invoice, contractId }: { invoice: InvoiceDetail; contractId: string }) {
  const [approve, setApprove] = useState(false);
  const [reject, setReject] = useState(false);
  const p = invoice.payment;
  const held = p.status === "Held";

  return (
    <>
      <BackLink />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[22px] font-semibold tracking-[-0.025em] text-fg">{p.vendorName}</h1>
            <StatusPill status={p.status} flags={p.flags} showContract />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
            <Amount value={p.amount} size="lg" />
            <span>
              Invoice <span className="num text-fg/80">{p.invoiceNumber}</span>
            </span>
            <span>
              Payment <span className="num text-fg/80">#{p.id}</span>
            </span>
            <span>Received {formatDateTime(p.createdAt)}</span>
            <AttestationBadge attestation={invoice.attestation} />
          </div>
        </div>
        {held && (
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => setReject(true)}>
              Reject
            </Button>
            <Button variant="approve" onClick={() => setApprove(true)}>
              <Wallet />
              Approve &amp; pay
            </Button>
          </div>
        )}
      </header>

      <div className="space-y-4">
        <RiskBanner invoice={invoice} />

        {invoice.receipt && <OnChainReceipt receipt={invoice.receipt} amount={p.amount} />}

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader
              title="Original invoice"
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <span className="num">{invoice.fileName}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    SHA-256 <Hash value={invoice.invoiceHash} />
                  </span>
                </span>
              }
            />
            <CardBody>
              <InvoicePreview invoice={invoice} />
            </CardBody>
          </Card>
          <Card className="min-w-0">
            <CardHeader title="What Warden read" description="Extracted privately on NEAR AI Cloud. The model only reads; it never decides." />
            <CardBody>
              <ExtractedFields data={invoice.extracted} vendor={invoice.vendor} full />
              {invoice.vendor && (
                <div className="mt-5 rounded-input border border-line bg-surface-2 px-3 py-2.5">
                  <p className="label">Warden will pay (from your approved list)</p>
                  <p className="mt-1 text-[13px] text-fg">
                    {invoice.vendor.destAsset} on {chainName(invoice.vendor.destChain)} ·{" "}
                    <Hash value={invoice.vendor.destAddress} head={8} tail={6} />
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card>
            <CardHeader title="Fraud checks" description="Ten fixed rules, then the treasury contract's own limits." />
            <CardBody className="pt-1">
              <RuleChecklist rules={invoice.rules} policy={invoice.policy} />
            </CardBody>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader title="Summary" />
              <CardBody>
                <ReasoningSummary summary={invoice.summary} />
              </CardBody>
            </Card>
            <Card id="attestation" className="scroll-mt-20">
              <CardHeader title="Private inference evidence" description="Proof the invoice was read inside a secure enclave (TEE)." />
              <CardBody>
                <dl className="space-y-2.5 text-[12px]">
                  <Evidence label="Model">
                    <span className="num text-fg">{invoice.attestation.model}</span>
                  </Evidence>
                  <Evidence label="Chat ID">
                    <Hash value={invoice.attestation.chatId} head={14} tail={4} />
                  </Evidence>
                  <Evidence label="Enclave signer">
                    {invoice.attestation.signingAddress ? <Hash value={invoice.attestation.signingAddress} head={8} tail={6} /> : <span className="text-muted">Not reported</span>}
                  </Evidence>
                  <Evidence label="Attestation hash">
                    <Hash value={invoice.attestation.hash} head={8} tail={6} />
                  </Evidence>
                  <Evidence label="Checked">
                    <span className="text-fg">{formatDateTime(invoice.attestation.checkedAt)}</span>
                  </Evidence>
                </dl>
                <p className="mt-3 text-[11px] text-muted">
                  Re-check it yourself: <span className="num">npx tsx scripts/verify-attestation.ts {invoice.id}</span>
                </p>
              </CardBody>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader title="Decision log" description="Every on-chain event for this payment. Anyone can rebuild this from NEAR." />
          <CardBody className="space-y-4">
            <DecisionLog events={invoice.events} paymentId={p.id} contractId={contractId} />
            <VerifyPanel invoiceId={invoice.id} />
          </CardBody>
        </Card>
      </div>

      <ApproveDialog payment={p} vendor={invoice.vendor} open={approve} onOpenChange={setApprove} />
      <RejectDialog payment={p} open={reject} onOpenChange={setReject} />
    </>
  );
}

function Evidence({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="-mx-4 -mt-6 mb-6 lg:-mx-6">
        <ProgressLine />
      </div>
      <Skeleton className="mb-4 h-3 w-20" />
      <Skeleton className="h-6 w-72" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <Skeleton className="mt-6 h-16 w-full" />
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[420px] w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    </>
  );
}
