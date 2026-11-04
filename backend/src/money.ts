// USDC has 6 decimals on NEAR. The contract stores raw smallest-unit u128
// strings; the API (docs/api.md) always speaks in human decimal strings
// ("1.20"). Converted with bigint, never floats, to avoid rounding money.
export const USDC_DECIMALS = 6;

export function rawToDecimal(raw: string, decimals = USDC_DECIMALS): string {
  const n = BigInt(raw);
  const scale = 10n ** BigInt(decimals);
  const whole = n / scale;
  const frac = (n % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : whole.toString();
}

export function decimalToRaw(decimal: string, decimals = USDC_DECIMALS): string {
  const [whole, frac = ""] = decimal.trim().split(".");
  const paddedFrac = frac.slice(0, decimals).padEnd(decimals, "0");
  const raw = BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(paddedFrac || "0");
  return raw.toString();
}
