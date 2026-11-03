"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn, shortHash } from "@/lib/format";

/** Shortened hash/address with copy and optional explorer link. */
export function Hash({
  value,
  href,
  head = 6,
  tail = 4,
  className,
  full = false,
}: {
  value: string;
  href?: string | null;
  head?: number;
  tail?: number;
  className?: string;
  full?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(value).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <span className={cn("group inline-flex min-w-0 items-center gap-1", className)}>
      <span className={cn("num text-[12px] text-fg/90", full && "break-all")} title={value}>
        {full ? value : shortHash(value, head, tail)}
      </span>
      <button
        type="button"
        onClick={copy}
        className="rounded-[3px] p-0.5 text-muted opacity-70 hover:bg-surface-3 hover:text-fg group-hover:opacity-100"
        aria-label={copied ? "Copied" : "Copy"}
      >
        {copied ? <Check className="size-3 text-mint" strokeWidth={1.5} /> : <Copy className="size-3" strokeWidth={1.5} />}
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="rounded-[3px] p-0.5 text-muted opacity-70 hover:bg-surface-3 hover:text-fg group-hover:opacity-100"
          aria-label="Open in explorer"
        >
          <ExternalLink className="size-3" strokeWidth={1.5} />
        </a>
      )}
    </span>
  );
}
