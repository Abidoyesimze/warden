"use client";

import { motion } from "framer-motion";
import { Hash } from "@/components/hash";
import type { Receipt } from "@/lib/api/types";
import { chainName, chainTxUrl, formatDateTime, nearTxUrl } from "@/lib/format";

/** Shown on every paid invoice. */
export function OnChainReceipt({ receipt, amount }: { receipt: Receipt; amount: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-card border border-mint/25 bg-surface-1"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[13px] font-semibold text-fg">On-chain receipt</h2>
        <span className="text-[12px] text-muted">{formatDateTime(receipt.settledAt)}</span>
      </div>
      <dl className="grid gap-x-6 gap-y-3 px-4 py-4 text-[13px] sm:grid-cols-2">
        <Row label="Sent from treasury">
          <span className="num">{amount} USDC</span>
          <span className="text-muted"> on NEAR</span>
        </Row>
        <Row label="Supplier received">
          <span className="num">{receipt.amountOut} {receipt.destAsset}</span>
          <span className="text-muted"> on {chainName(receipt.destChain)}</span>
        </Row>
        <Row label="NEAR transaction">
          <Hash value={receipt.nearTxHash} href={nearTxUrl(receipt.nearTxHash)} />
        </Row>
        <Row label={`${chainName(receipt.destChain)} transaction`}>
          {receipt.destTxHash ? <Hash value={receipt.destTxHash} href={chainTxUrl(receipt.destChain, receipt.destTxHash)} /> : <span className="text-muted">Pending</span>}
        </Row>
        <Row label="Recipient (from registry)">
          <Hash value={receipt.recipient} head={8} tail={6} />
        </Row>
        <Row label="NEAR Intents reference">
          <Hash value={receipt.intentsRef} head={8} tail={6} />
        </Row>
      </dl>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="label">{label}</dt>
      <dd className="mt-1 min-w-0 text-fg">{children}</dd>
    </div>
  );
}
