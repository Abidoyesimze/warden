import type { ExtractedInvoice } from "../extract/schema.js";
import { RISK_CONFIG } from "./config.js";
import type { VendorMatch, VendorRecord } from "./types.js";
import { editDistance, normalizeVendorName } from "./text.js";

export function matchVendor(extracted: ExtractedInvoice, registry: VendorRecord[]): VendorMatch {
  const normalized = normalizeVendorName(extracted.vendor_name);

  const exact = registry.find(
    (v) =>
      normalizeVendorName(v.name) === normalized ||
      (extracted.vendor_identifier !== null && v.id === extracted.vendor_identifier),
  );
  if (exact) return { vendor: exact, lookalikeOf: null };

  let lookalikeOf: VendorRecord | null = null;
  let best = Infinity;
  for (const v of registry) {
    const dist = editDistance(normalized, normalizeVendorName(v.name));
    if (dist <= RISK_CONFIG.lookalikeMaxEditDistance && dist < best) {
      best = dist;
      lookalikeOf = v;
    }
  }
  return { vendor: null, lookalikeOf };
}
