#!/usr/bin/env npx tsx
// Re-checks one stored attestation record: recomputes attestation_hash from
// the raw evidence saved at extraction time and compares it to what was
// sent to propose_payment on-chain. A mismatch means the stored evidence
// was tampered with after the fact.
//
// NOTE on scope: this proves evidence integrity (nothing changed since
// capture), not full TEE attestation (checking the Intel TDX quote itself
// against Intel's root of trust). That deeper check belongs to the official
// nearai-cloud-verifier tooling (github.com/nearai/nearai-cloud-verifier) —
// wiring that in is cut per HACKATHON-NOTES.md's "if behind schedule" list
// and left as a fast-follow.
//
// Usage: npx tsx scripts/verify-attestation.ts <invoice_id> [--db <path>]

import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { computeAttestationHash, type AttestationEvidence } from "@warden/agent";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const invoiceId = process.argv[2];
  if (!invoiceId || invoiceId.startsWith("--")) {
    console.error("Usage: npx tsx scripts/verify-attestation.ts <invoice_id> [--db <path>]");
    process.exit(1);
  }
  const dbFlagIndex = process.argv.indexOf("--db");
  const dbPath = dbFlagIndex !== -1 ? process.argv[dbFlagIndex + 1]! : path.join(repoRoot, "data", "warden.sqlite");

  const db = new Database(dbPath, { readonly: true });
  const row = db.prepare("SELECT attestation_json, payment_id FROM invoices WHERE id = ?").get(invoiceId) as
    | { attestation_json: string; payment_id: number | null }
    | undefined;
  if (!row) {
    console.error(`No invoice "${invoiceId}" in ${dbPath}`);
    process.exit(1);
  }

  const stored = JSON.parse(row.attestation_json) as { model: string; chatId: string; hash: string; evidence: AttestationEvidence };
  const recomputed = computeAttestationHash(stored.evidence);

  console.log(`Invoice:        ${invoiceId}`);
  console.log(`Model:          ${stored.model}`);
  console.log(`Chat id:        ${stored.chatId}`);
  console.log(`Stored hash:    ${stored.hash}`);
  console.log(`Recomputed:     ${recomputed}`);
  console.log(`Evidence intact: ${recomputed === stored.hash ? "YES" : "NO — evidence does not match its hash"}`);

  if (recomputed !== stored.hash) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
