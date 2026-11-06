"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ChainEvent } from "@/lib/api/types";
import { cn, formatDate, formatTime, nearTxUrl, shortHash } from "@/lib/format";

const TONE: Record<string, string> = {
  payment_held: "text-amber",
  payment_rejected: "text-coral",
  payment_settled: "text-mint",
  payment_approved: "text-fg",
  quote_rejected: "text-coral",
};

/** Terminal-style log of every on-chain event for this payment, with explorer links. */
export function DecisionLog({ events, paymentId, contractId }: { events: ChainEvent[]; paymentId: number; contractId: string }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-[#0b0d10]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="num text-[11px] text-muted">
          <span className="text-mint/80">$</span> warden log --payment {paymentId} --contract {contractId}
        </span>
        <span className="num text-[11px] text-muted">{events.length} events</span>
      </div>
      <ol className="num overflow-x-auto px-4 py-3 text-[12px] leading-[1.9]">
        <AnimatePresence initial={false}>
          {events.map((e, i) => (
            <motion.li
              key={`${e.name}-${e.txHash ?? e.at}-${i}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="grid min-w-[620px] grid-cols-[150px_150px_minmax(0,1fr)_110px] gap-3 whitespace-nowrap"
            >
              <span className="text-muted" title={e.at}>
                {i === 0 || formatDate(e.at) !== formatDate(events[i - 1]!.at) ? `${formatDate(e.at)} ` : ""}
                <span className="text-fg/70">{formatTime(e.at)}</span>
              </span>
              <span className={cn(TONE[e.name] ?? "text-fg/80")}>{e.name}</span>
              <span className="truncate text-muted">
                {e.actor}
                {e.detail && <span className="text-fg/60"> · {e.detail}</span>}
              </span>
              {e.txHash ? (
                <a href={nearTxUrl(e.txHash)} target="_blank" rel="noreferrer" className="text-right text-fg/70 underline decoration-line underline-offset-2 hover:text-fg">
                  {shortHash(e.txHash, 5, 4)} ↗
                </a>
              ) : (
                <span className="text-right text-muted">off-chain</span>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
        <li className="mt-1 h-4 w-2 animate-pulse bg-fg/40 motion-reduce:animate-none" aria-hidden />
      </ol>
    </div>
  );
}
