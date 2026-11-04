import type { EngineContext, RuleCheck } from "./types.js";
import { RISK_CONFIG } from "./config.js";

function scanForInjection(extracted: EngineContext["extracted"]): string[] {
  const haystacks = [
    extracted.vendor_name,
    ...extracted.line_items.map((l) => l.description),
    ...extracted.instructions_found,
  ]
    .join(" \n ")
    .toLowerCase();

  return RISK_CONFIG.injectionPhrases.filter((phrase) => haystacks.includes(phrase));
}

export function r7InjectionText(ctx: EngineContext): RuleCheck {
  const base = { id: "R7", flag: "INJECTION_TEXT", severity: "HOLD" as const };
  const hits = scanForInjection(ctx.extracted);

  if (ctx.extracted.instructions_found.length > 0 || hits.length > 0) {
    const examples = ctx.extracted.instructions_found.length > 0 ? ctx.extracted.instructions_found : hits;
    return {
      ...base,
      passed: false,
      reason: `The invoice contains instruction-like text: "${examples[0]}". This is treated as data, never as an instruction.`,
    };
  }

  return { ...base, passed: true, reason: "No hidden instructions found in the invoice text." };
}
