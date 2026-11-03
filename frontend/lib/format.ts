import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "1.2" -> "1.20". Keeps decimal strings exact (no float maths on money). */
export function formatAmount(amount: string, decimals = 2): string {
  const [whole = "0", frac = ""] = amount.split(".");
  const w = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${w}.${(frac + "0".repeat(decimals)).slice(0, decimals)}`;
}

/** Decimal-string maths in micro-units (USDC has 6 decimals). */
export function toMicro(amount: string): bigint {
  const [w = "0", f = ""] = amount.split(".");
  return BigInt(w) * 1_000_000n + BigInt((f + "000000").slice(0, 6));
}
export function fromMicro(v: bigint): string {
  const neg = v < 0n;
  const a = neg ? -v : v;
  const s = `${a / 1_000_000n}.${(a % 1_000_000n).toString().padStart(6, "0")}`;
  return (neg ? "-" : "") + s.replace(/0{1,4}$/, "");
}

export function ratio(part: string, whole: string): number {
  const w = toMicro(whole);
  if (w === 0n) return 0;
  return Number((toMicro(part) * 10_000n) / w) / 10_000;
}

export function shortHash(h: string, head = 6, tail = 4): string {
  if (h.length <= head + tail + 1) return h;
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" });

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${dateFmt.format(d)} · ${timeFmt.format(d)} UTC`;
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function relativeTime(iso: string, now = Date.now()): string {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

const NETWORK = process.env.NEXT_PUBLIC_NEAR_NETWORK ?? "mainnet";

export function nearTxUrl(hash: string): string {
  return NETWORK === "testnet" ? `https://testnet.nearblocks.io/txns/${hash}` : `https://nearblocks.io/txns/${hash}`;
}
export function nearAccountUrl(id: string): string {
  return NETWORK === "testnet" ? `https://testnet.nearblocks.io/address/${id}` : `https://nearblocks.io/address/${id}`;
}

const CHAIN_EXPLORERS: Record<string, string> = {
  base: "https://basescan.org/tx/",
  eth: "https://etherscan.io/tx/",
  arb: "https://arbiscan.io/tx/",
  pol: "https://polygonscan.com/tx/",
  bsc: "https://bscscan.com/tx/",
  sol: "https://solscan.io/tx/",
  tron: "https://tronscan.org/#/transaction/",
  near: "https://nearblocks.io/txns/",
};
export function chainTxUrl(chain: string, hash: string): string | null {
  const base = CHAIN_EXPLORERS[chain];
  return base ? base + hash : null;
}

export const CHAIN_NAMES: Record<string, string> = {
  base: "Base",
  eth: "Ethereum",
  arb: "Arbitrum",
  pol: "Polygon",
  bsc: "BNB Chain",
  sol: "Solana",
  tron: "Tron",
  near: "NEAR",
  ton: "TON",
};
export function chainName(c: string): string {
  return CHAIN_NAMES[c] ?? c.toUpperCase();
}
