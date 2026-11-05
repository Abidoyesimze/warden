#!/usr/bin/env npx tsx
// Rebuilds the audit trail straight from the treasury contract's state —
// no backend, no database, no API key. Every field here is a view call,
// free and keyless, which is the point: anyone can run this against
// mainnet and check our claims without trusting our server.
//
// Usage: npx tsx scripts/audit.ts <contract_id> [--rpc <url>]

import { JsonRpcProvider } from "near-api-js";

interface ChainVendor {
  name: string;
  dest_chain: string;
  dest_asset: string;
  dest_address: string;
  max_amount: string;
  active: boolean;
}

interface ChainPayment {
  id: number;
  invoice_hash: string;
  vendor_id: string;
  amount: string;
  flags: string[];
  attestation_hash: string;
  status: string;
  deposit_address: string | null;
  quote_hash: string | null;
  intents_ref: string | null;
  created_at: string;
  updated_at: string;
  note: string | null;
}

function shorten(hash: string, n = 10): string {
  return hash.length <= n * 2 ? hash : `${hash.slice(0, n)}…${hash.slice(-4)}`;
}

function toDate(nanos: string): string {
  return new Date(Number(BigInt(nanos) / 1_000_000n)).toISOString();
}

async function main() {
  const contractId = process.argv[2];
  if (!contractId || contractId.startsWith("--")) {
    console.error("Usage: npx tsx scripts/audit.ts <contract_id> [--rpc <url>]");
    process.exit(1);
  }
  const rpcFlagIndex = process.argv.indexOf("--rpc");
  const rpcUrl = rpcFlagIndex !== -1 ? process.argv[rpcFlagIndex + 1] : "https://free.rpc.fastnear.com";
  const provider = new JsonRpcProvider({ url: rpcUrl! });

  const view = <T,>(method: string, args: Record<string, unknown> = {}) =>
    provider.callFunction<T>({ contractId, method, args });

  const [config, vendors, payments] = await Promise.all([
    view<unknown>("get_config"),
    view<[string, ChainVendor][]>("list_vendors"),
    view<ChainPayment[]>("list_payments", { from: 0, limit: 1000 }),
  ]);

  console.log(`Warden treasury audit — ${contractId} (${rpcUrl})\n`);
  console.log("Config:", JSON.stringify(config, null, 2), "\n");

  console.log(`Vendors (${vendors?.length ?? 0}):`);
  for (const [id, v] of vendors ?? []) {
    console.log(`  ${id.padEnd(20)} ${v.name.padEnd(28)} ${v.dest_chain}/${v.dest_asset}  ${v.active ? "active" : "inactive"}`);
  }

  console.log(`\nPayments (${payments?.length ?? 0}), newest first:`);
  console.log(
    ["id", "status", "amount", "vendor", "flags", "invoice_hash", "created_at"]
      .map((h) => h.padEnd(14))
      .join(" "),
  );
  for (const p of (payments ?? []).slice().reverse()) {
    console.log(
      [
        String(p.id).padEnd(14),
        p.status.padEnd(14),
        p.amount.padEnd(14),
        p.vendor_id.padEnd(14),
        (p.flags.join(",") || "-").padEnd(14),
        shorten(p.invoice_hash).padEnd(14),
        toDate(p.created_at),
      ].join(" "),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
