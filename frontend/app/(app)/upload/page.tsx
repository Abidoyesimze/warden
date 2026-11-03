"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileText, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Amount } from "@/components/amount";
import { ErrorState } from "@/components/empty-state";
import { ExtractedFields } from "@/components/extracted-fields";
import { ExtractionProgress } from "@/components/extraction-progress";
import { PageHeader } from "@/components/page-header";
import { RuleChecklist } from "@/components/rule-checklist";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { UploadDropzone } from "@/components/upload-dropzone";
import { api, DEMO_MODE, toUserError } from "@/lib/api";
import { FIXTURE_LIST } from "@/lib/api/demo-data";
import type { ContractStatus, ExtractedInvoice, RuleResult, UploadStage } from "@/lib/api/types";

interface RunState {
  file: string;
  stage: UploadStage | null;
  extracted: Partial<ExtractedInvoice>;
  rules: RuleResult[];
  invoiceId: string | null;
  status: ContractStatus | null;
  error: { message: string; action?: string } | null;
}

const EMPTY: RunState = { file: "", stage: null, extracted: {}, rules: [], invoiceId: null, status: null, error: null };

export default function UploadPage() {
  const [run, setRun] = useState<RunState>(EMPTY);
  const busy = run.stage !== null && run.stage !== "done" && !run.error;

  const start = async (file: File) => {
    setRun({ ...EMPTY, file: file.name, stage: "uploading" });
    try {
      await api.uploadInvoice(file, (e) => {
        if (e.stage === "error") return;
        setRun((r) => ({
          ...r,
          stage: e.stage,
          extracted: e.extracted ? { ...r.extracted, ...e.extracted } : r.extracted,
          rules: e.rules ?? r.rules,
          invoiceId: e.invoiceId ?? r.invoiceId,
          status: e.status ?? r.status,
        }));
      });
    } catch (err) {
      setRun((r) => ({ ...r, error: toUserError(err) }));
    }
  };

  const trySample = (name: string) => start(new File([name], name, { type: "application/pdf" }));

  return (
    <>
      <PageHeader title="Upload invoice" description="Warden reads the invoice privately, runs 10 fraud checks, and asks the treasury contract to pay or hold it." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {run.stage === null ? (
            <UploadDropzone onFile={start} disabled={busy} />
          ) : (
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <FileText className="size-4 text-muted" strokeWidth={1.5} />
                    <span className="num truncate">{run.file}</span>
                  </span>
                }
                action={
                  !busy && (
                    <Button size="sm" variant="ghost" onClick={() => setRun(EMPTY)}>
                      <RotateCcw />
                      Upload another
                    </Button>
                  )
                }
              />
              <CardBody>
                <ExtractionProgress stage={run.stage} failed={!!run.error} />
              </CardBody>
            </Card>
          )}

          {run.error && <ErrorState message={run.error.message} action={run.error.action} onRetry={() => setRun(EMPTY)} />}

          {run.stage === "done" && run.invoiceId && run.status && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
              <ResultCard invoiceId={run.invoiceId} status={run.status} amount={run.extracted.total_amount} flags={run.rules.filter((r) => !r.passed).map((r) => r.flag ?? "")} />
            </motion.div>
          )}

          {DEMO_MODE && (run.stage === null || run.stage === "done" || run.error) && (
            <Card>
              <CardHeader title="Sample invoices" description="Demo mode: pick one of the 13 test invoices instead of uploading a file." />
              <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
                {FIXTURE_LIST.map((f) => (
                  <li key={f.n} className="sm:border-b sm:border-line sm:odd:border-r">
                    <button
                      type="button"
                      onClick={() => trySample(f.file)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="min-w-0">
                        <span className="num block truncate text-[12px] text-fg">{f.file}</span>
                        <span className="block truncate text-[12px] text-muted">{f.vendorName}</span>
                      </span>
                      <Amount value={f.total} size="sm" currency={null} className="text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card className="min-h-[320px]">
          <CardHeader title="What Warden read" description="Fields appear as soon as the private model returns them." />
          <CardBody className="space-y-6">
            {Object.keys(run.extracted).length === 0 ? (
              <p className="text-[13px] text-muted">
                {run.stage ? "Reading the invoice inside a secure enclave…" : "Upload an invoice to see the supplier, amount, due date and invoice number here."}
              </p>
            ) : (
              <ExtractedFields data={run.extracted} />
            )}
            {run.rules.length > 0 || run.stage === "checking" ? (
              <div className="border-t border-line pt-4">
                <p className="label mb-1">Fraud checks</p>
                <RuleChecklist rules={run.rules} compact />
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function ResultCard({ invoiceId, status, amount, flags }: { invoiceId: string; status: ContractStatus; amount?: string; flags: string[] }) {
  const message: Record<string, string> = {
    Approved: "Approved by the treasury contract. Payment is on its way to the supplier's approved address.",
    Held: "Held for your review. Nothing has been paid.",
    Rejected: "Blocked. No money moved, and the attempt is recorded on-chain.",
  };
  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <StatusPill status={status} flags={flags} />
            {amount && <Amount value={amount} />}
          </div>
          <p className="mt-2 text-[13px] text-muted">{message[status] ?? ""}</p>
        </div>
        <Button asChild variant="primary">
          <Link href={`/invoices/${invoiceId}`}>
            Open invoice
            <ArrowRight />
          </Link>
        </Button>
      </CardBody>
    </Card>
  );
}
