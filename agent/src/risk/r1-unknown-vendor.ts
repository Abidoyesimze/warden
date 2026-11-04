import type { EngineContext, RuleCheck } from "./types.js";

export function r1UnknownVendor(ctx: EngineContext): RuleCheck {
  if (ctx.vendor) {
    return {
      id: "R1",
      passed: true,
      flag: "UNKNOWN_VENDOR",
      severity: "HOLD",
      reason: `Matches registered vendor "${ctx.vendor.name}".`,
    };
  }
  if (ctx.lookalikeOf) {
    return {
      id: "R1",
      passed: false,
      flag: "LOOKALIKE_VENDOR",
      severity: "HOLD",
      reason: `"${ctx.extracted.vendor_name}" closely resembles the registered vendor "${ctx.lookalikeOf.name}" but is not an exact match.`,
    };
  }
  return {
    id: "R1",
    passed: false,
    flag: "UNKNOWN_VENDOR",
    severity: "HOLD",
    reason: `"${ctx.extracted.vendor_name}" is not in the approved vendor registry.`,
  };
}
