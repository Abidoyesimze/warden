"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { ActivityFeed } from "@/components/activity-feed";
import { Amount } from "@/components/amount";
import { ErrorState } from "@/components/empty-state";
import { Hash } from "@/components/hash";
import { LimitMeter } from "@/components/limit-meter";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, DEMO_MODE, toUserError, useQuery } from "@/lib/api";
import type { Limits } from "@/lib/api/types";
import { chainName, formatAmount, nearAccountUrl } from "@/lib/format";

export default function TreasuryPage() {
  const treasury = useQuery("treasury", () => api.getTreasury());
  const payments = useQuery("payments", () => api.listPayments());
  const [editing, setEditing] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [error, setError] = useState<{ message: string; action?: string } | null>(null);
  const t = treasury.data;

  const togglePause = async (paused: boolean) => {
    setPausing(true);
    setError(null);
    try {
      await api.setPaused(paused);
    } catch (e) {
      setError(toUserError(e));
    } finally {
      setPausing(false);
    }
  };

  return (
    <>
      <PageHeader title="Treasury & limits" description="The treasury contract holds your USDC and enforces these limits on every payment, even if Warden's server is compromised." />
      {(treasury.error || error) && (
        <div className="mb-4">
          <ErrorState message={(error ?? treasury.error)!.message} action={(error ?? treasury.error)!.action} onRetry={treasury.error ? treasury.reload : undefined} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Limits"
            description="Changes are signed with your wallet and applied by the contract."
            action={
              <Button size="sm" onClick={() => setEditing(true)} disabled={!t}>
                <Pencil />
                Edit limits
              </Button>
            }
          />
          <CardBody className="grid gap-5 sm:grid-cols-3">
            {t ? (
              <>
                <LimitMeter label="Spent today" used={t.limits.spentToday} limit={t.limits.dailyCap} hint="Daily cap resets at 00:00 UTC" />
                <LimitMeter label="Auto-pay limit" limit={t.limits.autoPayLimit} hint="Above this, you approve" />
                <LimitMeter label="Per-payment cap" limit={t.limits.perTxCap} hint="Above this, always refused" />
              </>
            ) : (
              <Skeleton className="h-16 w-full sm:col-span-3" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div>
              <p className="label">Balance</p>
              <div className="mt-2">{t ? <Amount value={t.balance} size="xl" /> : <Skeleton className="h-8 w-32" />}</div>
            </div>
            {t && (
              <dl className="space-y-1.5 text-[12px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Contract</dt>
                  <dd>
                    <Hash value={t.contractId} href={nearAccountUrl(t.contractId)} full />
                  </dd>
                </div>
              </dl>
            )}
            <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
              <div>
                <p className="text-[13px] font-medium text-fg">Pause all payments</p>
                <p className="text-[12px] text-muted">Kill switch. The contract refuses every payment until you unpause.</p>
              </div>
              <Switch checked={!!t?.paused} disabled={!t || pausing} onCheckedChange={togglePause} aria-label="Pause all payments" />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Approved suppliers" description="Warden only ever pays these addresses. Addresses written on invoices are never used." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left">
                {["Supplier", "Paid in", "Payout address", "Max per invoice", "Status"].map((h) => (
                  <th key={h} className="label px-4 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t?.vendors.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-fg">{v.name}</p>
                    <p className="num text-[11px] text-muted">{v.id}</p>
                  </td>
                  <td className="px-4 py-3 text-fg">
                    {v.destAsset} <span className="text-muted">on {chainName(v.destChain)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Hash value={v.destAddress} head={8} tail={6} />
                  </td>
                  <td className="px-4 py-3">
                    <Amount value={v.maxAmount} />
                  </td>
                  <td className="px-4 py-3 text-[12px]">{v.active ? <span className="text-fg">Active</span> : <span className="text-muted">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2.5 text-[12px] text-muted">
          Adding or changing a supplier is done by the owner on the contract{DEMO_MODE ? " (via script in this demo)" : ""}. Always confirm new payout details by phone.
        </p>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Payment history" description="Every payment with its on-chain proof." />
        <ActivityFeed payments={payments.data} loading={payments.loading} />
      </Card>

      {t && <LimitsDialog open={editing} onOpenChange={setEditing} limits={t.limits} />}
    </>
  );
}

function LimitsDialog({ open, onOpenChange, limits }: { open: boolean; onOpenChange: (o: boolean) => void; limits: Limits }) {
  const [form, setForm] = useState({ autoPayLimit: limits.autoPayLimit, perTxCap: limits.perTxCap, dailyCap: limits.dailyCap });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = Object.values(form).every((v) => /^\d+(\.\d{1,6})?$/.test(v));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.setLimits(form);
      onOpenChange(false);
    } catch (e) {
      setError(toUserError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const fields: { key: keyof typeof form; label: string; hint: string }[] = [
    { key: "autoPayLimit", label: "Auto-pay limit", hint: "Clean invoices up to this amount are paid without asking you." },
    { key: "perTxCap", label: "Per-payment cap", hint: "The contract refuses any single payment above this." },
    { key: "dailyCap", label: "Daily cap", hint: "Total the contract will send in one day." },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Edit limits" description="Signed with your wallet: set_limits on the treasury contract.">
        <div className="space-y-4 px-5 py-4">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-[13px] text-fg">{f.label}</span>
              <div className="mt-1 flex items-center rounded-input border border-line bg-surface-1 focus-within:border-fg">
                <input
                  inputMode="decimal"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value.trim() })}
                  className="num h-9 flex-1 bg-transparent px-3 text-[13px] text-fg focus:outline-none"
                />
                <span className="px-3 text-[12px] text-muted">USDC</span>
              </div>
              <span className="mt-1 block text-[12px] text-muted">
                {f.hint} Now {formatAmount(limits[f.key])}.
              </span>
            </label>
          ))}
          {error && <p role="alert" className="text-[13px] text-coral">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={busy || !valid}>
            {busy ? "Waiting for wallet…" : "Sign & save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
