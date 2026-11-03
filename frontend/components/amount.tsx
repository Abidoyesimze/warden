import { cn, formatAmount } from "@/lib/format";

export function Amount({
  value,
  currency = "USDC",
  className,
  size = "md",
}: {
  value: string;
  currency?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = { sm: "text-[12px]", md: "text-[13px]", lg: "text-[18px]", xl: "text-[28px] tracking-[-0.02em]" };
  return (
    <span className={cn("num whitespace-nowrap text-fg", sizes[size], className)}>
      {formatAmount(value)}
      {currency && <span className="ml-1 text-[0.75em] text-muted">{currency}</span>}
    </span>
  );
}
