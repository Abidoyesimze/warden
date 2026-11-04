import type { EngineContext, RuleCheck } from "./types.js";
import { normalizeAddress, shortenAddress } from "./text.js";

export function r2DestMismatch(ctx: EngineContext): RuleCheck {
  const base = { id: "R2", flag: "DEST_MISMATCH", severity: "HOLD" as const };

  if (!ctx.vendor) {
    return { ...base, passed: true, reason: "Vendor not matched; address check skipped (see R1)." };
  }

  const address = ctx.extracted.payment_details.address;
  if (!address) {
    return {
      ...base,
      passed: true,
      reason: "No payment address was written on the invoice; the registry address is always used.",
    };
  }

  const matches = normalizeAddress(address) === normalizeAddress(ctx.vendor.destAddress);
  if (matches) {
    return { ...base, passed: true, reason: "Payment address on the invoice matches the registry." };
  }

  return {
    ...base,
    passed: false,
    reason: `Invoice asks for payment to ${shortenAddress(address)}, but ${ctx.vendor.name}'s approved address is ${shortenAddress(ctx.vendor.destAddress)}.`,
  };
}
