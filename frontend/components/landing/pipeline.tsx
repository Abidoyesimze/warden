"use client";

import { motion } from "framer-motion";
import { Cpu, FileUp, Landmark, ListChecks, ScrollText, Send } from "lucide-react";

const STEPS = [
  { icon: FileUp, title: "Upload", body: "Drop in a PDF invoice. Warden fingerprints the file so it can never be paid twice." },
  { icon: Cpu, title: "Read privately", body: "NEAR AI Cloud extracts the fields inside a secure enclave (TEE) and returns proof of where it ran." },
  { icon: ListChecks, title: "Check 10 rules", body: "Fixed rules look for changed payment details, fake suppliers, duplicates and hidden instructions." },
  { icon: Landmark, title: "Contract decides", body: "The treasury contract re-checks every limit. It only pays suppliers on your approved list." },
  { icon: Send, title: "Pay or hold", body: "Clean invoices are paid through NEAR Intents to the supplier's chosen stablecoin and chain." },
  { icon: ScrollText, title: "Logged on-chain", body: "Every decision, including blocked attacks, is recorded on NEAR for anyone to audit." },
];

export function Pipeline() {
  return (
    <div className="relative">
      {/* connector with a travelling pulse (desktop) */}
      <div className="absolute left-0 right-0 top-[19px] hidden h-px bg-line lg:block" aria-hidden>
        <div className="pipeline-pulse absolute top-[-1px] h-[3px] w-24 bg-gradient-to-r from-transparent via-mint/70 to-transparent" />
      </div>
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <motion.li
            key={title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <span className="relative z-10 flex size-10 items-center justify-center rounded-card border border-line bg-surface-1">
              <Icon className="size-[18px] text-fg" strokeWidth={1.5} />
            </span>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="num text-[11px] text-muted">0{i + 1}</span>
              <span className="text-[14px] font-medium text-fg">{title}</span>
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
