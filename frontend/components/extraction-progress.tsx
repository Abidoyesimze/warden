"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { UploadStage } from "@/lib/api/types";
import { cn } from "@/lib/format";

const STAGES: { key: Exclude<UploadStage, "done">; label: string; detail: string }[] = [
  { key: "uploading", label: "Uploading", detail: "Fingerprinting the file (SHA-256)" },
  { key: "reading", label: "Reading privately (TEE)", detail: "NEAR AI Cloud extracts the fields inside a secure enclave" },
  { key: "checking", label: "Checking 10 rules", detail: "Fixed fraud rules. The AI does not decide" },
  { key: "submitting", label: "Submitting to treasury", detail: "The contract re-checks limits and records the decision" },
];

const ORDER: UploadStage[] = ["uploading", "reading", "checking", "submitting", "done"];

export function ExtractionProgress({ stage, failed }: { stage: UploadStage | null; failed?: boolean }) {
  const current = stage ? ORDER.indexOf(stage) : -1;
  return (
    <ol className="space-y-0">
      {STAGES.map((s, i) => {
        const done = current > i;
        const active = current === i;
        const error = failed && active;
        return (
          <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
            {i < STAGES.length - 1 && (
              <span className={cn("absolute left-[9px] top-6 h-[calc(100%-20px)] w-px", done ? "bg-mint/50" : "bg-line")} aria-hidden />
            )}
            <span
              className={cn(
                "relative mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full border text-[10px]",
                done && "border-mint/60 bg-mint/10 text-mint",
                active && !error && "border-fg text-fg",
                error && "border-coral bg-coral/10 text-coral",
                !done && !active && "border-line text-muted",
              )}
            >
              {done ? (
                <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18 }}>
                  <Check className="size-3" strokeWidth={2} />
                </motion.span>
              ) : error ? (
                <X className="size-3" strokeWidth={2} />
              ) : active ? (
                <span className="size-1.5 animate-pulse rounded-full bg-fg motion-reduce:animate-none" />
              ) : (
                <span className="num">{i + 1}</span>
              )}
            </span>
            <div className="min-w-0">
              <p className={cn("text-[13px]", done || active ? "text-fg" : "text-muted")}>{s.label}</p>
              <p className="text-[12px] text-muted">{s.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
