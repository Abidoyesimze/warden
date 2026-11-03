"use client";

import { motion } from "framer-motion";
import { Check, Info, X } from "lucide-react";
import type { PolicyCheck, RuleResult } from "@/lib/api/types";
import { flagLabel, RULE_IDS, RULE_TITLES } from "@/lib/flags";
import { cn } from "@/lib/format";

const POLICY_TITLES: Record<PolicyCheck["id"], string> = {
  REGISTRY: "Approved supplier on-chain",
  AUTO_PAY_LIMIT: "Within auto-pay limit",
  VENDOR_MAX: "Within supplier maximum",
  PER_TX_CAP: "Within per-payment cap",
  DAILY_CAP: "Within today's cap",
};

function Mark({ state }: { state: "pass" | "hold" | "block" | "pending" | "info" }) {
  const cls = {
    pass: "border-line text-muted",
    hold: "border-amber/50 bg-amber/10 text-amber",
    block: "border-coral/60 bg-coral/10 text-coral",
    info: "border-line text-muted",
    pending: "border-line border-dashed text-transparent",
  }[state];
  return (
    <span className={cn("mt-px flex size-[18px] shrink-0 items-center justify-center rounded-[3px] border", cls)} aria-hidden>
      {state === "pass" && <Check className="size-3" strokeWidth={2} />}
      {(state === "hold" || state === "block") && <X className="size-3" strokeWidth={2} />}
      {state === "info" && <Info className="size-3" strokeWidth={2} />}
    </span>
  );
}

/** R1–R10, each pass/fail with its plain-English reason. Pending rows show while checks stream in. */
export function RuleChecklist({ rules, policy, compact = false }: { rules: RuleResult[]; policy?: PolicyCheck[]; compact?: boolean }) {
  const byId = new Map(rules.map((r) => [r.id, r]));
  const failed = rules.filter((r) => !r.passed).length;
  return (
    <div>
      <ul className="divide-y divide-line">
        {RULE_IDS.map((id) => {
          const r = byId.get(id);
          const state = !r ? "pending" : r.passed ? "pass" : r.severity === "BLOCK" ? "block" : r.severity === "INFO" ? "info" : "hold";
          return (
            <motion.li
              key={id}
              layout="position"
              className={cn("flex gap-3", compact ? "py-1.5" : "py-2.5", state === "pending" && "opacity-50")}
            >
              <Mark state={state} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="num text-[11px] text-muted">{id}</span>
                  <span className={cn("text-[13px]", state === "pass" || state === "pending" ? "text-fg" : state === "block" ? "text-coral" : "text-amber")}>
                    {r && !r.passed && r.flag ? flagLabel(r.flag) : RULE_TITLES[id]}
                  </span>
                  {r && !r.passed && r.flag && <span className="num text-[11px] text-muted">{r.flag}</span>}
                </div>
                {r && !compact && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("mt-0.5 text-[12px]", r.passed ? "text-muted" : "text-fg/85")}>
                    {r.reason}
                  </motion.p>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
      {compact && rules.length === RULE_IDS.length && (
        <p className="mt-2 text-[12px] text-muted">
          {failed === 0 ? "All 10 checks passed." : `${failed} of 10 checks raised a flag.`}
        </p>
      )}
      {policy && policy.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="label mb-1">Treasury contract limits</p>
          <ul className="divide-y divide-line">
            {policy.map((p) => (
              <li key={p.id} className="flex gap-3 py-2.5">
                <Mark state={p.passed ? "pass" : "hold"} />
                <div className="min-w-0">
                  <p className={cn("text-[13px]", p.passed ? "text-fg" : "text-amber")}>{POLICY_TITLES[p.id]}</p>
                  <p className="mt-0.5 text-[12px] text-muted">{p.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
