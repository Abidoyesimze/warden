"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ContractStatus } from "@/lib/api/types";
import { cn } from "@/lib/format";
import { ownerStatus, processingStep } from "@/lib/status";

const TONE: Record<string, string> = {
  mint: "text-mint bg-mint/10 [box-shadow:inset_0_0_0_1px_rgb(0_229_160/0.28)]",
  neutral: "text-fg bg-surface-3 [box-shadow:inset_0_0_0_1px_var(--border-strong)]",
  amber: "text-amber bg-amber/10 [box-shadow:inset_0_0_0_1px_rgb(245_185_66/0.28)]",
  coral: "text-coral bg-coral/10 [box-shadow:inset_0_0_0_1px_rgb(255_107_107/0.28)]",
  muted: "text-muted bg-surface-2 [box-shadow:inset_0_0_0_1px_var(--border)]",
};

export function StatusPill({
  status,
  flags = [],
  className,
  showContract = false,
}: {
  status: ContractStatus;
  flags?: string[];
  className?: string;
  /** Show the raw contract status as secondary text */
  showContract?: boolean;
}) {
  const v = ownerStatus(status, flags);
  return (
    <span className="inline-flex items-center gap-2">
      <motion.span
        layout
        className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-pill px-2 text-[12px] font-medium", TONE[v.tone], className)}
      >
        <AnimatePresence mode="wait" initial={false}>
          {v.key === "paid" ? (
            <motion.svg
              key="check"
              viewBox="0 0 12 12"
              className="size-3"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              aria-hidden
            >
              <motion.path
                d="m2.5 6.2 2.3 2.3 4.7-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            </motion.svg>
          ) : v.key === "processing" ? (
            <ProcessingDots key="proc" step={processingStep(status)} />
          ) : (
            <span key="dot" className="size-1.5 rounded-full bg-current" aria-hidden />
          )}
        </AnimatePresence>
        {v.label}
      </motion.span>
      {showContract && <span className="num text-[11px] text-muted">{status}</span>}
    </span>
  );
}

/** Three-step indicator: Approved → Sending → Sent */
function ProcessingDots({ step }: { step: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn("h-1.5 w-1 rounded-[1px] transition-colors duration-200", i <= step ? "bg-fg" : "bg-[var(--border-strong)]")}
        />
      ))}
    </span>
  );
}
