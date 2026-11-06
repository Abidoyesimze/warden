"use client";

import { motion } from "framer-motion";
import { Hash } from "@/components/hash";
import type { Receipt } from "@/lib/api/types";
import { chainName, chainTxUrl, formatDateTime, nearTxUrl, assetSymbol } from "@/lib/format";

/** Shown on every paid invoice. */
export function OnChainReceipt({ receipt, amount }: { receipt: Receipt; amount: string }) {
  const destChain = receipt.destChain;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-card border border-mint/25 bg-surface-1"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[13px] font-semibold text-fg">On-chain receipt</h2>
        <span className="text-[12px] text-muted">{receipt.settledAt ? formatDateTime(receipt.settledAt) : "Settling…"}</span>
      </div>
      <dl className="grid gap-x-6 gap-y-3 px-4 py-4 text-[13px] sm:grid-cols-2">
        <Row label="Sent from treasury">
          <span className="num">{amount} USDC</span>
          <span className="text-muted"> on NEAR</span>
        </Row>
        <Row label="Supplier received">
          {receipt.amountOut ? (
            <>
              <span className="num">{receipt.amountOut} {assetSymbol(receipt.destAsset)}</span>
              {destChain && <span className="text-muted"> on {chainName(destChain)}</span>}
            </>
          ) : (
            <Pending />
          )}
        </Row>
        <Row label="NEAR transaction">
          {receipt.nearTxHash ? <Hash value={receipt.nearTxHash} href={nearTxUrl(receipt.nearTxHash)} /> : <Pending />}
        </Row>
        <Row label={`${destChain ? chainName(destChain) : "Destination"} transaction`}>
          {receipt.destTxHash && destChain ? <Hash value={receipt.destTxHash} href={chainTxUrl(destChain, receipt.destTxHash)} /> : <Pending />}
        </Row>
        <Row label="Recipient (from registry)">
          {receipt.recipient ? <Hash value={receipt.recipient} head={8} tail={6} /> : <Pending />}
        </Row>
        <Row label="NEAR Intents reference">
          {receipt.intentsRef ? <Hash value={receipt.intentsRef} head={8} tail={6} /> : <Pending />}
        </Row>
      </dl>
    </motion.div>
  );
}

function Pending() {
  return <span className="text-muted">Pending</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="label">{label}</dt>
      <dd className="mt-1 min-w-0 text-fg">{children}</dd>
    </div>
  );
}
