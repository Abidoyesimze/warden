export function toNumber(decimal: string): number {
  const n = Number.parseFloat(decimal);
  return Number.isFinite(n) ? n : 0;
}

export function sumAmounts(amounts: string[]): number {
  return amounts.reduce((total, a) => total + toNumber(a), 0);
}

export function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return ms / (24 * 60 * 60 * 1000);
}

export function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(ltd|limited|inc|llc|co|corp|company)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAddress(address: string): string {
  return address.startsWith("0x") ? address.toLowerCase() : address;
}

// Levenshtein edit distance, used for lookalike vendor-name detection.
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
    }
  }
  return d[rows - 1]![cols - 1]!;
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function isFuture(dateStr: string, now: Date): boolean {
  return new Date(dateStr).getTime() > now.getTime();
}
