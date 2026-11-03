"use client";

import { Wallet } from "lucide-react";
import { Hash } from "@/components/hash";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { api, DEMO_MODE, useQuery } from "@/lib/api";
import { nearAccountUrl } from "@/lib/format";
import { getWallet } from "@/lib/wallet";

export default function SettingsPage() {
  const treasury = useQuery("treasury", () => api.getTreasury());
  const t = treasury.data;
  const account = DEMO_MODE ? t?.ownerId : getWallet().accountId;

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Owner wallet" description="You approve held payments and change limits by signing with this NEAR account." />
          <CardBody className="flex items-center justify-between gap-4">
            {account ? (
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-mint" aria-hidden />
                <Hash value={account} href={nearAccountUrl(account)} full />
              </div>
            ) : (
              <p className="text-[13px] text-muted">No wallet connected.</p>
            )}
            <Button size="sm" disabled={DEMO_MODE} title={DEMO_MODE ? "Wallet is simulated in demo mode" : undefined}>
              <Wallet />
              {account ? "Switch wallet" : "Connect wallet"}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Accounts" description="The roles the treasury contract knows about." />
          <CardBody>
            <dl className="space-y-3 text-[13px]">
              {t &&
                [
                  ["Treasury contract", t.contractId, "Holds USDC and enforces limits"],
                  ["Owner", t.ownerId, "Approves, rejects, changes limits"],
                  ["Agent", t.agentId, "Function-call key: propose, execute, settle only"],
                ].map(([label, id, hint]) => (
                  <div key={label} className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="min-w-0">
                      <Hash value={id!} href={nearAccountUrl(id!)} full />
                      <p className="text-[12px] text-muted">{hint}</p>
                    </dd>
                  </div>
                ))}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Notifications" description="Not available yet." />
          <CardBody>
            <p className="text-[13px] text-muted">Email and Telegram alerts for held invoices are planned after the MVP.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Team" description="Not available yet." />
          <CardBody>
            <p className="text-[13px] text-muted">Warden currently supports one owner per business. Approver roles and multisig approvals are planned.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
