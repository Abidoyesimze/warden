"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/format";

type Outcome = "paid" | "held" | "blocked";

interface Scenario {
  vendor: string;
  number: string;
  amount: string;
  failed: Partial<Record<number, string>>; // rule index (1-10) -> plain-English flag
  outcome: Outcome;
  reason: string;
  tx: string;
}

const SCENARIOS: Scenario[] = [
  {
    vendor: "Shenzhen Packaging Co.",
    number: "SPK-2026-0418",
    amount: "1.24",
    failed: {},
    outcome: "paid",
    reason: "All 10 checks passed. Paid to the approved address on Base.",
    tx: "8Hx2Qm…k9Tz",
  },
  {
    vendor: "Shenzhen Packaging Co.",
    number: "SPK-2026-0420",
    amount: "1.12",
    failed: { 2: "Payment address changed", 7: "Hidden instructions in invoice" },
    outcome: "held",
    reason: "Invoice asks for 0x7E21…12D9, but the approved address is 0x5C1f…03C7.",
    tx: "3pLw9c…Vd2R",
  },
  {
    vendor: "Shenzhen Packaging Co.",
    number: "SPK-2026-0418",
    amount: "1.26",
    failed: { 4: "Invoice number already used" },
    outcome: "blocked",
    reason: "SPK-2026-0418 was already paid today. A double payment was stopped.",
    tx: "F1rTb7…aQ4m",
  },
];

const PILL: Record<Outcome, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "text-mint bg-mint/10 [box-shadow:inset_0_0_0_1px_rgb(0_229_160/0.3)]" },
  held: { label: "Under review", cls: "text-amber bg-amber/10 [box-shadow:inset_0_0_0_1px_rgb(245_185_66/0.3)]" },
  blocked: { label: "Blocked", cls: "text-coral bg-coral/10 [box-shadow:inset_0_0_0_1px_rgb(255_107_107/0.3)]" },
};

// Timeline of one scenario, in ms
const T_READ = 700;
const T_RULE = 140;
const T_RULES_DONE = T_READ + 10 * T_RULE + 250;
const T_DECIDED = T_RULES_DONE + 450;
const T_NEXT = T_DECIDED + 2600;

/** Hero animation: invoices flow through Warden and come out Paid, Under review or Blocked. */
export function DecisionDemo() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(reduce ? 1 : 0);
  const [t, setT] = useState(reduce ? T_NEXT : 0);

  useEffect(() => {
    if (reduce) return;
    const start = Date.now();
    setT(0);
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= T_NEXT) {
        clearInterval(timer);
        setI((x) => (x + 1) % SCENARIOS.length);
        return;
      }
      setT(elapsed);
    }, 50);
    return () => clearInterval(timer);
  }, [i, reduce]);

  const s = SCENARIOS[i]!;
  const rulesShown = Math.max(0, Math.min(10, Math.floor((t - T_READ) / T_RULE)));
  const reading = t < T_READ;
  const decided = t >= T_DECIDED;
  const firstFail = Object.entries(s.failed)[0];

  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-surface-1 shadow-[0_32px_80px_rgb(0_0_0/0.45)]">
      {/* window bar */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="num text-[11px] text-muted">
          <span className="text-mint/80">●</span> warden · live decision
        </span>
        <span className="num text-[11px] text-muted">
          {i + 1}/{SCENARIOS.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="p-5"
        >
          {/* invoice header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="label">Incoming invoice</p>
              <p className="mt-1 truncate text-[15px] font-medium text-fg">{s.vendor}</p>
              <p className="num text-[12px] text-muted">{s.number}</p>
            </div>
            <p className="num text-[22px] tracking-[-0.02em] text-fg">
              {s.amount}
              <span className="ml-1 text-[12px] text-muted">USDC</span>
            </p>
          </div>

          {/* stage line */}
          <div className="mt-5 flex items-center gap-2 text-[12px]">
            <span className={cn("size-1.5 rounded-full", reading ? "animate-pulse bg-fg" : "bg-mint")} />
            <span className={reading ? "text-fg" : "text-muted"}>
              {reading ? "Reading privately inside a TEE…" : "Read privately · attestation stored"}
            </span>
          </div>

          {/* rules */}
          <div className="mt-4 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {Array.from({ length: 10 }).map((_, k) => {
              const n = k + 1;
              const shown = n <= rulesShown;
              const fail = s.failed[n];
              return (
                <div
                  key={n}
                  className={cn(
                    "flex h-9 flex-col items-center justify-center rounded-[3px] border text-[10px] transition-colors duration-200",
                    !shown && "border-dashed border-line text-muted/60",
                    shown && !fail && "border-line bg-surface-2 text-muted",
                    shown && fail && (s.outcome === "blocked" ? "border-coral/50 bg-coral/10 text-coral" : "border-amber/50 bg-amber/10 text-amber"),
                  )}
                >
                  <span className="num">R{n}</span>
                  {shown && (fail ? <X className="size-3" strokeWidth={2} /> : <Check className="size-3" strokeWidth={2} />)}
                </div>
              );
            })}
          </div>
          <div className="mt-2 h-5 text-[12px]">
            {rulesShown >= 10 && firstFail ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={s.outcome === "blocked" ? "text-coral" : "text-amber"}>
                {Object.values(s.failed).join(" · ")}
              </motion.p>
            ) : rulesShown >= 10 ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted">
                No red flags · within your limits
              </motion.p>
            ) : (
              <p className="text-muted">{rulesShown > 0 ? `Checking rule ${Math.min(rulesShown + 1, 10)} of 10…` : " "}</p>
            )}
          </div>

          {/* decision */}
          <div className="mt-4 min-h-[92px] border-t border-line pt-4">
            {decided && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
                <div className="flex items-center gap-3">
                  <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-pill px-2 text-[12px] font-medium", PILL[s.outcome].cls)}>
                    {s.outcome === "paid" ? <Check className="size-3" strokeWidth={2} /> : <span className="size-1.5 rounded-full bg-current" />}
                    {PILL[s.outcome].label}
                  </span>
                  <span className="text-[12px] text-muted">{s.outcome === "paid" ? "via NEAR Intents" : "No money moved"}</span>
                </div>
                <p className="mt-2 text-[13px] text-fg/85">{s.reason}</p>
                <p className="num mt-2 text-[11px] text-muted">
                  recorded on NEAR · tx {s.tx} ↗
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* progress bar for the loop */}
      {!reduce && (
        <div className="h-px bg-line">
          <div className="h-full bg-fg/40" style={{ width: `${(t / T_NEXT) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
