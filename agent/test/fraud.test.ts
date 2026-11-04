import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runRiskEngine } from "../src/risk/index.js";
import type { ExtractedInvoice } from "../src/extract/schema.js";
import type { HistoryEntry, VendorRecord } from "../src/risk/types.js";

// Fixed reference time so the fixtures (one with a future issue date, one
// with a near-duplicate 3 days earlier) are deterministic regardless of
// when this suite actually runs.
const NOW = new Date("2026-11-03T12:00:00Z");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturesDir = path.join(repoRoot, "fixtures");

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf-8")) as T;
}

const vendors = loadJson<VendorRecord[]>(path.join(fixturesDir, "vendors.json"));

const historyByVendor: Record<string, HistoryEntry[]> = {};
for (const entry of readdirSync(path.join(fixturesDir, "history"))) {
  if (!entry.endsWith(".json")) continue;
  const vendorId = entry.replace(/\.json$/, "");
  historyByVendor[vendorId] = loadJson<HistoryEntry[]>(path.join(fixturesDir, "history", entry));
}

interface Expected {
  file: string;
  decision: "PAY" | "HOLD" | "BLOCK";
  flags: string[];
  note?: string;
}

const expected = loadJson<Expected[]>(path.join(fixturesDir, "invoices", "expected.json"));

describe("fraud test suite (npm run test:fraud)", () => {
  for (const exp of expected) {
    it(`${exp.file} -> ${exp.decision} ${JSON.stringify(exp.flags)}`, () => {
      const extracted = loadJson<ExtractedInvoice>(path.join(fixturesDir, "invoices", `${exp.file}.extracted.json`));
      const result = runRiskEngine(extracted, vendors, historyByVendor, NOW);
      const actualFlags = result.flags.filter((f) => !f.passed).map((f) => f.flag);

      expect(result.decision, result.summary).toBe(exp.decision);
      expect(actualFlags.sort()).toEqual([...exp.flags].sort());
    });
  }
});
